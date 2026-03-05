/**
 * API Routes for Phone + PIN Authentication
 * Handles user registration, login, and session management for web chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, endSession, checkPhoneExists, registerWithPin, loginWithPin, setPinForExistingUser } from '@/lib/pin-auth';
import { applyRateLimit } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

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
        // Check if phone number already has an account
        if (!phoneNumber) {
          return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const result = await checkPhoneExists(phoneNumber);
        return NextResponse.json({ exists: result.exists });
      }

      case 'register': {
        // Register new user with phone + PIN
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
        }

        try {
          const result = await registerWithPin(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: result.session.sessionId,
              chatId: result.session.chatId,
              anonymousName: result.anonymousName,
              isNew: true,
              expiresAt: result.session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'PHONE_ALREADY_REGISTERED') {
            return NextResponse.json({ error: 'Phone number already registered. Please login instead.' }, { status: 409 });
          }
          throw err;
        }
      }

      case 'login': {
        // Login with phone + PIN
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        try {
          const result = await loginWithPin(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: result.session.sessionId,
              chatId: result.session.chatId,
              anonymousName: result.anonymousName,
              isNew: false,
              expiresAt: result.session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 404 });
          }
          if (error.message === 'NO_PIN_SET') {
            return NextResponse.json({ error: 'NO_PIN_SET', needsPin: true }, { status: 403 });
          }
          if (error.message === 'INVALID_PIN') {
            return NextResponse.json({ error: 'Incorrect PIN. Please try again.' }, { status: 401 });
          }
          throw err;
        }
      }

      case 'set-pin': {
        // Set PIN for legacy user (migrating from OTP)
        if (!phoneNumber || !pin) {
          return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
        }

        try {
          const result = await setPinForExistingUser(phoneNumber, pin);
          return NextResponse.json({
            success: true,
            session: {
              sessionId: result.session.sessionId,
              chatId: result.session.chatId,
              anonymousName: result.anonymousName,
              isNew: false,
              expiresAt: result.session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'No account found.' }, { status: 404 });
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
