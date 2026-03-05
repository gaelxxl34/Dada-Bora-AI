/**
 * API Routes for Phone + PIN Authentication
 * Handles phone check, registration, login, PIN setup, session management
 * 
 * Flow for new users:
 * 1. check-phone → not found → create-pin view
 * 2. register (phone + pin) → session created
 * 
 * Flow for returning users:
 * 1. check-phone → found → pin view
 * 2. login (phone + pin) → session created
 * 
 * Flow for legacy users (no PIN):
 * 1. check-phone → found but no PIN → create-pin view
 * 2. set-pin (phone + pin) → session created
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPhoneExists, registerWithPin, loginWithPin, setPinForExistingUser, validateSession, endSession } from '@/lib/pin-auth';
import { applyRateLimit } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Simple hash function for phone numbers (matches the one in pin-auth)
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
 * POST /api/auth/otp
 * Actions: check-phone, register, login, set-pin, validate, logout
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const rateLimitResult = applyRateLimit(request, 20, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { action, phoneNumber, pin, sessionId } = body;

    switch (action) {
      case 'check-phone': {
        if (!phoneNumber) {
          return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const { exists } = await checkPhoneExists(phoneNumber);
        
        // Check if existing user has a PIN set
        let hasPin = false;
        if (exists) {
          const phoneHash = hashPhone(phoneNumber);
          const chatDocs = await adminDb.collection('chats')
            .where('phoneNumberHash', '==', phoneHash)
            .limit(1)
            .get();
          if (!chatDocs.empty) {
            const data = chatDocs.docs[0].data();
            hasPin = !!(data.pinHash && data.pinSalt);
          }
        }

        return NextResponse.json({ exists, hasPin });
      }

      case 'register': {
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        if (pin.length !== 4) {
          return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 });
        }

        try {
          const { session, anonymousName } = await registerWithPin(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: session.sessionId,
              chatId: session.chatId,
              anonymousName,
              isNew: true,
              expiresAt: session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'PHONE_ALREADY_REGISTERED') {
            return NextResponse.json({ error: 'PHONE_ALREADY_REGISTERED' }, { status: 409 });
          }
          throw err;
        }
      }

      case 'login': {
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        try {
          const { session, anonymousName } = await loginWithPin(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: session.sessionId,
              chatId: session.chatId,
              anonymousName,
              isNew: false,
              expiresAt: session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'INVALID_PIN') {
            return NextResponse.json({ error: 'INVALID_PIN' }, { status: 401 });
          }
          if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
          }
          if (error.message === 'NO_PIN_SET') {
            return NextResponse.json({ error: 'NO_PIN_SET' }, { status: 400 });
          }
          throw err;
        }
      }

      case 'set-pin': {
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        if (pin.length !== 4) {
          return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 });
        }

        try {
          const { session, anonymousName } = await setPinForExistingUser(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: session.sessionId,
              chatId: session.chatId,
              anonymousName,
              isNew: false,
              expiresAt: session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
          }
          throw err;
        }
      }

      case 'validate': {
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const result = await validateSession(sessionId);
        
        if (!result.valid) {
          return NextResponse.json({ valid: false, error: result.error }, { status: 401 });
        }

        return NextResponse.json({
          valid: true,
          chatId: result.session!.chatId,
          expiresAt: result.session!.expiresAt.toDate().toISOString(),
        });
      }

      case 'logout': {
        if (sessionId) {
          await endSession(sessionId);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
