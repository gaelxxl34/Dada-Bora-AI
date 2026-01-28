/**
 * API Route for handling incoming WhatsApp messages via Twilio
 * This creates new chats with anonymous usernames and stores messages
 * Then calls AI to generate a response and sends it back via WhatsApp
 * 
 * SECURITY: This endpoint validates Twilio signatures and has rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { applyRateLimit } from '@/lib/auth-middleware';
import { generateAnonymousName, generateChatId, validateMessage, sanitizeMessage, hashPhoneNumber } from '@/lib/chat-utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

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
    
    const url = request.url;
    
    // Parse form data for validation
    const params = Object.fromEntries(new URLSearchParams(body));
    
    const isValid = twilio.validateRequest(config.authToken, signature, url, params);
    
    if (!isValid) {
      console.error('SECURITY WARNING: Invalid Twilio signature - possible spoofed request');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

// Helper function to fetch knowledge base content
async function getKnowledgeBaseContent(): Promise<string> {
  try {
    const articlesSnapshot = await adminDb
      .collection('knowledgeArticles')
      .where('status', '==', 'published')
      .get();

    if (articlesSnapshot.empty) {
      return '';
    }

    const articles = articlesSnapshot.docs.map(doc => {
      const data = doc.data();
      return `## ${data.title}\nCategory: ${data.categoryName}\n${data.content}`;
    });

    return `\n\n---\n\nKNOWLEDGE BASE:\nThe following is your knowledge base containing verified information. Use this to provide accurate, consistent responses:\n\n${articles.join('\n\n---\n\n')}`;
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return '';
  }
}

// Get AI response from configured provider
async function getAIResponse(userMessage: string, chatHistory: Array<{role: string, content: string}> = []): Promise<string> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config || !config.enabled) {
      console.log('AI chatbot is not enabled');
      return '';
    }

    const { provider, openaiApiKey, anthropicApiKey, model, systemPrompt, temperature, maxTokens } = config;

    // Fetch knowledge base content and combine with system prompt
    const knowledgeBaseContent = await getKnowledgeBaseContent();
    const enhancedSystemPrompt = systemPrompt + knowledgeBaseContent;

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
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 500,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenAI API Error:', data);
        return '';
      }

      return data.choices?.[0]?.message?.content || '';

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
        return '';
      }

      return data.content?.[0]?.text || '';
    }

    return '';
  } catch (error) {
    console.error('Error getting AI response:', error);
    return '';
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

export async function POST(request: NextRequest) {
  try {
    // Apply aggressive rate limiting per IP (100 requests per minute - Twilio might send bursts)
    const rateLimitResult = applyRateLimit(request, 100, 60000);
    if (!rateLimitResult.allowed) {
      console.error('SECURITY: Rate limit exceeded for WhatsApp webhook');
      return rateLimitResult.response;
    }

    // Check if integration is enabled
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();
    
    if (!config?.enabled) {
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
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Handle Twilio WhatsApp webhook format
    // Twilio sends: From, To, Body, MessageSid, etc.
    const phoneNumber = body.From?.replace('whatsapp:', '') || '';
    const message = body.Body || '';
    const messageSid = body.MessageSid || '';
    const mediaUrl = body.MediaUrl0 || ''; // First media attachment if any
    const numMedia = parseInt(body.NumMedia || '0', 10);
    
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
    });

    console.log(`Message stored successfully for chat ${chatDocId}`);

    // Get recent chat history for context (last 5 messages for speed)
    const recentMessages = await messagesRef
      .orderBy('timestamp', 'desc')
      .limit(5)
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

    // Get AI response
    console.log('Calling AI service for response...');
    const aiResponse = await getAIResponse(sanitizedMessage, chatHistory);

    if (aiResponse) {
      console.log(`AI response generated: ${aiResponse.substring(0, 100)}...`);

      // Send AI response via WhatsApp
      const sendResult = await sendWhatsAppMessage(phoneNumber, aiResponse);

      if (sendResult.success) {
        // Store AI response in chat
        await messagesRef.add({
          content: aiResponse,
          timestamp: Timestamp.now(),
          isFromUser: false,
          messageSid: sendResult.messageSid,
        });

        // Update chat with AI response as last message
        await chatsRef.doc(chatDocId).update({
          lastMessage: aiResponse,
          lastMessageTime: Timestamp.now(),
        });

        console.log(`AI response stored and sent successfully`);
      } else {
        console.error(`Failed to send AI response: ${sendResult.error}`);
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
    message: 'Twilio WhatsApp webhook endpoint is active'
  });
}
