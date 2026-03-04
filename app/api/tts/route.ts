/**
 * Text-to-Speech API Route
 * Converts Dada Bora's text responses to natural speech via ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { generateSpeech, isWithinTTSLimit, splitForTTS, DEFAULT_VOICE_ID } from '@/lib/elevenlabs';

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

    // Get ElevenLabs config from Firestore
    const configDoc = await adminDb.collection('config').doc('voice').get();
    const voiceConfig = configDoc.exists ? configDoc.data() : null;

    const apiKey = voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Voice is not configured. Add your ElevenLabs API key in Settings.' },
        { status: 503 }
      );
    }

    const voiceId = voiceConfig?.voiceId || DEFAULT_VOICE_ID;

    // Check text length
    if (!isWithinTTSLimit(text)) {
      // Split and only generate first chunk
      const chunks = splitForTTS(text);
      const audioBuffer = await generateSpeech({
        text: chunks[0],
        voiceId,
        apiKey,
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
    }

    // Generate speech
    const audioBuffer = await generateSpeech({
      text,
      voiceId,
      apiKey,
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
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
