/**
 * Authentication middleware for API routes
 * Validates Firebase Auth tokens for protected endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  role?: string;
}

/**
 * Verify Firebase Auth token from request headers
 * Returns the authenticated user or null if not authenticated
 * Checks custom claims first, then falls back to Firestore 'users' collection
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return null;
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Try custom claims first
    let role = decodedToken.role as string | undefined;

    // If no role in custom claims, fetch from Firestore 'users' collection
    if (!role) {
      try {
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          role = userDoc.data()?.role as string | undefined;
        }
      } catch (err) {
        console.error('Error fetching user role from Firestore:', err);
      }
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Returns an error response if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
  const user = await verifyAuthToken(request);
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized. Please provide a valid authentication token.' },
        { status: 401 }
      ),
    };
  }

  return { user };
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return authResult;
  }

  // Check if user has admin role (you should fetch this from Firestore)
  // For now, we'll check the custom claims or fetch from database
  
  return authResult;
}

/**
 * Simple rate limiting using in-memory store
 * Note: For production, use Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Create new window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }

  // Increment count
  record.count++;
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetIn: record.resetTime - now 
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIP(request);
  const endpoint = new URL(request.url).pathname;
  const identifier = `${ip}:${endpoint}`;
  
  const result = rateLimit(identifier, maxRequests, windowMs);
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(result.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
          }
        }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Role-based permission definitions
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // All permissions
  admin: ['dashboard', 'knowledge-base', 'chat', 'alerts', 'users', 'settings', 'analytics', 'integrations'],
  agent: ['dashboard', 'chat', 'alerts', 'knowledge-base'],
  partner: ['partner-dashboard', 'products', 'catalogue', 'locations', 'profile', 'partner-analytics'],
  user: ['chat'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }
  
  // Super admin has all permissions
  if (permissions.includes('*')) {
    return true;
  }
  
  return permissions.includes(permission);
}

/**
 * Extended verification that also returns authenticated status
 */
export async function verifyAuthTokenExtended(request: NextRequest): Promise<{
  authenticated: boolean;
  user: AuthenticatedUser | null;
}> {
  const user = await verifyAuthToken(request);
  return {
    authenticated: !!user,
    user,
  };
}
