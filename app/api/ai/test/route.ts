/**
 * API Route for testing AI connection
 * Tests OpenAI or Anthropic API based on configured provider
 * Includes knowledge base content for personalized responses
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, applyRateLimit } from '@/lib/auth-middleware';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

// Helper function to fetch knowledge base content
async function getKnowledgeBaseContent(): Promise<string> {
  try {
    const articlesSnapshot = await adminDb
      .collection('knowledgeArticles')
      .where('status', '==', 'published')
      .get();

    if (articlesSnapshot.empty) {
      return '';
    }

    const articles = articlesSnapshot.docs.map(doc => {
      const data = doc.data();
      return `## ${data.title}\nCategory: ${data.categoryName}\n${data.content}`;
    });

    return `\n\n---\n\nKNOWLEDGE BASE:\nThe following is your knowledge base containing verified information. Use this to provide accurate, consistent responses:\n\n${articles.join('\n\n---\n\n')}`;
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10 requests per minute)
    const rateLimitResult = applyRateLimit(request, 10, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

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

    // Fetch knowledge base content and combine with system prompt
    const knowledgeBaseContent = await getKnowledgeBaseContent();
    const enhancedSystemPrompt = systemPrompt + knowledgeBaseContent;

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
            { role: 'system', content: enhancedSystemPrompt },
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
          system: enhancedSystemPrompt,
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

  } catch (error: unknown) {
    console.error('Error testing AI connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for quick health check - minimal info, no sensitive data exposed
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = applyRateLimit(request, 30, 60000);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Require authentication for health check too
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const configDoc = await adminDb.collection('integrations').doc('chatbot').get();
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'AI chatbot not configured yet',
      });
    }

    // Don't expose sensitive info like API key existence to unauthenticated users
    return NextResponse.json({
      status: config.enabled ? 'enabled' : 'disabled',
      provider: config.provider,
      model: config.model,
      configured: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
