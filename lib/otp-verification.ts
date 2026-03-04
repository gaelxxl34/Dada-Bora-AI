/**
 * OTP Verification System for Dada Bora Web Chat
 * Uses Firebase Phone Auth for SMS verification (free up to 10K/month)
 * Session management handled via Firestore
 * 
 * Flow:
 * 1. User enters phone number
 * 2. Firebase Phone Auth sends OTP via SMS (client-side)
 * 3. User enters OTP, verified by Firebase client SDK
 * 4. Server receives Firebase ID token, verifies it, creates chat session
 */

import { adminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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

/**
 * Create a web chat session from Firebase Phone Auth
 * Called after Firebase ID token is verified on the server
 */
export async function createSessionFromFirebaseAuth(phoneNumber: string): Promise<{
  session: WebChatSession;
  anonymousName: string;
  isNew: boolean;
}> {
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  const session = await createWebChatSession(normalizedPhone);
  
  // Fetch the chat to get anonymousName and check if new
  const chatDoc = await adminDb.collection('chats').doc(session.chatId).get();
  const chatData = chatDoc.data();
  
  // Check if this is a new user (created within the last 10 seconds)
  const isNew = chatData?.createdAt && 
    (Date.now() - chatData.createdAt.toDate().getTime()) < 10000;

  // Log the auth event
  await adminDb.collection('otpLogs').add({
    phoneHash: hashPhone(normalizedPhone),
    action: 'firebase_verified',
    timestamp: Timestamp.now(),
    success: true,
  });

  return {
    session,
    anonymousName: chatData?.anonymousName || 'Anonymous',
    isNew: !!isNew,
  };
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
