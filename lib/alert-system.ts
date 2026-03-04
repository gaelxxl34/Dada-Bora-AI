/**
 * Alert System for Dada Bora
 * Sends real-time notifications to super admins and agents when crisis is detected
 * Integrates with Firebase for real-time dashboard updates
 */

import { adminDb } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { CrisisAlert, CrisisSeverity } from './crisis-detection';

export interface AlertNotification {
  id?: string;
  type: 'crisis' | 'escalation' | 'follow-up' | 'product-opportunity';
  severity: CrisisSeverity;
  chatId: string;
  anonymousName: string;
  message: string;
  triggerMessage: string;
  triggers: string[];
  status: 'new' | 'acknowledged' | 'in-progress' | 'resolved';
  assignedTo?: string;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  notes?: string;
  crisisType?: string;
}

/**
 * Create a crisis alert and notify all relevant parties
 */
export async function createCrisisAlert(
  crisisAlert: CrisisAlert,
  chatId: string,
  anonymousName: string,
  triggerMessage: string
): Promise<string> {
  try {
    // Create the alert document
    const alertRef = adminDb.collection('crisisAlerts').doc();
    const alertData: AlertNotification = {
      type: 'crisis',
      severity: crisisAlert.severity,
      chatId,
      anonymousName,
      message: crisisAlert.message,
      triggerMessage,
      triggers: crisisAlert.triggers,
      status: 'new',
      crisisType: crisisAlert.type,
      createdAt: Timestamp.now(),
    };
    
    await alertRef.set(alertData);
    
    // Update the chat document to flag it as having an active alert
    await adminDb.collection('chats').doc(chatId).update({
      hasActiveAlert: true,
      alertSeverity: crisisAlert.severity,
      lastAlertId: alertRef.id,
      lastAlertTime: Timestamp.now(),
    });
    
    // Increment unread alerts counter for dashboard
    await updateAlertCounters(crisisAlert.severity);
    
    // If critical or high severity, send push notification (if configured)
    if (crisisAlert.severity === 'critical' || crisisAlert.severity === 'high') {
      await sendUrgentNotification(alertData, alertRef.id);
    }
    
    console.log(`🚨 Crisis alert created: ${alertRef.id} (${crisisAlert.severity})`);
    return alertRef.id;
    
  } catch (error) {
    console.error('Error creating crisis alert:', error);
    throw error;
  }
}

/**
 * Update alert counters for real-time dashboard display
 */
async function updateAlertCounters(severity: CrisisSeverity): Promise<void> {
  try {
    const countersRef = adminDb.collection('systemStats').doc('alerts');
    
    await countersRef.set({
      [`unread_${severity}`]: FieldValue.increment(1),
      totalUnread: FieldValue.increment(1),
      lastAlertTime: Timestamp.now(),
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating alert counters:', error);
  }
}

/**
 * Send urgent notification for critical alerts
 * This could be extended to send SMS, email, or push notifications
 */
async function sendUrgentNotification(alert: AlertNotification, alertId: string): Promise<void> {
  try {
    // Get all super admins and agents
    const usersSnapshot = await adminDb.collection('users')
      .where('role', 'in', ['super_admin', 'admin', 'agent'])
      .get();
    
    // Create notification for each user
    const batch = adminDb.batch();
    
    usersSnapshot.docs.forEach(doc => {
      const notificationRef = adminDb.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: doc.id,
        type: 'crisis_alert',
        title: `🚨 ${alert.severity.toUpperCase()} ALERT`,
        body: `${alert.anonymousName}: ${alert.crisisType || 'Crisis detected'}`,
        alertId,
        chatId: alert.chatId,
        read: false,
        createdAt: Timestamp.now(),
      });
    });
    
    await batch.commit();
    
    console.log(`📢 Urgent notifications sent to ${usersSnapshot.size} users`);
    
  } catch (error) {
    console.error('Error sending urgent notification:', error);
  }
}

/**
 * Acknowledge an alert (mark as being handled)
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  try {
    await adminDb.collection('crisisAlerts').doc(alertId).update({
      status: 'acknowledged',
      assignedTo: userId,
      acknowledgedAt: Timestamp.now(),
    });
    
    // Decrement unread counter
    const alert = await adminDb.collection('crisisAlerts').doc(alertId).get();
    const severity = alert.data()?.severity;
    
    if (severity) {
      await adminDb.collection('systemStats').doc('alerts').update({
        [`unread_${severity}`]: FieldValue.increment(-1),
        totalUnread: FieldValue.increment(-1),
      });
    }
    
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string, 
  notes?: string,
  outcome?: 'resolved' | 'referred' | 'false-alarm'
): Promise<void> {
  try {
    const alertRef = adminDb.collection('crisisAlerts').doc(alertId);
    const alert = await alertRef.get();
    const chatId = alert.data()?.chatId;
    
    await alertRef.update({
      status: 'resolved',
      resolvedAt: Timestamp.now(),
      notes: notes || '',
      outcome: outcome || 'resolved',
    });
    
    // Update chat document
    if (chatId) {
      await adminDb.collection('chats').doc(chatId).update({
        hasActiveAlert: false,
        alertSeverity: null,
      });
    }
    
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Get all unread alerts for dashboard
 */
export async function getUnreadAlerts(): Promise<AlertNotification[]> {
  try {
    const snapshot = await adminDb.collection('crisisAlerts')
      .where('status', 'in', ['new', 'acknowledged'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AlertNotification[];
    
  } catch (error) {
    console.error('Error getting unread alerts:', error);
    return [];
  }
}

/**
 * Get alert statistics for dashboard
 */
export async function getAlertStats(): Promise<{
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved24h: number;
}> {
  try {
    const statsDoc = await adminDb.collection('systemStats').doc('alerts').get();
    const stats = statsDoc.data() || {};
    
    // Get resolved in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const resolvedSnapshot = await adminDb.collection('crisisAlerts')
      .where('status', '==', 'resolved')
      .where('resolvedAt', '>=', Timestamp.fromDate(yesterday))
      .get();
    
    return {
      total: stats.totalUnread || 0,
      critical: stats.unread_critical || 0,
      high: stats.unread_high || 0,
      medium: stats.unread_medium || 0,
      low: stats.unread_low || 0,
      resolved24h: resolvedSnapshot.size,
    };
    
  } catch (error) {
    console.error('Error getting alert stats:', error);
    return { total: 0, critical: 0, high: 0, medium: 0, low: 0, resolved24h: 0 };
  }
}
