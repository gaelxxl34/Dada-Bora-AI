/**
 * API Route for testing AI connection
 * Tests OpenAI or Anthropic API based on configured provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get AI config from Firestore
    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json(
        { error: 'AI chatbot not configured. Please configure it in the dashboard first.' },
        { status: 400 }
      );
    }

    const { provider, openaiApiKey, anthropicApiKey, model, systemPrompt, temperature, maxTokens } = config;

    // Get the test message from request body (optional)
    const body = await request.json().catch(() => ({}));
    const testMessage = body.message || 'Hello! Can you briefly introduce yourself?';

    // Determine which API to use
    if (provider === 'openai') {
      if (!openaiApiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 400 }
        );
      }

      // Test OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: testMessage }
          ],
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('OpenAI API Error:', data);
        return NextResponse.json(
          { 
            error: data.error?.message || 'OpenAI API request failed',
            provider: 'openai',
            status: 'disconnected',
            details: data.error
          },
          { status: response.status }
        );
      }

      const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';
      
      return NextResponse.json({
        success: true,
        provider: 'openai',
        model: model || 'gpt-4-turbo-preview',
        status: 'connected',
        testMessage,
        response: aiResponse,
        usage: data.usage,
      });

    } else if (provider === 'anthropic') {
      if (!anthropicApiKey) {
        return NextResponse.json(
          { error: 'Anthropic API key not configured' },
          { status: 400 }
        );
      }

      // Test Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-opus-20240229',
          max_tokens: maxTokens || 500,
          system: systemPrompt,
          messages: [
            { role: 'user', content: testMessage }
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Anthropic API Error:', data);
        return NextResponse.json(
          { 
            error: data.error?.message || 'Anthropic API request failed',
            provider: 'anthropic',
            status: 'disconnected',
            details: data.error
          },
          { status: response.status }
        );
      }

      const aiResponse = data.content?.[0]?.text || 'No response generated';
      
      return NextResponse.json({
        success: true,
        provider: 'anthropic',
        model: model || 'claude-3-opus-20240229',
        status: 'connected',
        testMessage,
        response: aiResponse,
        usage: data.usage,
      });

    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error testing AI connection:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for quick health check
export async function GET() {
  try {
    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'AI chatbot not configured yet',
      });
    }

    return NextResponse.json({
      status: config.enabled ? 'enabled' : 'disabled',
      provider: config.provider,
      model: config.model,
      hasApiKey: config.provider === 'openai' 
        ? !!config.openaiApiKey 
        : !!config.anthropicApiKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
