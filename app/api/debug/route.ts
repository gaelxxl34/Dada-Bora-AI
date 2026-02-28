/**
 * API Route for debugging and diagnostics
 * Helps diagnose production issues with Firebase, AI, and Twilio
 * PROTECTED: Requires super_admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth-middleware';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: unknown;
  duration?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const diagnostics: DiagnosticResult[] = [];

    // 1. Test Firebase Connection
    const firebaseStart = Date.now();
    try {
      const testDoc = await adminDb.collection('_diagnostics').doc('test').get();
      diagnostics.push({
        name: 'Firebase Connection',
        status: 'success',
        message: 'Successfully connected to Firestore',
        duration: Date.now() - firebaseStart,
      });
    } catch (error) {
      diagnostics.push({
        name: 'Firebase Connection',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect to Firebase',
        details: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - firebaseStart,
      });
    }

    // 2. Check AI Configuration
    const aiStart = Date.now();
    try {
      const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
      const config = configDoc.data();
      
      if (!config) {
        diagnostics.push({
          name: 'AI Configuration',
          status: 'warning',
          message: 'AI chatbot not configured',
          duration: Date.now() - aiStart,
        });
      } else {
        const hasApiKey = config.provider === 'openai' 
          ? !!config.openaiApiKey 
          : !!config.anthropicApiKey;
        
        diagnostics.push({
          name: 'AI Configuration',
          status: hasApiKey ? 'success' : 'error',
          message: hasApiKey 
            ? `Configured with ${config.provider} (${config.model})`
            : `${config.provider} API key missing`,
          details: {
            provider: config.provider,
            model: config.model,
            hasApiKey,
            enabled: config.enabled,
          },
          duration: Date.now() - aiStart,
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'AI Configuration',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check AI config',
        duration: Date.now() - aiStart,
      });
    }

    // 3. Check WhatsApp/Twilio Configuration
    const twilioStart = Date.now();
    try {
      const whatsappDoc = await adminDb.collection('integrations').doc('whatsapp').get();
      const whatsappConfig = whatsappDoc.data();
      
      if (!whatsappConfig) {
        diagnostics.push({
          name: 'WhatsApp/Twilio Configuration',
          status: 'warning',
          message: 'WhatsApp integration not configured',
          duration: Date.now() - twilioStart,
        });
      } else {
        const isConfigured = !!whatsappConfig.accountSid && 
                            !!whatsappConfig.authToken && 
                            !!whatsappConfig.twilioWhatsAppNumber;
        
        diagnostics.push({
          name: 'WhatsApp/Twilio Configuration',
          status: isConfigured ? 'success' : 'error',
          message: isConfigured 
            ? 'Twilio WhatsApp configured'
            : 'Missing Twilio credentials',
          details: {
            hasAccountSid: !!whatsappConfig.accountSid,
            hasAuthToken: !!whatsappConfig.authToken,
            hasPhoneNumber: !!whatsappConfig.twilioWhatsAppNumber,
            phoneNumber: whatsappConfig.twilioWhatsAppNumber ? 
              whatsappConfig.twilioWhatsAppNumber.substring(0, 10) + '...' : null,
            enabled: whatsappConfig.enabled,
          },
          duration: Date.now() - twilioStart,
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'WhatsApp/Twilio Configuration',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check WhatsApp config',
        duration: Date.now() - twilioStart,
      });
    }

    // 4. Check recent webhook activity
    const webhookStart = Date.now();
    try {
      const logsSnapshot = await adminDb
        .collection('webhookLogs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      const logs = logsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          type: data.type,
          status: data.status,
          from: data.from ? data.from.substring(0, 10) + '...' : null,
          error: data.error,
        };
      });
      
      diagnostics.push({
        name: 'Webhook Activity',
        status: logs.length > 0 ? 'success' : 'warning',
        message: logs.length > 0 
          ? `Found ${logs.length} recent webhook logs`
          : 'No webhook logs found - webhooks may not be reaching the server',
        details: { recentLogs: logs },
        duration: Date.now() - webhookStart,
      });
    } catch (error) {
      diagnostics.push({
        name: 'Webhook Activity',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check webhook logs',
        duration: Date.now() - webhookStart,
      });
    }

    // 5. Environment Check
    diagnostics.push({
      name: 'Environment',
      status: 'success',
      message: `Running in ${process.env.NODE_ENV} mode`,
      details: {
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseCredentials: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
                                !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics,
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Test AI connection
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const { test } = body;

    if (test === 'ai') {
      // Test AI connection
      const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
      const config = configDoc.data();

      if (!config) {
        return NextResponse.json({ 
          success: false, 
          error: 'AI not configured' 
        });
      }

      const { provider, openaiApiKey, anthropicApiKey, model } = config;

      if (provider === 'openai' && openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: 'Say "test successful" in exactly 2 words.' }],
            max_tokens: 10,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return NextResponse.json({ 
            success: false, 
            error: error.error?.message || 'OpenAI API error',
            details: error,
          });
        }

        const data = await response.json();
        return NextResponse.json({ 
          success: true, 
          message: 'OpenAI connection successful',
          response: data.choices[0]?.message?.content,
        });
      }

      if (provider === 'anthropic' && anthropicApiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'claude-3-opus-20240229',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "test successful" in exactly 2 words.' }],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return NextResponse.json({ 
            success: false, 
            error: error.error?.message || 'Anthropic API error',
            details: error,
          });
        }

        const data = await response.json();
        return NextResponse.json({ 
          success: true, 
          message: 'Anthropic connection successful',
          response: data.content[0]?.text,
        });
      }

      return NextResponse.json({ 
        success: false, 
        error: 'No valid API key configured' 
      });
    }

    if (test === 'twilio') {
      // Test Twilio connection
      const whatsappDoc = await adminDb.collection('integrations').doc('whatsapp').get();
      const config = whatsappDoc.data();

      if (!config?.accountSid || !config?.authToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Twilio not configured' 
        });
      }

      // Test by fetching account info
      const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ 
          success: false, 
          error: error.message || 'Twilio API error',
          details: error,
        });
      }

      const data = await response.json();
      return NextResponse.json({ 
        success: true, 
        message: 'Twilio connection successful',
        details: {
          friendlyName: data.friendly_name,
          status: data.status,
          type: data.type,
        },
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid test type' 
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
