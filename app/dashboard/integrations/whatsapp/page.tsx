'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost } from '@/lib/api-client';

interface TwilioWhatsAppConfig {
  accountSid: string;
  authToken: string;
  twilioWhatsAppNumber: string; // Twilio sandbox or registered number
  webhookUrl: string;
  enabled: boolean;
  sandboxMode: boolean; // Track if using sandbox
  validateSignature: boolean; // Whether to validate Twilio signatures
  lastUpdated?: Date;
  updatedBy?: string;
  connectionStatus?: 'connected' | 'disconnected';
}

export default function WhatsAppIntegrationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<TwilioWhatsAppConfig>({
    accountSid: '',
    authToken: '',
    twilioWhatsAppNumber: '',
    webhookUrl: '',
    enabled: false,
    sandboxMode: true,
    validateSignature: false,
  });
  const [savedMessage, setSavedMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'integrations', 'whatsapp');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as TwilioWhatsAppConfig;
          setConfig({
            accountSid: data.accountSid || '',
            authToken: data.authToken || '',
            twilioWhatsAppNumber: data.twilioWhatsAppNumber || '',
            webhookUrl: data.webhookUrl || '',
            enabled: data.enabled || false,
            sandboxMode: data.sandboxMode ?? true,
            validateSignature: data.validateSignature || false,
            connectionStatus: data.connectionStatus,
          });
          
          // Set connection status if available
          if (data.connectionStatus) {
            setConnectionStatus(data.connectionStatus as 'connected' | 'disconnected');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading Twilio WhatsApp config:', error);
        setLoading(false);
      }
    };

    if (user) {
      loadConfig();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSavedMessage('');

    try {
      const docRef = doc(db, 'integrations', 'whatsapp');
      await setDoc(docRef, {
        accountSid: config.accountSid,
        authToken: config.authToken,
        twilioWhatsAppNumber: config.twilioWhatsAppNumber,
        webhookUrl: config.webhookUrl,
        enabled: config.enabled,
        sandboxMode: config.sandboxMode,
        validateSignature: config.validateSignature,
        connectionStatus: config.connectionStatus || 'unknown',
        lastUpdated: Timestamp.now(),
        updatedBy: user.email,
      });

      setSavedMessage('✅ Configuration saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('Error saving Twilio WhatsApp config:', error);
      setSavedMessage('❌ Error saving configuration. Please try again.');
      setTimeout(() => setSavedMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    console.log('Test button clicked');
    console.log('Current config:', config);
    
    if (!config.accountSid || !config.authToken || !config.twilioWhatsAppNumber) {
      console.log('Missing credentials');
      setSavedMessage('❌ Please fill in Account SID, Auth Token, and WhatsApp Number first');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    setTestingConnection(true);
    setSavedMessage('Testing connection...');
    console.log('Starting connection test...');

    try {
      // Test by fetching account info from Twilio API
      console.log('Verifying credentials with Twilio API...');
      const credentials = btoa(`${config.accountSid}:${config.authToken}`);
      const verifyResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
          },
        }
      );

      const verifyData = await verifyResponse.json();
      console.log('Verification response:', verifyData);
      console.log('Response status:', verifyResponse.status);

      if (verifyResponse.ok) {
        setConnectionStatus('connected');
        
        // Update the config with connected status
        const docRef = doc(db, 'integrations', 'whatsapp');
        await setDoc(docRef, {
          ...config,
          connectionStatus: 'connected',
          lastTested: Timestamp.now(),
        }, { merge: true });

        setSavedMessage(`✅ Connected to Twilio! Sending test message...`);
        
        // Now send a test message via our API
        const testNumber = '256726455053'; // Your sandbox participant number
        const sendData = await apiPost<{ messageSid: string }>('/api/whatsapp/send', {
          to: testNumber,
          message: '🎉 Test message from Dada Bora! Your WhatsApp integration is working perfectly.',
        });

        console.log('Send response:', sendData);

        if (sendData.success) {
          setSavedMessage(`✅ Connected & test message sent! SID: ${sendData.messageSid}. Check WhatsApp on +256 726 455 053.`);
        } else {
          setSavedMessage(`✅ Connected to Twilio, but message failed: ${sendData.error || 'Unknown error'}. Make sure the number has joined your sandbox.`);
        }
        
      } else {
        setConnectionStatus('disconnected');
        
        console.error('Full verification response:', verifyData);
        
        let userMessage = `❌ Connection failed: ${verifyData.message || 'Invalid credentials'}. `;
        
        if (verifyResponse.status === 401) {
          userMessage += 'Please check your Account SID and Auth Token in the Twilio Console.';
        } else if (verifyResponse.status === 404) {
          userMessage += 'Account not found. Please verify your Account SID.';
        }
        
        setSavedMessage(userMessage);
      }
    } catch (error: any) {
      setConnectionStatus('disconnected');
      setSavedMessage(`❌ Connection test failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
      setTimeout(() => setSavedMessage(''), 8000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSavedMessage('Copied to clipboard!');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout title="WhatsApp Integration" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="WhatsApp Integration (Twilio)"
      subtitle="Configure Twilio WhatsApp Sandbox or Business settings"
    >
      <div className="max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-warm-brown transition-colors"
        >
          <i className="ri-arrow-left-line" />
          <span>Back to Settings</span>
        </button>

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${
          connectionStatus === 'connected' 
            ? 'bg-green-50 border-green-200' 
            : connectionStatus === 'disconnected'
            ? 'bg-red-50 border-red-200'
            : config.enabled 
            ? 'bg-green-50 border-green-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <i className={`text-2xl ${
              connectionStatus === 'connected'
                ? 'ri-checkbox-circle-fill text-green-600'
                : connectionStatus === 'disconnected'
                ? 'ri-close-circle-fill text-red-600'
                : config.enabled 
                ? 'ri-checkbox-circle-fill text-green-600' 
                : 'ri-error-warning-fill text-amber-600'
            }`} />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {connectionStatus === 'connected' 
                  ? `✅ Connected to Twilio ${config.sandboxMode ? '(Sandbox)' : '(Production)'}` 
                  : connectionStatus === 'disconnected'
                  ? '❌ Connection Failed'
                  : config.enabled 
                  ? 'WhatsApp Integration Active' 
                  : 'WhatsApp Integration Inactive'}
              </h3>
              <p className="text-sm text-gray-600">
                {connectionStatus === 'connected'
                  ? 'Your Twilio credentials are valid and WhatsApp is ready to receive messages.'
                  : connectionStatus === 'disconnected'
                  ? 'Unable to connect to Twilio. Please check your credentials and try again.'
                  : config.enabled 
                  ? 'Integration is enabled. Test the connection to verify credentials.' 
                  : 'Complete the configuration below and enable the integration to start receiving messages.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sandbox Mode Banner */}
        {config.sandboxMode && (
          <div className="mb-6 p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-3">
              <i className="ri-flask-line text-2xl text-purple-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">🧪 Sandbox Mode</h3>
                <p className="text-sm text-gray-600">
                  You're using the Twilio WhatsApp Sandbox. Users must opt-in by sending your sandbox code to the sandbox number before they can receive messages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Message - Directly below enable toggle */}
        {savedMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            savedMessage.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : savedMessage.includes('❌') 
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start gap-3">
              <i className={`text-xl ${
                savedMessage.includes('✅') ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'
              }`} />
              <p className="flex-1">{savedMessage}</p>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-6">
          {/* Webhook URL */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-webhook-line text-warm-brown" />
              Webhook Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL (for Twilio Console)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    placeholder="https://yourdomain.com/api/whatsapp/webhook"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                  />
                  <button
                    onClick={() => copyToClipboard(config.webhookUrl)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={!config.webhookUrl}
                  >
                    <i className="ri-file-copy-line" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Paste this URL in Twilio Console → Messaging → Try it out → WhatsApp → Sandbox settings → "WHEN A MESSAGE COMES IN"
                </p>
              </div>
            </div>
          </div>

          {/* Twilio Credentials */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-key-2-line text-red-600" />
              Twilio API Credentials
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account SID
                </label>
                <input
                  type="text"
                  value={config.accountSid}
                  onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in Twilio Console Dashboard → Account Info → Account SID
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Auth Token</span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-xs text-warm-brown hover:underline"
                  >
                    {showToken ? 'Hide' : 'Show'} Token
                  </button>
                </label>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.authToken}
                  onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                  placeholder="Your Twilio Auth Token"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in Twilio Console Dashboard → Account Info → Auth Token (click to reveal)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twilio WhatsApp Number
                </label>
                <input
                  type="text"
                  value={config.twilioWhatsAppNumber}
                  onChange={(e) => setConfig({ ...config, twilioWhatsAppNumber: e.target.value })}
                  placeholder="+19405003523"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {config.sandboxMode 
                    ? 'Sandbox number: +1 (940) 500-3523 (or check your Twilio Sandbox settings)'
                    : 'Your registered Twilio WhatsApp Business number'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sandbox Mode</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enable for testing with Twilio WhatsApp Sandbox
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, sandboxMode: !config.sandboxMode })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  config.sandboxMode ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    config.sandboxMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-information-line text-blue-600" />
              Twilio WhatsApp Sandbox Setup
            </h3>
            
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">1</span>
                <span>Go to <strong>Twilio Console</strong> → Messaging → Try it out → Send a WhatsApp message</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">2</span>
                <span>Note your <strong>Sandbox number</strong> and <strong>join code</strong> (e.g., "join sandbox-name")</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">3</span>
                <span>Users must send your join code to the sandbox number to opt-in</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">4</span>
                <span>Go to <strong>Sandbox settings</strong> and paste your webhook URL in "WHEN A MESSAGE COMES IN"</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">5</span>
                <span>Copy your <strong>Account SID</strong> and <strong>Auth Token</strong> from Twilio Console dashboard</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-xs">6</span>
                <span>Paste the credentials above, save, and enable the integration</span>
              </li>
            </ol>

            <a
              href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm text-warm-brown hover:underline"
            >
              <i className="ri-external-link-line" />
              Open Twilio WhatsApp Sandbox
            </a>
          </div>

          {/* Enable/Disable Integration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enable Integration</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Turn on to start receiving WhatsApp messages via Twilio
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-warm-brown text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </span>
              ) : (
                'Save Configuration'
              )}
            </button>
            <button
              onClick={handleTest}
              disabled={testingConnection}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  Testing...
                </>
              ) : (
                <>
                  <i className="ri-pulse-line" />
                  Test Connection
                </>
              )}
            </button>
            <button
              onClick={() => router.push('/dashboard/chat')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <i className="ri-chat-3-line" />
              View Chats
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
