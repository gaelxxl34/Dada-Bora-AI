import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';
import { requireAuth, applyRateLimit } from '../../../../lib/auth-middleware';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute for user creation)
    const rateLimitResult = applyRateLimit(request, 5, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Check if the authenticated user has admin privileges
    const adminUser = await adminDb.collection('users').doc(authResult.user.uid).get();
    const adminData = adminUser.data();
    if (!adminData || (adminData.role !== 'admin' && adminData.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Forbidden. Only administrators can create users.' },
        { status: 403 }
      );
    }

    const { name, email, password, role } = await request.json();

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'partner', 'user', 'agent'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, partner, user, agent' },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: Timestamp.now(),
      lastActive: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.uid,
        name,
        email,
        role,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    
    const firebaseError = error as { code?: string; message?: string };
    
    // Handle specific Firebase Auth errors
    if (firebaseError.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }
    
    if (firebaseError.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    if (firebaseError.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: firebaseError.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
