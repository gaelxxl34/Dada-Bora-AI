/**
 * API Routes for OTP Verification
 * Handles sending and verifying OTP codes for web chat authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOTP, verifyOTP, validateSession, endSession } from '@/lib/otp-verification';
import { applyRateLimit } from '@/lib/auth-middleware';
import { getLocationFromPhone } from '@/lib/phone-location';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp
 * Actions: send, verify, validate, logout
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const rateLimitResult = applyRateLimit(request, 20, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { action, phoneNumber, code, sessionId } = body;

    switch (action) {
      case 'send': {
        // Send OTP to phone number
        if (!phoneNumber) {
          return NextResponse.json(
            { error: 'Phone number is required' },
            { status: 400 }
          );
        }

        // Validate phone number format
        const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
        if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
          return NextResponse.json(
            { error: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
            { status: 400 }
          );
        }

        // Get location info for display
        const locationInfo = getLocationFromPhone(normalizedPhone);

        const result = await sendOTP(normalizedPhone);
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error, retryAfter: result.retryAfter },
            { status: result.retryAfter ? 429 : 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Verification code sent',
          location: locationInfo ? {
            country: locationInfo.countryName,
            region: locationInfo.region,
          } : null,
        });
      }

      case 'verify': {
        // Verify OTP code
        if (!phoneNumber || !code) {
          return NextResponse.json(
            { error: 'Phone number and code are required' },
            { status: 400 }
          );
        }

        if (!/^\d{6}$/.test(code)) {
          return NextResponse.json(
            { error: 'Invalid code format. Please enter 6 digits.' },
            { status: 400 }
          );
        }

        const result = await verifyOTP(phoneNumber, code);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }

        // Return session info (but not the full phone number for security)
        return NextResponse.json({
          success: true,
          session: {
            sessionId: result.session!.sessionId,
            chatId: result.session!.chatId,
            expiresAt: result.session!.expiresAt.toDate().toISOString(),
          },
        });
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
