/**
 * OTP Verification System for Dada Bora Web Chat
 * Uses Twilio Verify API for SMS OTP
 * 
 * Flow:
 * 1. User enters phone number
 * 2. We send OTP via SMS
 * 3. User enters OTP
 * 4. We verify and create/load their profile
 */

import { adminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import twilio from 'twilio';

// Session types
export interface WebChatSession {
  sessionId: string;
  phoneNumber: string;
  phoneHash: string;
  chatId: string;
  verified: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastActivity: Timestamp;
  source: 'web' | 'mobile-app';
  userAgent?: string;
  ipAddress?: string;
}

// Rate limiting for OTP requests
const otpRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if phone number has exceeded OTP request limit
 * Max 3 requests per 10 minutes
 */
export function checkOTPRateLimit(phoneNumber: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const limit = otpRateLimits.get(phoneNumber);
  
  if (!limit || limit.resetAt < now) {
    otpRateLimits.set(phoneNumber, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return { allowed: true };
  }
  
  if (limit.count >= 3) {
    return { allowed: false, retryAfter: Math.ceil((limit.resetAt - now) / 1000) };
  }
  
  limit.count++;
  return { allowed: true };
}

/**
 * Get Twilio client with credentials from Firestore
 */
async function getTwilioClient(): Promise<{ client: twilio.Twilio; verifyServiceSid: string } | null> {
  try {
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();
    
    if (!config?.accountSid || !config?.authToken) {
      console.error('Twilio credentials not configured');
      return null;
    }
    
    const client = twilio(config.accountSid, config.authToken);
    
    // Get or create Verify Service
    let verifyServiceSid = config.verifyServiceSid;
    
    if (!verifyServiceSid) {
      // Create a new Verify Service
      const service = await client.verify.v2.services.create({
        friendlyName: 'Dada Bora Web Chat',
        codeLength: 6,
      });
      verifyServiceSid = service.sid;
      
      // Save for future use
      await adminDb.collection('integrations').doc('whatsapp').update({
        verifyServiceSid: service.sid,
      });
    }
    
    return { client, verifyServiceSid };
  } catch (error) {
    console.error('Error getting Twilio client:', error);
    return null;
  }
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<{
  success: boolean;
  error?: string;
  retryAfter?: number;
}> {
  // Check rate limit
  const rateLimit = checkOTPRateLimit(phoneNumber);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Too many OTP requests. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    };
  }
  
  // Normalize phone number
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  
  try {
    const twilioSetup = await getTwilioClient();
    if (!twilioSetup) {
      return { success: false, error: 'SMS service not configured' };
    }
    
    const { client, verifyServiceSid } = twilioSetup;
    
    // Send verification code
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: 'sms',
      });
    
    console.log(`OTP sent to ${normalizedPhone.substring(0, 6)}...`);
    
    // Log the attempt
    await adminDb.collection('otpLogs').add({
      phoneHash: hashPhone(normalizedPhone),
      action: 'sent',
      timestamp: Timestamp.now(),
      success: true,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    
    // Handle specific Twilio errors
    if (error.code === 60200) {
      return { success: false, error: 'Invalid phone number format' };
    }
    if (error.code === 60203) {
      return { success: false, error: 'Too many attempts. Please try again in 10 minutes.' };
    }
    
    return { success: false, error: 'Failed to send verification code' };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phoneNumber: string, code: string): Promise<{
  success: boolean;
  error?: string;
  session?: WebChatSession;
}> {
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  
  try {
    const twilioSetup = await getTwilioClient();
    if (!twilioSetup) {
      return { success: false, error: 'SMS service not configured' };
    }
    
    const { client, verifyServiceSid } = twilioSetup;
    
    // Verify the code
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: code,
      });
    
    if (verification.status !== 'approved') {
      // Log failed attempt
      await adminDb.collection('otpLogs').add({
        phoneHash: hashPhone(normalizedPhone),
        action: 'verify_failed',
        timestamp: Timestamp.now(),
        success: false,
      });
      
      return { success: false, error: 'Invalid verification code' };
    }
    
    // Code is valid - create session
    const session = await createWebChatSession(normalizedPhone);
    
    // Log success
    await adminDb.collection('otpLogs').add({
      phoneHash: hashPhone(normalizedPhone),
      action: 'verified',
      timestamp: Timestamp.now(),
      success: true,
    });
    
    return { success: true, session };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    
    if (error.code === 60202) {
      return { success: false, error: 'Verification code expired. Please request a new one.' };
    }
    
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Simple hash function for phone numbers (matches the one in chat-utils)
 */
function hashPhone(phoneNumber: string): string {
  let hash = 0;
  for (let i = 0; i < phoneNumber.length; i++) {
    const char = phoneNumber.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Create a web chat session after OTP verification
 */
async function createWebChatSession(phoneNumber: string): Promise<WebChatSession> {
  const phoneHash = hashPhone(phoneNumber);
  
  // Check if there's an existing chat for this phone
  const existingChats = await adminDb.collection('chats')
    .where('phoneNumberHash', '==', phoneHash)
    .limit(1)
    .get();
  
  let chatId: string;
  
  if (!existingChats.empty) {
    chatId = existingChats.docs[0].id;
  } else {
    // Create new chat
    chatId = `web_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Generate anonymous name
    const adjectives = ['Brave', 'Bright', 'Calm', 'Clever', 'Gentle', 'Happy', 'Kind', 'Lovely', 'Noble', 'Warm'];
    const nouns = ['Butterfly', 'Dove', 'Flower', 'Moon', 'Pearl', 'Rose', 'Star', 'Sun', 'Wave', 'Wind'];
    const anonymousName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`;
    
    await adminDb.collection('chats').doc(chatId).set({
      anonymousName,
      phoneNumberHash: phoneHash,
      lastMessage: '',
      lastMessageTime: Timestamp.now(),
      unreadCount: 0,
      createdAt: Timestamp.now(),
      source: 'web',
      sources: ['web'], // Track all sources this user has used
    });
  }
  
  // Create session
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours
  
  const session: WebChatSession = {
    sessionId,
    phoneNumber,
    phoneHash,
    chatId,
    verified: true,
    createdAt: now,
    expiresAt,
    lastActivity: now,
    source: 'web',
  };
  
  // Store session
  await adminDb.collection('webSessions').doc(sessionId).set(session);
  
  return session;
}

/**
 * Validate an existing session
 */
export async function validateSession(sessionId: string): Promise<{
  valid: boolean;
  session?: WebChatSession;
  error?: string;
}> {
  try {
    const sessionDoc = await adminDb.collection('webSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return { valid: false, error: 'Session not found' };
    }
    
    const session = sessionDoc.data() as WebChatSession;
    
    // Check if expired
    if (session.expiresAt.toDate() < new Date()) {
      await adminDb.collection('webSessions').doc(sessionId).delete();
      return { valid: false, error: 'Session expired' };
    }
    
    // Update last activity
    await adminDb.collection('webSessions').doc(sessionId).update({
      lastActivity: Timestamp.now(),
    });
    
    return { valid: true, session };
  } catch (error) {
    console.error('Error validating session:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

/**
 * End a session (logout)
 */
export async function endSession(sessionId: string): Promise<void> {
  try {
    await adminDb.collection('webSessions').doc(sessionId).delete();
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

/**
 * Extend session expiry
 */
export async function extendSession(sessionId: string): Promise<void> {
  try {
    const newExpiry = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    await adminDb.collection('webSessions').doc(sessionId).update({
      expiresAt: newExpiry,
      lastActivity: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error extending session:', error);
  }
}
