/**
 * API Route for handling incoming WhatsApp messages via Twilio
 * This creates new chats with anonymous usernames and stores messages
 * Then calls AI to generate a response and sends it back via WhatsApp
 * 
 * ENHANCED: Now includes Dada Bora personality, crisis detection, user profiling,
 * and contextual product recommendations
 * 
 * SECURITY: This endpoint validates Twilio signatures and has rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { applyRateLimit } from '@/lib/auth-middleware';
import { generateAnonymousName, generateChatId, validateMessage, sanitizeMessage, hashPhoneNumber } from '@/lib/chat-utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

// Import Dada Bora systems
import { detectCrisis, getDadaCrisisResponse, getCrisisResources } from '@/lib/crisis-detection';
import { createCrisisAlert } from '@/lib/alert-system';
import { 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile, 
  incrementTrustScore, 
  updateRelationshipStage,
  generateProfileContext,
  extractPotentialFacts,
  addUserMemory
} from '@/lib/user-profile';
import { 
  generateFullSystemPrompt, 
  generateGreeting,
  calibrateResponseLength,
  DADA_BORA_CORE_IDENTITY 
} from '@/lib/dada-personality';
import { 
  getProductContext, 
  isAppropriateForRecommendation 
} from '@/lib/product-recommendations';
import { generateSpeech, DEFAULT_VOICE_ID } from '@/lib/elevenlabs';
import {
  getOrCreateProfileByPhoneHash,
  generateOptimizedContext,
  extractFactsFromMessage,
  getRelevantKnowledge,
  trackTokenUsage,
  getProgressiveQuestion,
  PROGRESSIVE_QUESTIONS,
} from '@/lib/progressive-profile';

// Mark route as dynamic (required for API routes with POST/GET handlers)
export const dynamic = 'force-dynamic';

// Validate Twilio signature for security - THIS IS CRITICAL
async function validateTwilioSignature(request: NextRequest, body: string): Promise<boolean> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();
    
    if (!config?.authToken) {
      console.error('SECURITY WARNING: No Twilio auth token configured - rejecting request');
      return false; // REJECT if not configured - don't allow unauthenticated requests
    }

    const signature = request.headers.get('x-twilio-signature') || '';
    
    if (!signature) {
      console.error('SECURITY WARNING: No Twilio signature in request');
      return false;
    }
    
    // Reconstruct the original URL that Twilio used to sign the request
    // This is necessary because proxies (Cloudflare, Vercel) change the URL
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const pathname = new URL(request.url).pathname;
    
    // Use the forwarded URL if available, otherwise fall back to request.url
    const url = forwardedHost 
      ? `${forwardedProto}://${forwardedHost}${pathname}`
      : request.url;
    
    console.log('Validating Twilio signature with URL:', url);
    
    // Parse form data for validation
    const params = Object.fromEntries(new URLSearchParams(body));
    
    const isValid = twilio.validateRequest(config.authToken, signature, url, params);
    
    if (!isValid) {
      console.error('SECURITY WARNING: Invalid Twilio signature - possible spoofed request');
      console.error('Debug info:', { 
        signatureReceived: signature.substring(0, 10) + '...', 
        url,
        hasAuthToken: !!config.authToken,
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

// Helper function to fetch knowledge base content - NOW OPTIMIZED
// Only fetches articles relevant to the user's message
async function getKnowledgeBaseContent(userMessage: string): Promise<string> {
  try {
    // Use the optimized knowledge retrieval that only gets relevant articles
    // This saves 500-1000 tokens per request!
    const relevantKnowledge = await getRelevantKnowledge(userMessage, 2);
    return relevantKnowledge;
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return '';
  }
}

// Get AI response from configured provider - ENHANCED with Dada Bora personality
// TOKEN OPTIMIZED: Only includes relevant context
async function getAIResponse(
  userMessage: string, 
  chatHistory: Array<{role: string, content: string}> = [],
  chatId?: string,
  isCrisis?: boolean,
  crisisContext?: string,
  optimizedProfileContext?: string,
  responseCalibration?: { maxTokens: number; lengthHint: string }
): Promise<{ response: string; tokensUsed: number }> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config || !config.enabled) {
      console.log('AI chatbot is not enabled');
      return { response: '', tokensUsed: 0 };
    }

    const { provider, openaiApiKey, anthropicApiKey, model, temperature, maxTokens } = config;

    // Fetch ONLY relevant knowledge base content (TOKEN OPTIMIZATION)
    const knowledgeBaseContent = await getKnowledgeBaseContent(userMessage);
    
    // Use pre-computed optimized profile context (already token-optimized)
    const profileContext = optimizedProfileContext || '';
    
    // Get user profile for product recommendations only
    let productContext = '';
    let userProfile = null;
    
    if (chatId && !isCrisis) {
      userProfile = await getUserProfile(chatId);
      if (userProfile) {
        const recommendationCheck = isAppropriateForRecommendation(
          userProfile, 
          userMessage,
          userProfile.currentMood
        );
        if (recommendationCheck.appropriate) {
          productContext = await getProductContext(userProfile);
        }
      }
    }

    // Generate the full Dada Bora system prompt with all context
    const enhancedSystemPrompt = generateFullSystemPrompt(
      userProfile,
      profileContext,
      knowledgeBaseContent,
      productContext,
      crisisContext || '',
      responseCalibration?.lengthHint
    );

    // Use calibrated max_tokens (capped by config), fallback to config value
    const calibratedMaxTokens = responseCalibration
      ? Math.min(responseCalibration.maxTokens, maxTokens || 1000)
      : (maxTokens || 500);

    // Helper: call OpenAI
    const callOpenAI = async (useModel: string): Promise<{ response: string; tokensUsed: number } | null> => {
      if (!openaiApiKey) return null;
      const messages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage }
      ];
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          messages,
          temperature: isCrisis ? 0.5 : (temperature || 0.7),
          max_tokens: calibratedMaxTokens,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('OpenAI API Error:', data);
        return null;
      }
      return { response: data.choices?.[0]?.message?.content || '', tokensUsed: data.usage?.total_tokens || 0 };
    };

    // Helper: call Anthropic
    const callAnthropic = async (useModel: string): Promise<{ response: string; tokensUsed: number } | null> => {
      if (!anthropicApiKey) return null;
      const messages = [
        ...chatHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userMessage }
      ];
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          max_tokens: calibratedMaxTokens,
          system: enhancedSystemPrompt,
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Anthropic API Error:', data);
        return null;
      }
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      return { response: data.content?.[0]?.text || '', tokensUsed };
    };

    // Try primary provider, then fallback to the other
    if (provider === 'openai') {
      const result = await callOpenAI(model || 'gpt-4o');
      if (result && result.response) return result;
      if (anthropicApiKey) {
        console.warn('⚠️ OpenAI failed, falling back to Anthropic');
        const fallback = await callAnthropic('claude-sonnet-4-20250514');
        if (fallback && fallback.response) return fallback;
      }
    } else if (provider === 'anthropic') {
      const result = await callAnthropic(model || 'claude-sonnet-4-20250514');
      if (result && result.response) return result;
      if (openaiApiKey) {
        console.warn('⚠️ Anthropic failed, falling back to OpenAI');
        const fallback = await callOpenAI('gpt-4o');
        if (fallback && fallback.response) return fallback;
      }
    }

    return { response: '', tokensUsed: 0 };
  } catch (error) {
    console.error('Error getting AI response:', error);
    return { response: '', tokensUsed: 0 };
  }
}

// Transcribe voice message using OpenAI Whisper
async function transcribeVoiceMessage(mediaUrl: string, twilioAccountSid: string, twilioAuthToken: string): Promise<string | null> {
  try {
    // Download the audio from Twilio (requires auth)
    const audioResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
      },
    });

    if (!audioResponse.ok) {
      console.error('Failed to download voice message:', audioResponse.status);
      return null;
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });

    // Get OpenAI key from config
    const chatbotConfig = await adminDb.collection('integrations').doc('chatbot').get();
    const config = chatbotConfig.data();
    const openaiKey = config?.openaiApiKey;

    if (!openaiKey) {
      console.error('No OpenAI key configured for voice transcription');
      return null;
    }

    // Send to Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      console.error('Whisper transcription failed:', whisperResponse.status);
      return null;
    }

    const result = await whisperResponse.json();
    console.log(`🎤 Voice transcribed: "${result.text}"`);
    return result.text;
  } catch (error) {
    console.error('Voice transcription error:', error);
    return null;
  }
}

// Send a voice note response via WhatsApp
async function sendWhatsAppVoiceNote(
  to: string, 
  text: string, 
  textFallback: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get voice config
    const voiceConfigDoc = await adminDb.collection('config').doc('voice').get();
    const voiceConfig = voiceConfigDoc.exists ? voiceConfigDoc.data() : null;

    if (!voiceConfig?.enabled || !voiceConfig?.elevenLabsApiKey) {
      // Voice not configured, send text instead
      return sendWhatsAppMessage(to, textFallback);
    }

    // Generate speech audio
    const audioBuffer = await generateSpeech({
      text,
      voiceId: voiceConfig.voiceId || DEFAULT_VOICE_ID,
      apiKey: voiceConfig.elevenLabsApiKey,
      stability: voiceConfig.stability ?? 0.5,
      similarityBoost: voiceConfig.similarityBoost ?? 0.75,
      style: voiceConfig.style ?? 0.3,
    });

    // Upload audio to a temporary storage and get a URL
    // For Twilio, we need a publicly accessible URL for media
    // We'll use Twilio's own approach: send as base64 in a media message
    // Actually, Twilio requires a URL. We'll host it temporarily.
    
    // For now, send the text response along with a note about voice
    // Full voice note sending requires a media hosting solution
    console.log('🔊 Voice note generated, sending text response (media hosting needed for voice notes)');
    return sendWhatsAppMessage(to, textFallback);
  } catch (error: any) {
    console.error('Voice note error:', error);
    return sendWhatsAppMessage(to, textFallback);
  }
}

// Split long messages into chunks for WhatsApp's 1600 character limit
function splitMessage(message: string, maxLength: number = 1500): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  let remaining = message;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (end of sentence, paragraph, or word)
    let breakPoint = maxLength;
    
    // Try to break at paragraph
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
    if (paragraphBreak > maxLength * 0.5) {
      breakPoint = paragraphBreak + 2;
    } else {
      // Try to break at sentence
      const sentenceBreak = Math.max(
        remaining.lastIndexOf('. ', maxLength),
        remaining.lastIndexOf('! ', maxLength),
        remaining.lastIndexOf('? ', maxLength)
      );
      if (sentenceBreak > maxLength * 0.5) {
        breakPoint = sentenceBreak + 2;
      } else {
        // Try to break at word
        const wordBreak = remaining.lastIndexOf(' ', maxLength);
        if (wordBreak > maxLength * 0.5) {
          breakPoint = wordBreak + 1;
        }
      }
    }

    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }

  return chunks;
}

// Send WhatsApp message via Twilio (handles long messages by splitting)
async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();

    if (!config?.accountSid || !config?.authToken || !config?.twilioWhatsAppNumber) {
      return { success: false, error: 'Twilio not configured' };
    }

    const client = twilio(config.accountSid, config.authToken);

    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = config.twilioWhatsAppNumber.startsWith('whatsapp:') 
      ? config.twilioWhatsAppNumber 
      : `whatsapp:${config.twilioWhatsAppNumber}`;

    // Split message if it exceeds WhatsApp's 1600 character limit
    const messageChunks = splitMessage(message, 1500);
    let lastMessageSid = '';

    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i];
      
      // Add part indicator for multi-part messages
      const bodyText = messageChunks.length > 1 
        ? `${chunk}\n\n(${i + 1}/${messageChunks.length})`
        : chunk;

      const twilioMessage = await client.messages.create({
        body: bodyText,
        from: formattedFrom,
        to: formattedTo,
      });

      lastMessageSid = twilioMessage.sid;
      console.log(`✅ Message part ${i + 1}/${messageChunks.length} sent! SID: ${twilioMessage.sid}`);

      // Small delay between messages to maintain order
      if (i < messageChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { success: true, messageSid: lastMessageSid };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to log webhook activity for debugging
async function logWebhookActivity(data: {
  type: string;
  status: 'success' | 'error';
  from?: string;
  error?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await adminDb.collection('webhookLogs').add({
      ...data,
      timestamp: Timestamp.now(),
    });
  } catch (err) {
    console.error('Failed to log webhook activity:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply aggressive rate limiting per IP (100 requests per minute - Twilio might send bursts)
    const rateLimitResult = applyRateLimit(request, 100, 60000);
    if (!rateLimitResult.allowed) {
      console.error('SECURITY: Rate limit exceeded for WhatsApp webhook');
      await logWebhookActivity({
        type: 'rate_limit',
        status: 'error',
        error: 'Rate limit exceeded',
      });
      return rateLimitResult.response;
    }

    // Check if integration is enabled
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();
    
    if (!config?.enabled) {
      await logWebhookActivity({
        type: 'disabled',
        status: 'error',
        error: 'WhatsApp integration is disabled',
      });
      return NextResponse.json(
        { error: 'WhatsApp integration is disabled' },
        { status: 403 }
      );
    }

    // Twilio sends data as application/x-www-form-urlencoded
    const formData = await request.text();
    const body = Object.fromEntries(new URLSearchParams(formData));
    
    // Log the incoming payload for debugging (remove sensitive data in production)
    console.log('Twilio WhatsApp webhook received message');

    // ALWAYS validate Twilio signature in production for security
    const isValid = await validateTwilioSignature(request, formData);
    if (!isValid) {
      console.error('SECURITY: Invalid Twilio signature - rejecting request');
      await logWebhookActivity({
        type: 'signature_invalid',
        status: 'error',
        from: body.From?.replace('whatsapp:', '').substring(0, 10) + '...',
        error: 'Invalid Twilio signature',
        details: {
          hasSignature: !!request.headers.get('x-twilio-signature'),
          url: request.url,
        },
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Handle Twilio WhatsApp webhook format
    // Twilio sends: From, To, Body, MessageSid, etc.
    const phoneNumber = body.From?.replace('whatsapp:', '') || '';
    let message = body.Body || '';
    const messageSid = body.MessageSid || '';
    const mediaUrl = body.MediaUrl0 || ''; // First media attachment if any
    const numMedia = parseInt(body.NumMedia || '0', 10);
    const mediaContentType = body.MediaContentType0 || '';
    let isVoiceMessage = false;
    
    // Handle voice messages - transcribe audio to text
    if (numMedia > 0 && mediaContentType.startsWith('audio/') && !message) {
      console.log(`🎤 Voice message detected (${mediaContentType}), transcribing...`);
      isVoiceMessage = true;
      
      // Get Twilio credentials for downloading media
      const whatsappDoc = await adminDb.collection('integrations').doc('whatsapp').get();
      const waConfig = whatsappDoc.data();
      
      if (waConfig?.accountSid && waConfig?.authToken) {
        const transcription = await transcribeVoiceMessage(
          mediaUrl, 
          waConfig.accountSid, 
          waConfig.authToken
        );
        
        if (transcription) {
          message = transcription;
          console.log(`🎤 Voice transcription: "${message}"`);
        } else {
          // Couldn't transcribe, send a friendly response
          await sendWhatsAppMessage(phoneNumber, 
            "Hey! I got your voice message but had trouble hearing it clearly. Could you try sending it again, or type out what you wanted to say? 💛"
          );
          return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
          );
        }
      }
    }
    
    if (!phoneNumber || !message) {
      console.log('Missing phone number or message content');
      // Return TwiML empty response
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          status: 200,
          headers: { 'Content-Type': 'text/xml' }
        }
      );
    }

    console.log(`Received message from ${phoneNumber}: ${message} (SID: ${messageSid})`);

    // Process the message
    const isFromUser = true;

    if (!validateMessage(message)) {
      console.log('Invalid message content:', message);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          status: 200,
          headers: { 'Content-Type': 'text/xml' }
        }
      );
    }

    const sanitizedMessage = sanitizeMessage(message);

    // Create a hash of the phone number to use as consistent chat ID
    // This ensures the same phone number always maps to the same chat
    const chatId = generateChatId();
    
    // Check if chat exists for this phone number
    const chatsRef = adminDb.collection('chats');
    const existingChats = await chatsRef
      .where('phoneNumberHash', '==', hashPhoneNumber(phoneNumber))
      .limit(1)
      .get();

    let chatDocId: string;
    let anonymousName: string;

    if (!existingChats.empty) {
      // Use existing chat
      const existingChat = existingChats.docs[0];
      chatDocId = existingChat.id;
      anonymousName = existingChat.data().anonymousName;

      // Update last message info
      await chatsRef.doc(chatDocId).update({
        lastMessage: sanitizedMessage,
        lastMessageTime: Timestamp.now(),
        unreadCount: FieldValue.increment(isFromUser ? 1 : 0),
      });
    } else {
      // Create new chat with anonymous name
      chatDocId = chatId;
      anonymousName = generateAnonymousName();

      await chatsRef.doc(chatDocId).set({
        anonymousName,
        phoneNumberHash: hashPhoneNumber(phoneNumber), // Store hash, NOT the actual number
        lastMessage: sanitizedMessage,
        lastMessageTime: Timestamp.now(),
        unreadCount: isFromUser ? 1 : 0,
        createdAt: Timestamp.now(),
        source: 'twilio-whatsapp', // Track message source
      });
    }

    // Add user message to subcollection
    const messagesRef = chatsRef.doc(chatDocId).collection('messages');
    await messagesRef.add({
      content: sanitizedMessage,
      timestamp: Timestamp.now(),
      isFromUser,
      messageSid, // Store Twilio message SID for reference
      mediaUrl: mediaUrl || null,
      numMedia,
      ...(isVoiceMessage && { isVoiceMessage: true, originalMediaType: mediaContentType }),
    });

    console.log(`Message stored successfully for chat ${chatDocId}`);
    
    // Log successful message receipt
    await logWebhookActivity({
      type: 'message_received',
      status: 'success',
      from: phoneNumber.substring(0, 10) + '...',
      details: {
        chatId: chatDocId,
        anonymousName,
        hasMedia: numMedia > 0,
      },
    });

    // Get recent chat history for context (last 10 messages = ~5 full exchanges)
    const recentMessages = await messagesRef
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const chatHistory: Array<{role: string, content: string}> = [];
    recentMessages.docs.reverse().forEach(doc => {
      const msg = doc.data();
      // Don't include the message we just added
      if (msg.messageSid !== messageSid) {
        chatHistory.push({
          role: msg.isFromUser ? 'user' : 'assistant',
          content: msg.content
        });
      }
    });

    // ==========================================
    // DADA BORA ENHANCED PROCESSING (TOKEN OPTIMIZED)
    // ==========================================

    // 1. CRISIS DETECTION - Check for dangerous content FIRST
    let isCrisis = false;
    let crisisContext = '';
    const crisisAlert = detectCrisis(sanitizedMessage);
    
    if (crisisAlert) {
      isCrisis = true;
      console.log(`🚨 CRISIS DETECTED: ${crisisAlert.severity} - ${crisisAlert.type}`);
      
      // Create alert and notify admins/agents
      try {
        await createCrisisAlert(crisisAlert, chatDocId, anonymousName, sanitizedMessage);
        console.log('Crisis alert created and notifications sent');
      } catch (alertError) {
        console.error('Failed to create crisis alert:', alertError);
      }
      
      // Set crisis context for AI response
      crisisContext = `
⚠️ CRISIS DETECTED - ${crisisAlert.severity.toUpperCase()}
Type: ${crisisAlert.type}
Triggers found: ${crisisAlert.triggers.join(', ')}

PRIORITY: This user may be in distress. Human support has been alerted.
Your role: Provide immediate emotional support, stay calm, show you care.
DO NOT: Minimize feelings, give clinical responses, or rush to solutions.
DO: Listen, validate, express genuine concern, and gently encourage professional help.
`;
    }

    // 2. USER PROFILE MANAGEMENT - Progressive & Token-Optimized
    // Profile is linked to phone number hash - same phone = same profile forever
    // Location is AUTO-DETECTED from phone country code!
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { profile: userProfile, isNew, locationInfo } = await getOrCreateProfileByPhoneHash(
      phoneHash,
      chatDocId,
      anonymousName,
      phoneNumber // Pass actual number for location detection
    );
    
    if (isNew) {
      const locationStr = locationInfo 
        ? ` from ${locationInfo.countryName} (${locationInfo.region})`
        : '';
      console.log(`📱 New user profile created for ${anonymousName}${locationStr}`);
    } else {
      // Returning user - increment trust and update interaction
      await incrementTrustScore(chatDocId, 1);
      await updateRelationshipStage(chatDocId);
    }

    // 2.5 EXTRACT FACTS BEFORE AI CALL — so profile is current for context generation
    const extractedFacts = extractFactsFromMessage(sanitizedMessage);
    if (Object.keys(extractedFacts).length > 0) {
      console.log(`📝 Learned about user:`, extractedFacts);
      await updateUserProfile(chatDocId, extractedFacts);
      // Merge into local profile so generateOptimizedContext sees it immediately
      Object.assign(userProfile, extractedFacts);
    }

    // 3. GENERATE TOKEN-OPTIMIZED CONTEXT
    // Only includes what's RELEVANT to this message (saves 200-500 tokens!)
    const { context: optimizedContext, tokenEstimate } = generateOptimizedContext(
      userProfile,
      sanitizedMessage,
      isCrisis
    );
    console.log(`📊 Optimized context: ~${tokenEstimate} tokens (vs ~500 if full)`);

    // Check if Dada should ask a progressive question to learn more
    const progressiveQuestion = getProgressiveQuestion(userProfile);
    if (progressiveQuestion && !isCrisis) {
      console.log(`💜 Will naturally ask: "${progressiveQuestion.substring(0, 50)}..."`);
    }

    // Update user profile with current message context
    await updateUserProfile(chatDocId, {
      totalMessages: FieldValue.increment(1) as unknown as number,
      recentTopics: [...(userProfile?.recentTopics || []).slice(-4), crisisAlert?.type || 'general'],
      currentMood: isCrisis ? 'distressed' : undefined,
      hasCrisisHistory: userProfile?.hasCrisisHistory || isCrisis,
      requiresCarefulHandling: userProfile?.requiresCarefulHandling || (crisisAlert?.severity === 'critical'),
    });

    // 4. GET AI RESPONSE with Dada Bora personality (TOKEN OPTIMIZED)
    const responseCalibration = calibrateResponseLength(sanitizedMessage, isCrisis, chatHistory.length);
    console.log(`📏 Response calibration: intent=${responseCalibration.intent}, maxTokens=${responseCalibration.maxTokens}`);
    console.log('Calling Dada Bora AI service...');
    const { response: aiResponse, tokensUsed } = await getAIResponse(
      sanitizedMessage, 
      chatHistory, 
      chatDocId,
      isCrisis,
      crisisContext,
      optimizedContext,
      responseCalibration
    );
    
    // Track token usage for cost monitoring
    if (tokensUsed > 0) {
      await trackTokenUsage(chatDocId, tokensUsed);
      console.log(`📊 Tokens used: ${tokensUsed}`);
    }

    if (aiResponse) {
      console.log(`Dada Bora response generated: ${aiResponse.substring(0, 100)}...`);

      // Build final response
      let finalResponse = aiResponse;
      
      // For critical crisis, append crisis resources
      if (crisisAlert?.severity === 'critical') {
        const resources = getCrisisResources();
        finalResponse = `${aiResponse}\n\n${resources}`;
      }
      
      // Add progressive question if appropriate (helps build relationship)
      // Only add if not in crisis and the AI response doesn't already ask a question
      if (progressiveQuestion && !isCrisis && !aiResponse.includes('?')) {
        finalResponse = `${finalResponse}\n\n${progressiveQuestion}`;
        // Mark that we asked this question
        await updateUserProfile(chatDocId, {
          recentQuestions: [...(userProfile?.recentQuestions || []).slice(-3), Object.keys(PROGRESSIVE_QUESTIONS).find(k => PROGRESSIVE_QUESTIONS[k as keyof typeof PROGRESSIVE_QUESTIONS]?.question === progressiveQuestion) || 'unknown'],
        } as any);
      }

      // Send AI response via WhatsApp
      const sendResult = await sendWhatsAppMessage(phoneNumber, finalResponse);

      if (sendResult.success) {
        // Store AI response in chat
        await messagesRef.add({
          content: finalResponse,
          timestamp: Timestamp.now(),
          isFromUser: false,
          messageSid: sendResult.messageSid,
          wasCrisisResponse: isCrisis,
          tokensUsed, // Track for analytics
        });

        // Update chat with AI response as last message
        await chatsRef.doc(chatDocId).update({
          lastMessage: finalResponse,
          lastMessageTime: Timestamp.now(),
        });

        console.log(`💜 Dada Bora response stored and sent successfully`);
      } else {
        console.error(`Failed to send response: ${sendResult.error}`);
      }
    } else {
      console.log('No AI response generated (AI might be disabled)');
    }

    // Return TwiML empty response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    );

  } catch (error) {
    console.error('Error processing Twilio WhatsApp message:', error);
    // Log the error
    await logWebhookActivity({
      type: 'processing_error',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    // Return TwiML error response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200, // Twilio expects 200 even on errors
        headers: { 'Content-Type': 'text/xml' }
      }
    );
  }
}

// GET endpoint for health check (Twilio doesn't need webhook verification like Meta)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    provider: 'twilio',
    message: 'Twilio WhatsApp webhook endpoint is active (Dada Bora Enhanced)'
  });
}
