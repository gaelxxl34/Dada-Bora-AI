/**
 * Text-to-Speech API Route
 * Supports OpenAI TTS and ElevenLabs providers
 * Falls back to browser TTS when both are unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { 
  generateSpeech, 
  generateSpeechOpenAI, 
  isWithinTTSLimit, 
  splitForTTS, 
  DEFAULT_VOICE_ID, 
  DEFAULT_OPENAI_VOICE,
  type TTSProvider 
} from '@/lib/elevenlabs';

// In-memory cache: skip provider calls for 1 hour after quota exceeded
let elevenLabsQuotaExceededUntil = 0;
let openaiTTSQuotaExceededUntil = 0;

// GET: Check if TTS is available (used by client to decide whether to show voice UI)
export async function GET() {
  try {
    const voiceDoc = await adminDb.collection('config').doc('voice').get();
    const voiceConfig = voiceDoc.exists ? voiceDoc.data() : null;
    const ttsProvider: TTSProvider = voiceConfig?.ttsProvider || 'openai';

    if (ttsProvider === 'openai') {
      if (Date.now() < openaiTTSQuotaExceededUntil) {
        return NextResponse.json({ available: false, fallbackToBrowser: true, reason: 'quota_exceeded', provider: 'openai' });
      }
      const chatbotDoc = await adminDb.collection('integrations').doc('chatbot').get();
      const chatbotConfig = chatbotDoc.exists ? chatbotDoc.data() : null;
      const hasKey = !!chatbotConfig?.openaiApiKey;
      return NextResponse.json({ available: hasKey, fallbackToBrowser: !hasKey, provider: 'openai' });
    }

    // ElevenLabs
    if (Date.now() < elevenLabsQuotaExceededUntil) {
      return NextResponse.json({ available: false, fallbackToBrowser: true, reason: 'quota_exceeded', provider: 'elevenlabs' });
    }
    const hasKey = !!(voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY);
    return NextResponse.json({ available: hasKey, fallbackToBrowser: !hasKey, provider: 'elevenlabs' });
  } catch {
    return NextResponse.json({ available: false, fallbackToBrowser: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, sessionId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Validate session if provided (for web chat)
    if (sessionId) {
      const sessionDoc = await adminDb.collection('webSessions').doc(sessionId).get();
      if (!sessionDoc.exists) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      }
    }

    // Get voice config from Firestore
    const configDoc = await adminDb.collection('config').doc('voice').get();
    const voiceConfig = configDoc.exists ? configDoc.data() : null;
    const ttsProvider: TTSProvider = voiceConfig?.ttsProvider || 'openai';

    // ─── OpenAI TTS Path ──────────────────────────────────────────
    if (ttsProvider === 'openai') {
      // Short-circuit if OpenAI quota is cached as exceeded
      if (Date.now() < openaiTTSQuotaExceededUntil) {
        return NextResponse.json(
          { error: 'OpenAI quota exceeded', fallbackToBrowser: true, reason: 'quota_exceeded' },
          { status: 503 }
        );
      }

      const chatbotDoc = await adminDb.collection('integrations').doc('chatbot').get();
      const chatbotConfig = chatbotDoc.exists ? chatbotDoc.data() : null;
      const openaiApiKey = chatbotConfig?.openaiApiKey;

      if (!openaiApiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured. Go to AI Chatbot settings to add it.', fallbackToBrowser: true },
          { status: 503 }
        );
      }

      const openaiVoice = voiceConfig?.openaiVoice || DEFAULT_OPENAI_VOICE;
      const openaiModel = voiceConfig?.openaiTTSModel || 'tts-1';
      const openaiSpeed = voiceConfig?.openaiSpeed ?? 1.0;

      const audioBuffer = await generateSpeechOpenAI({
        text,
        apiKey: openaiApiKey,
        voice: openaiVoice,
        model: openaiModel,
        speed: openaiSpeed,
      });

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache',
        },
      });
    }

    // ─── ElevenLabs TTS Path ──────────────────────────────────────
    if (Date.now() < elevenLabsQuotaExceededUntil) {
      return NextResponse.json(
        { error: 'ElevenLabs quota exceeded', fallbackToBrowser: true, reason: 'quota_exceeded' },
        { status: 503 }
      );
    }

    const elevenLabsKey = voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured.', fallbackToBrowser: true },
        { status: 503 }
      );
    }

    const voiceId = voiceConfig?.voiceId || DEFAULT_VOICE_ID;
    const textToSpeak = !isWithinTTSLimit(text) ? splitForTTS(text)[0] : text;

    const audioBuffer = await generateSpeech({
      text: textToSpeak,
      voiceId,
      apiKey: elevenLabsKey,
      stability: voiceConfig?.stability ?? 0.5,
      similarityBoost: voiceConfig?.similarityBoost ?? 0.75,
      style: voiceConfig?.style ?? 0.3,
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isOpenAIQuota = errorMessage.includes('insufficient_quota') || (errorMessage.includes('OpenAI') && errorMessage.includes('429'));
    const isElevenLabsQuota = errorMessage.includes('quota_exceeded') || (errorMessage.includes('ElevenLabs') && errorMessage.includes('401'));
    const isQuotaExceeded = isOpenAIQuota || isElevenLabsQuota;
    
    if (isOpenAIQuota) {
      openaiTTSQuotaExceededUntil = Date.now() + 60 * 60 * 1000;
      console.info('OpenAI TTS quota exceeded — skipping calls for 1 hour, browser TTS fallback active');
    }
    if (isElevenLabsQuota) {
      elevenLabsQuotaExceededUntil = Date.now() + 60 * 60 * 1000;
      console.info('ElevenLabs quota exceeded — skipping calls for 1 hour, browser TTS fallback active');
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate speech',
        fallbackToBrowser: true,
        reason: isQuotaExceeded ? 'quota_exceeded' : 'unknown',
      },
      { status: isQuotaExceeded ? 503 : 500 }
    );
  }
}
