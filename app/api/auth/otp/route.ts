/**
 * API Routes for OTP Verification
 * Handles Firebase Phone Auth verification and session management for web chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, endSession, createSessionFromFirebaseAuth } from '@/lib/otp-verification';
import { applyRateLimit } from '@/lib/auth-middleware';
import { adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp
 * Actions: firebase-verify, validate, logout
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const rateLimitResult = applyRateLimit(request, 20, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { action, idToken, sessionId } = body;

    switch (action) {
      case 'firebase-verify': {
        // Verify Firebase ID token and create chat session
        if (!idToken) {
          return NextResponse.json(
            { error: 'ID token is required' },
            { status: 400 }
          );
        }

        try {
          // Verify the Firebase ID token with Admin SDK
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          const phoneNumber = decodedToken.phone_number;

          if (!phoneNumber) {
            return NextResponse.json(
              { error: 'Phone number not found in token' },
              { status: 400 }
            );
          }

          // Create or load chat session
          const result = await createSessionFromFirebaseAuth(phoneNumber);

          return NextResponse.json({
            success: true,
            session: {
              sessionId: result.session.sessionId,
              chatId: result.session.chatId,
              anonymousName: result.anonymousName,
              isNew: result.isNew,
              expiresAt: result.session.expiresAt.toDate().toISOString(),
            },
          });
        } catch (tokenError) {
          console.error('Firebase token verification failed:', tokenError);
          return NextResponse.json(
            { error: 'Invalid authentication token' },
            { status: 401 }
          );
        }
      }

      case 'validate': {
        // Validate existing session
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID is required' },
            { status: 400 }
          );
        }

        const result = await validateSession(sessionId);

        if (!result.valid) {
          return NextResponse.json(
            { valid: false, error: result.error },
            { status: 401 }
          );
        }

        return NextResponse.json({
          valid: true,
          chatId: result.session!.chatId,
          expiresAt: result.session!.expiresAt.toDate().toISOString(),
        });
      }

      case 'logout': {
        // End session
        if (sessionId) {
          await endSession(sessionId);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('OTP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
