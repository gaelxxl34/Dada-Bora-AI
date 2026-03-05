/**
 * PIN-based Authentication for Dada Bora Web Chat
 * Users authenticate with phone number + 4-digit PIN
 * 
 * Flow for new users:
 * 1. Enter phone number → check if exists
 * 2. If new → create PIN → session created
 * 
 * Flow for returning users:
 * 1. Enter phone number → check if exists
 * 2. If exists → enter PIN → verified → session created
 */

import { adminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

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
 * Hash a PIN with a salt for secure storage
 */
function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

/**
 * Generate a random salt
 */
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
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
 * Check if a phone number already has an account (returns whether user exists)
 */
export async function checkPhoneExists(phoneNumber: string): Promise<{ exists: boolean }> {
  const phoneHash = hashPhone(phoneNumber);
  const existing = await adminDb.collection('chats')
    .where('phoneNumberHash', '==', phoneHash)
    .limit(1)
    .get();
  
  return { exists: !existing.empty };
}

/**
 * Register a new user with phone + PIN
 */
export async function registerWithPin(phoneNumber: string, pin: string): Promise<{
  session: WebChatSession;
  anonymousName: string;
}> {
  const phoneHash = hashPhone(phoneNumber);
  
  // Check if phone already registered
  const existing = await adminDb.collection('chats')
    .where('phoneNumberHash', '==', phoneHash)
    .limit(1)
    .get();
  
  if (!existing.empty) {
    throw new Error('PHONE_ALREADY_REGISTERED');
  }
  
  // Create PIN hash
  const salt = generateSalt();
  const pinHash = hashPin(pin, salt);
  
  // Generate anonymous name
  const adjectives = ['Brave', 'Bright', 'Calm', 'Clever', 'Gentle', 'Happy', 'Kind', 'Lovely', 'Noble', 'Warm'];
  const nouns = ['Butterfly', 'Dove', 'Flower', 'Moon', 'Pearl', 'Rose', 'Star', 'Sun', 'Wave', 'Wind'];
  const anonymousName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`;
  
  // Create chat document
  const chatId = `web_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await adminDb.collection('chats').doc(chatId).set({
    anonymousName,
    phoneNumberHash: phoneHash,
    pinHash,
    pinSalt: salt,
    lastMessage: '',
    lastMessageTime: Timestamp.now(),
    unreadCount: 0,
    createdAt: Timestamp.now(),
    source: 'web',
    sources: ['web'],
  });
  
  // Create session
  const session = await createSession(phoneNumber, phoneHash, chatId);
  
  // Log registration
  await adminDb.collection('otpLogs').add({
    phoneHash,
    action: 'pin_register',
    timestamp: Timestamp.now(),
    success: true,
  });
  
  return { session, anonymousName };
}

/**
 * Login with phone + PIN
 */
export async function loginWithPin(phoneNumber: string, pin: string): Promise<{
  session: WebChatSession;
  anonymousName: string;
}> {
  const phoneHash = hashPhone(phoneNumber);
  
  // Find user by phone hash
  const existing = await adminDb.collection('chats')
    .where('phoneNumberHash', '==', phoneHash)
    .limit(1)
    .get();
  
  if (existing.empty) {
    throw new Error('USER_NOT_FOUND');
  }
  
  const chatDoc = existing.docs[0];
  const chatData = chatDoc.data();
  
  // Check if user has a PIN set (legacy users from OTP system won't have one)
  if (!chatData.pinHash || !chatData.pinSalt) {
    throw new Error('NO_PIN_SET');
  }
  
  // Verify PIN
  const pinHash = hashPin(pin, chatData.pinSalt);
  if (pinHash !== chatData.pinHash) {
    // Log failed attempt
    await adminDb.collection('otpLogs').add({
      phoneHash,
      action: 'pin_login_failed',
      timestamp: Timestamp.now(),
      success: false,
    });
    throw new Error('INVALID_PIN');
  }
  
  // Create session
  const session = await createSession(phoneNumber, phoneHash, chatDoc.id);
  
  // Log successful login
  await adminDb.collection('otpLogs').add({
    phoneHash,
    action: 'pin_login',
    timestamp: Timestamp.now(),
    success: true,
  });
  
  return { session, anonymousName: chatData.anonymousName || 'Anonymous' };
}

/**
 * Set PIN for a legacy user (migrating from OTP to PIN)
 */
export async function setPinForExistingUser(phoneNumber: string, pin: string): Promise<{
  session: WebChatSession;
  anonymousName: string;
}> {
  const phoneHash = hashPhone(phoneNumber);
  
  const existing = await adminDb.collection('chats')
    .where('phoneNumberHash', '==', phoneHash)
    .limit(1)
    .get();
  
  if (existing.empty) {
    throw new Error('USER_NOT_FOUND');
  }
  
  const chatDoc = existing.docs[0];
  const chatData = chatDoc.data();
  
  // Set the PIN
  const salt = generateSalt();
  const pinHash = hashPin(pin, salt);
  
  await adminDb.collection('chats').doc(chatDoc.id).update({
    pinHash,
    pinSalt: salt,
  });
  
  // Create session
  const session = await createSession(phoneNumber, phoneHash, chatDoc.id);
  
  return { session, anonymousName: chatData.anonymousName || 'Anonymous' };
}

/**
 * Create a session for an authenticated user
 */
async function createSession(phoneNumber: string, phoneHash: string, chatId: string): Promise<WebChatSession> {
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
    
    if (session.expiresAt.toDate() < new Date()) {
      await adminDb.collection('webSessions').doc(sessionId).delete();
      return { valid: false, error: 'Session expired' };
    }
    
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
