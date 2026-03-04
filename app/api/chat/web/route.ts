/**
 * API Route for Web Chat Messages
 * Handles sending and receiving messages from the web chat interface
 * Uses the same Dada Bora AI system as WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { validateSession, extendSession } from '@/lib/otp-verification';
import { applyRateLimit } from '@/lib/auth-middleware';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { validateMessage, sanitizeMessage } from '@/lib/chat-utils';

// Import Dada Bora systems
import { detectCrisis, getCrisisResources } from '@/lib/crisis-detection';
import { createCrisisAlert } from '@/lib/alert-system';
import { 
  getUserProfile, 
  updateUserProfile, 
  incrementTrustScore, 
  updateRelationshipStage,
} from '@/lib/user-profile';
import { 
  getOrCreateProfileByPhoneHash,
  generateOptimizedContext,
  extractFactsFromMessage,
  getRelevantKnowledge,
  trackTokenUsage,
  getProgressiveQuestion,
} from '@/lib/progressive-profile';
import { 
  generateFullSystemPrompt, 
} from '@/lib/dada-personality';
import { 
  getProductContext, 
  isAppropriateForRecommendation 
} from '@/lib/product-recommendations';

export const dynamic = 'force-dynamic';

// Message source type
export type MessageSource = 'whatsapp' | 'web' | 'mobile-app';

/**
 * Get AI response (shared logic with WhatsApp webhook)
 */
async function getAIResponse(
  userMessage: string, 
  chatHistory: Array<{role: string, content: string}> = [],
  chatId: string,
  isCrisis: boolean,
  crisisContext: string,
  optimizedProfileContext: string
): Promise<{ response: string; tokensUsed: number }> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config || !config.enabled) {
      return { response: '', tokensUsed: 0 };
    }

    const { provider, openaiApiKey, anthropicApiKey, model, temperature, maxTokens } = config;

    // Fetch relevant knowledge
    const knowledgeBaseContent = await getRelevantKnowledge(userMessage, 2);
    
    // Get user profile for product recommendations
    let productContext = '';
    const userProfile = await getUserProfile(chatId);
    
    if (userProfile && !isCrisis) {
      const recommendationCheck = isAppropriateForRecommendation(
        userProfile, 
        userMessage,
        userProfile.currentMood
      );
      if (recommendationCheck.appropriate) {
        productContext = await getProductContext(userProfile);
      }
    }

    // Generate system prompt
    const enhancedSystemPrompt = generateFullSystemPrompt(
      userProfile,
      optimizedProfileContext,
      knowledgeBaseContent,
      productContext,
      crisisContext
    );

    if (provider === 'openai' && openaiApiKey) {
      const messages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4-turbo-preview',
          messages,
          temperature: isCrisis ? 0.5 : (temperature || 0.7),
          max_tokens: maxTokens || 500,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenAI API Error:', data);
        return { response: '', tokensUsed: 0 };
      }
      
      const tokensUsed = data.usage?.total_tokens || 0;
      return { response: data.choices?.[0]?.message?.content || '', tokensUsed };

    } else if (provider === 'anthropic' && anthropicApiKey) {
      const messages = [
        ...chatHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userMessage }
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-opus-20240229',
          max_tokens: maxTokens || 500,
          system: enhancedSystemPrompt,
          messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Anthropic API Error:', data);
        return { response: '', tokensUsed: 0 };
      }
      
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      return { response: data.content?.[0]?.text || '', tokensUsed };
    }

    return { response: '', tokensUsed: 0 };
  } catch (error) {
    console.error('Error getting AI response:', error);
    return { response: '', tokensUsed: 0 };
  }
}

