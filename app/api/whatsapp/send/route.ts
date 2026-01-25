/**
 * API Route for sending messages via Twilio WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import twilio from 'twilio';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, mediaUrl } = body;

    // Get Twilio config from Firestore
    const configDoc = await adminDb.collection('integrations').doc('whatsapp').get();
    const config = configDoc.data();

    if (!config?.enabled) {
      return NextResponse.json(
        { error: 'WhatsApp integration is not enabled' },
        { status: 400 }
      );
    }

    const { accountSid, authToken, twilioWhatsAppNumber } = config;

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 400 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Format phone numbers for WhatsApp
    // Twilio requires 'whatsapp:+1234567890' format
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/^\+/, '')}`;
    const formattedFrom = twilioWhatsAppNumber.startsWith('whatsapp:') 
      ? twilioWhatsAppNumber 
      : `whatsapp:${twilioWhatsAppNumber}`;

    // Build message options
    const messageOptions: any = {
      body: message,
      from: formattedFrom,
      to: formattedTo,
    };

    // Add media URL if provided
    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }

    // Send message via Twilio
    const twilioMessage = await client.messages.create(messageOptions);

    // Log successful send
    console.log(`✅ Message sent successfully! Message SID: ${twilioMessage.sid}`);
    console.log(`   Recipient: ${formattedTo}`);
    console.log(`   Status: ${twilioMessage.status}`);

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      recipient: to,
      dateCreated: twilioMessage.dateCreated,
    });

  } catch (error: any) {
    console.error('Error sending Twilio WhatsApp message:', error);
    
    // Handle Twilio-specific errors
    if (error.code) {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to send message',
          errorCode: error.code,
          moreInfo: error.moreInfo
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
