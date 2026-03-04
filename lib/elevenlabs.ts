/**
 * ElevenLabs Text-to-Speech Integration
 * Provides natural voice for Dada Bora
 */

// Voice options suitable for Dada Bora (warm, female voices)
export const DADA_VOICE_OPTIONS = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, gentle, and nurturing' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, clear, and expressive' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Friendly and conversational' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm and soothing' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', description: 'Rich and expressive' },
] as const;

export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm and nurturing

interface TTSOptions {
  text: string;
  voiceId?: string;
  apiKey: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

/**
 * Generate speech audio from text using ElevenLabs
 * Returns audio as ArrayBuffer (mp3)
 */
export async function generateSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    apiKey,
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.3,
  } = options;

  // Clean text for TTS - remove emojis and special chars that sound weird spoken
  const cleanedText = cleanTextForSpeech(text);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanedText,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }

  return response.arrayBuffer();
}

/**
 * Generate speech and return as base64 string (for JSON responses)
 */
export async function generateSpeechBase64(options: TTSOptions): Promise<string> {
  const audioBuffer = await generateSpeech(options);
  const uint8Array = new Uint8Array(audioBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Clean text for natural speech
 * Removes emojis, markdown, and other elements that don't sound good spoken
 */
function cleanTextForSpeech(text: string): string {
  return text
    // Remove emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`([^`]*)`/g, '$1')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Clean up multiple spaces and newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Estimate the cost of a TTS request (ElevenLabs charges per character)
 * ~$0.30 per 1,000 characters on Creator plan
 */
export function estimateTTSCost(text: string): number {
  const cleaned = cleanTextForSpeech(text);
  return (cleaned.length / 1000) * 0.30;
}

/**
 * Check if text is short enough for TTS (ElevenLabs limit is 5000 chars)
 */
export function isWithinTTSLimit(text: string): boolean {
  const cleaned = cleanTextForSpeech(text);
  return cleaned.length <= 5000;
}

/**
 * Split long text into TTS-friendly chunks
 */
export function splitForTTS(text: string, maxChars: number = 4500): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
}