/**
 * POST /api/chat/web
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 messages per minute
    const rateLimitResult = applyRateLimit(request, 30, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { sessionId, message } = body;

    // Validate session
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session required. Please verify your phone number.' },
        { status: 401 }
      );
    }

    const sessionResult = await validateSession(sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Invalid session' },
        { status: 401 }
      );
    }

    const session = sessionResult.session!;
    const chatId = session.chatId;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!validateMessage(message)) {
      return NextResponse.json(
        { error: 'Invalid message content' },
        { status: 400 }
      );
    }

    const sanitizedMessage = sanitizeMessage(message);

    // Get chat document
    const chatRef = adminDb.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    
    if (!chatDoc.exists) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    const chatData = chatDoc.data()!;
    const anonymousName = chatData.anonymousName;
    const messagesRef = chatRef.collection('messages');

    // Store user message
    const userMessageRef = await messagesRef.add({
      content: sanitizedMessage,
      timestamp: Timestamp.now(),
      isFromUser: true,
      source: 'web' as MessageSource,
    });

    // Update chat
    await chatRef.update({
      lastMessage: sanitizedMessage,
      lastMessageTime: Timestamp.now(),
      // Add 'web' to sources if not already there
      sources: FieldValue.arrayUnion('web'),
    });

    // Get recent chat history (10 messages = ~5 full exchanges)
    const recentMessages = await messagesRef
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const chatHistory: Array<{role: string, content: string}> = [];
    recentMessages.docs.reverse().forEach(doc => {
      const msg = doc.data();
      if (doc.id !== userMessageRef.id) {
        chatHistory.push({
          role: msg.isFromUser ? 'user' : 'assistant',
          content: msg.content
        });
      }
    });

    // ==========================================
    // DADA BORA PROCESSING (same as WhatsApp)
    // ==========================================

    // 1. CRISIS DETECTION
    let isCrisis = false;
    let crisisContext = '';
    const crisisAlert = detectCrisis(sanitizedMessage);
    
    if (crisisAlert) {
      isCrisis = true;
      console.log(`🚨 WEB CRISIS DETECTED: ${crisisAlert.severity} - ${crisisAlert.type}`);
      
      try {
        await createCrisisAlert(crisisAlert, chatId, anonymousName, sanitizedMessage);
      } catch (alertError) {
        console.error('Failed to create crisis alert:', alertError);
      }
      
      crisisContext = `
⚠️ CRISIS DETECTED - ${crisisAlert.severity.toUpperCase()}
Type: ${crisisAlert.type}
Triggers found: ${crisisAlert.triggers.join(', ')}

PRIORITY: This user may be in distress. Human support has been alerted.
Your role: Provide immediate emotional support, stay calm, show you care.
`;
    }

    // 2. USER PROFILE MANAGEMENT
    const { profile: userProfile, isNew, locationInfo } = await getOrCreateProfileByPhoneHash(
      session.phoneHash,
      chatId,
      anonymousName,
      session.phoneNumber
    );
    
    if (isNew) {
      console.log(`📱 New web user profile created for ${anonymousName}`);
    } else {
      await incrementTrustScore(chatId, 1);
      await updateRelationshipStage(chatId);
    }

    // 2.5 EXTRACT FACTS BEFORE AI CALL — so profile is up-to-date for context generation
    const extractedFacts = extractFactsFromMessage(sanitizedMessage);
    if (Object.keys(extractedFacts).length > 0) {
      await updateUserProfile(chatId, extractedFacts);
      // Merge into local profile so generateOptimizedContext sees it immediately
      Object.assign(userProfile, extractedFacts);
    }

    // 3. GENERATE OPTIMIZED CONTEXT
    const { context: optimizedContext, tokenEstimate } = generateOptimizedContext(
      userProfile,
      sanitizedMessage,
      isCrisis
    );

    const progressiveQuestion = getProgressiveQuestion(userProfile);

    // Update profile
    await updateUserProfile(chatId, {
      totalMessages: FieldValue.increment(1) as unknown as number,
      recentTopics: [...(userProfile?.recentTopics || []).slice(-4), crisisAlert?.type || 'general'],
      currentMood: isCrisis ? 'distressed' : undefined,
      hasCrisisHistory: userProfile?.hasCrisisHistory || isCrisis,
      requiresCarefulHandling: userProfile?.requiresCarefulHandling || (crisisAlert?.severity === 'critical'),
    });

    // 4. GET AI RESPONSE
    const { response: aiResponse, tokensUsed } = await getAIResponse(
      sanitizedMessage,
      chatHistory,
      chatId,
      isCrisis,
      crisisContext,
      optimizedContext
    );

    if (tokensUsed > 0) {
      await trackTokenUsage(chatId, tokensUsed);
    }

    let finalResponse = aiResponse || "I'm here for you, sis. 💜 Could you tell me more about what's on your mind?";

    // Add crisis resources if critical
    if (crisisAlert?.severity === 'critical') {
      const resources = getCrisisResources();
      finalResponse = `${finalResponse}\n\n${resources}`;
    }

    // Add progressive question if appropriate
    if (progressiveQuestion && !isCrisis && !aiResponse.includes('?')) {
      finalResponse = `${finalResponse}\n\n${progressiveQuestion}`;
    }

    // Store AI response
    await messagesRef.add({
      content: finalResponse,
      timestamp: Timestamp.now(),
      isFromUser: false,
      source: 'web' as MessageSource,
      wasCrisisResponse: isCrisis,
      tokensUsed,
    });

    // Update chat
    await chatRef.update({
      lastMessage: finalResponse,
      lastMessageTime: Timestamp.now(),
    });

    // Extend session
    await extendSession(sessionId);

    return NextResponse.json({
      success: true,
      response: finalResponse,
      isCrisis,
      tokensUsed,
    });

  } catch (error) {
    console.error('Web chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/web
 * Get chat history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session required' },
        { status: 401 }
      );
    }

    const sessionResult = await validateSession(sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Invalid session' },
        { status: 401 }
      );
    }

    const session = sessionResult.session!;
    const chatId = session.chatId;

    // Get chat info
    const chatDoc = await adminDb.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    const chatData = chatDoc.data()!;

    // Get messages
    const messagesSnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const messages = messagesSnapshot.docs.reverse().map(doc => ({
      id: doc.id,
      content: doc.data().content,
      isFromUser: doc.data().isFromUser,
      timestamp: doc.data().timestamp.toDate().toISOString(),
      source: doc.data().source || 'unknown',
    }));

    // Get user profile for location info
    const profileDoc = await adminDb.collection('userProfiles').doc(chatId).get();
    const profile = profileDoc.exists ? profileDoc.data() : null;

    return NextResponse.json({
      chatId,
      anonymousName: chatData.anonymousName,
      messages,
      location: profile?.location || null,
      relationshipStage: profile?.relationshipStage || 'new',
      trustScore: profile?.trustScore || 0,
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}
