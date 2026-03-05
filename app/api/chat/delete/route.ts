import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// DELETE /api/chat/delete
// Deletes a chat conversation and ALL associated user data.
// Only super_admin can perform this action.
//
// Body: { chatId: string }
// Auth: Bearer token (Firebase ID token)

export async function DELETE(request: NextRequest) {
  try {
    // ─── Verify authentication ─────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let uid: string;

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ─── Verify super_admin role ───────────────────────────────────
    const adminDoc = await adminDb.collection('users').doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only super admins can delete conversations.' },
        { status: 403 }
      );
    }

    // ─── Parse request body ────────────────────────────────────────
    const body = await request.json();
    const { chatId } = body;

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // ─── Get the chat document first (to find the phoneNumberHash) ─
    const chatDoc = await adminDb.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chatData = chatDoc.data();
    const phoneNumberHash = chatData?.phoneNumberHash;

    // Track what was deleted
    const deletionLog: Record<string, number> = {};

    // ─── 1. Delete all messages in chats/{chatId}/messages ─────────
    const messagesSnapshot = await adminDb
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();

    if (!messagesSnapshot.empty) {
      const batch = adminDb.batch();
      let count = 0;
      for (const msgDoc of messagesSnapshot.docs) {
        batch.delete(msgDoc.ref);
        count++;
        // Firestore batch limit is 500
        if (count % 450 === 0) {
          await batch.commit();
        }
      }
      if (count % 450 !== 0) {
        await batch.commit();
      }
      deletionLog['messages'] = count;
    }

    // ─── 2. Delete the chat document itself ────────────────────────
    await adminDb.collection('chats').doc(chatId).delete();
    deletionLog['chat'] = 1;

    // ─── 3. Delete the user profile ────────────────────────────────
    const profileDoc = await adminDb.collection('userProfiles').doc(chatId).get();
    if (profileDoc.exists) {
      await adminDb.collection('userProfiles').doc(chatId).delete();
      deletionLog['userProfile'] = 1;
    }

    // ─── 4. Delete web sessions associated with this chatId ────────
    const sessionsSnapshot = await adminDb
      .collection('webSessions')
      .where('chatId', '==', chatId)
      .get();

    if (!sessionsSnapshot.empty) {
      const batch = adminDb.batch();
      for (const sessionDoc of sessionsSnapshot.docs) {
        batch.delete(sessionDoc.ref);
      }
      await batch.commit();
      deletionLog['webSessions'] = sessionsSnapshot.size;
    }

    // ─── 5. Delete sessions by phoneNumberHash (catch stragglers) ──
    if (phoneNumberHash) {
      const phoneSessionsSnapshot = await adminDb
        .collection('webSessions')
        .where('phoneHash', '==', phoneNumberHash)
        .get();

      if (!phoneSessionsSnapshot.empty) {
        const batch = adminDb.batch();
        for (const sessionDoc of phoneSessionsSnapshot.docs) {
          batch.delete(sessionDoc.ref);
        }
        await batch.commit();
        deletionLog['webSessionsByPhone'] = phoneSessionsSnapshot.size;
      }
    }

    // ─── 6. Delete crisis alerts for this chat ─────────────────────
    const alertsSnapshot = await adminDb
      .collection('crisisAlerts')
      .where('chatId', '==', chatId)
      .get();

    if (!alertsSnapshot.empty) {
      const batch = adminDb.batch();
      for (const alertDoc of alertsSnapshot.docs) {
        batch.delete(alertDoc.ref);
      }
      await batch.commit();
      deletionLog['crisisAlerts'] = alertsSnapshot.size;
    }

    // ─── 7. Delete token usage records ─────────────────────────────
    const tokenUsageSnapshot = await adminDb
      .collection('tokenUsage')
      .where('chatId', '==', chatId)
      .get();

    if (!tokenUsageSnapshot.empty) {
      const batch = adminDb.batch();
      for (const tokenDoc of tokenUsageSnapshot.docs) {
        batch.delete(tokenDoc.ref);
      }
      await batch.commit();
      deletionLog['tokenUsage'] = tokenUsageSnapshot.size;
    }

    // ─── 8. Delete OTP logs by phoneHash ───────────────────────────
    if (phoneNumberHash) {
      const otpLogsSnapshot = await adminDb
        .collection('otpLogs')
        .where('phoneHash', '==', phoneNumberHash)
        .get();

      if (!otpLogsSnapshot.empty) {
        const batch = adminDb.batch();
        for (const otpDoc of otpLogsSnapshot.docs) {
          batch.delete(otpDoc.ref);
        }
        await batch.commit();
        deletionLog['otpLogs'] = otpLogsSnapshot.size;
      }
    }

    // ─── 9. Delete any other chats with the same phoneNumberHash ───
    // (A user might have multiple chat sessions)
    if (phoneNumberHash) {
      const relatedChatsSnapshot = await adminDb
        .collection('chats')
        .where('phoneNumberHash', '==', phoneNumberHash)
        .get();

      let relatedCount = 0;
      for (const relatedChat of relatedChatsSnapshot.docs) {
        // Delete messages subcollection
        const relatedMsgs = await adminDb
          .collection('chats')
          .doc(relatedChat.id)
          .collection('messages')
          .get();

        if (!relatedMsgs.empty) {
          const batch = adminDb.batch();
          let batchCount = 0;
          for (const msgDoc of relatedMsgs.docs) {
            batch.delete(msgDoc.ref);
            batchCount++;
            if (batchCount % 450 === 0) {
              await batch.commit();
            }
          }
          if (batchCount % 450 !== 0) {
            await batch.commit();
          }
        }

        // Delete the related chat profile if it exists
        const relatedProfile = await adminDb.collection('userProfiles').doc(relatedChat.id).get();
        if (relatedProfile.exists) {
          await adminDb.collection('userProfiles').doc(relatedChat.id).delete();
        }

        // Delete the related chat doc
        await adminDb.collection('chats').doc(relatedChat.id).delete();
        relatedCount++;
      }

      if (relatedCount > 0) {
        deletionLog['relatedChats'] = relatedCount;
      }
    }

    // ─── 10. Log the deletion action ───────────────────────────────
    await adminDb.collection('activityLogs').add({
      action: 'delete_conversation',
      performedBy: uid,
      performedByEmail: adminDoc.data()?.email || 'unknown',
      chatId,
      phoneNumberHash: phoneNumberHash || null,
      deletionLog,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation and all associated data have been permanently deleted.',
      deletionLog,
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
