/**
 * API Route for Crisis Alerts Management
 * Provides endpoints for fetching, acknowledging, and resolving alerts
 * PROTECTED: Requires authentication (admin/agent only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, applyRateLimit } from '@/lib/auth-middleware';
import { acknowledgeAlert, resolveAlert, getAlertStats } from '@/lib/alert-system';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch all crisis alerts
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = applyRateLimit(request, 30, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Check user role - must be admin, super_admin, or agent
    const userRole = authResult.user.role || '';
    if (!['super_admin', 'admin', 'agent'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'new', 'acknowledged', 'resolved', or 'all'
    const severity = searchParams.get('severity'); // 'critical', 'high', 'medium', 'low'
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query: FirebaseFirestore.Query = adminDb.collection('crisisAlerts');

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    } else if (!status || status === 'all') {
      // Default: show non-resolved alerts
      query = query.where('status', 'in', ['new', 'acknowledged', 'in-progress']);
    }

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      acknowledgedAt: doc.data().acknowledgedAt?.toDate?.()?.toISOString(),
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString(),
    }));

    // Also get stats
    const stats = await getAlertStats();

    return NextResponse.json({
      success: true,
      alerts,
      stats,
      total: alerts.length,
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Acknowledge or resolve an alert
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = applyRateLimit(request, 30, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Check user role
    const userRole = authResult.user.role || '';
    if (!['super_admin', 'admin', 'agent'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, alertId, notes, outcome } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { error: 'Missing alertId or action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'acknowledge':
        await acknowledgeAlert(alertId, authResult.user.uid);
        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged',
        });

      case 'resolve':
        await resolveAlert(alertId, notes, outcome);
        return NextResponse.json({
          success: true,
          message: 'Alert resolved',
        });

      case 'add-note':
        await adminDb.collection('crisisAlerts').doc(alertId).update({
          notes: FieldValue.arrayUnion({
            content: notes,
            addedBy: authResult.user.uid,
            addedAt: Timestamp.now(),
          }),
        });
        return NextResponse.json({
          success: true,
          message: 'Note added',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
