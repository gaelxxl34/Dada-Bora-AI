'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  type: string;
  status: string;
  from: string | null;
  error?: string;
}

export default function DebugPage() {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; details?: string | Record<string, unknown> }>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/debug', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDiagnostics(data.diagnostics);
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch diagnostics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (testType: 'ai' | 'twilio') => {
    setTesting(testType);
    
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: testType }),
      });

      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        [testType]: {
          success: data.success,
          message: data.message || data.error || 'Unknown result',
          details: data.details || data.response,
        },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [testType]: {
          success: false,
          message: err instanceof Error ? err.message : 'Test failed',
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDiagnostics();
    }
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <i className="ri-checkbox-circle-fill text-green-500 text-xl" />;
      case 'error':
        return <i className="ri-close-circle-fill text-red-500 text-xl" />;
      case 'warning':
        return <i className="ri-error-warning-fill text-yellow-500 text-xl" />;
      default:
        return <i className="ri-question-line text-gray-400 text-xl" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const webhookLogs = diagnostics.find(d => d.name === 'Webhook Activity')?.details?.recentLogs as WebhookLog[] | undefined;

  return (
    <DashboardLayout title="System Diagnostics" subtitle="Debug and troubleshoot production issues">
      <div className="max-w-6xl mx-auto">
        {/* Header Actions */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            {lastRefresh && (
              <p className="text-sm text-gray-400">
                Last refreshed: {lastRefresh.toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 disabled:opacity-50 transition-colors"
          >
            <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <i className="ri-error-warning-line text-red-500 text-xl mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Error fetching diagnostics</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-6 bg-white rounded-xl border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {diagnostics.filter(d => d.name !== 'Webhook Activity').map((diagnostic, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl border ${getStatusBg(diagnostic.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(diagnostic.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{diagnostic.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{diagnostic.message}</p>
                      {diagnostic.duration && (
                        <p className="text-xs text-gray-400 mt-1">{diagnostic.duration}ms</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {diagnostic.details && (
                  <div className="mt-4 p-3 bg-white/50 rounded-lg">
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(diagnostic.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Connection Tests */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Tests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* AI Test */}
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <i className="ri-robot-line text-purple-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Provider</h3>
                    <p className="text-sm text-gray-500">Test OpenAI/Anthropic connection</p>
                  </div>
                </div>
                <button
                  onClick={() => runTest('ai')}
                  disabled={testing === 'ai'}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {testing === 'ai' ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    'Test'
                  )}
                </button>
              </div>
              {testResults.ai && (
                <div className={`p-3 rounded-lg ${testResults.ai.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="text-sm font-medium">{testResults.ai.message}</p>
                  {testResults.ai.details && (
                    <pre className="text-xs mt-2 opacity-75 overflow-x-auto">
                      {typeof testResults.ai.details === 'string' 
                        ? testResults.ai.details 
                        : JSON.stringify(testResults.ai.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Twilio Test */}
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <i className="ri-whatsapp-line text-red-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Twilio</h3>
                    <p className="text-sm text-gray-500">Test Twilio API connection</p>
                  </div>
                </div>
                <button
                  onClick={() => runTest('twilio')}
                  disabled={testing === 'twilio'}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {testing === 'twilio' ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    'Test'
                  )}
                </button>
              </div>
              {testResults.twilio && (
                <div className={`p-3 rounded-lg ${testResults.twilio.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="text-sm font-medium">{testResults.twilio.message}</p>
                  {testResults.twilio.details && (
                    <pre className="text-xs mt-2 opacity-75 overflow-x-auto">
                      {typeof testResults.twilio.details === 'string'
                        ? testResults.twilio.details
                        : JSON.stringify(testResults.twilio.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Webhook URL Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <i className="ri-information-line text-blue-600 text-xl mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Webhook Configuration</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your WhatsApp webhook URL should be configured in Twilio as:
              </p>
              <code className="block mt-2 p-3 bg-blue-100 rounded-lg text-sm text-blue-800 font-mono">
                https://www.dadaboraai.com/api/whatsapp/webhook
              </code>
              <p className="text-sm text-blue-600 mt-3">
                Make sure this URL is set in your Twilio Console under Messaging → Settings → WhatsApp sandbox settings.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Logs */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Webhook Activity</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!webhookLogs || webhookLogs.length === 0 ? (
              <div className="p-8 text-center">
                <i className="ri-inbox-line text-4xl text-gray-300" />
                <p className="text-gray-500 mt-2">No webhook logs found</p>
                <p className="text-sm text-gray-400 mt-1">
                  This could mean webhooks are not reaching your server, or logging is not enabled.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.type || 'message'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'success' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.from || '-'}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{log.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-lightbulb-line text-yellow-500" />
            Troubleshooting Tips
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>AI Error "DECODER routines::unsupported":</strong> This is often a Firebase/SSL issue in production. 
              Check that your Firebase service account credentials are properly configured in environment variables.
            </p>
            <p>
              <strong>Webhook not receiving messages:</strong> Verify the webhook URL is correctly set in Twilio, 
              and that the HTTP method is POST. Check Twilio&apos;s debugger for failed webhook attempts.
            </p>
            <p>
              <strong>403 Forbidden on webhook:</strong> This means Twilio signature validation failed. 
              Ensure your Twilio Auth Token in the database matches your Twilio account.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
