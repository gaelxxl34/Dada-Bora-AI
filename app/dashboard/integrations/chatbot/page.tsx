'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost } from '@/lib/api-client';
import { DADA_VOICE_OPTIONS, DEFAULT_VOICE_ID } from '@/lib/elevenlabs';

interface ChatbotConfig {
  provider: 'openai' | 'anthropic';
  openaiApiKey: string;
  anthropicApiKey: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  model: string;
  lastUpdated?: Date;
  updatedBy?: string;
}

interface VoiceConfig {
  enabled: boolean;
  elevenLabsApiKey: string;
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  autoPlayResponses: boolean;
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_PROMPT = `You are DADA BORA — "Big Sister" in Swahili. You are the trusted, wise, warm older sister that every Black woman deserves but doesn't always have access to.

WHO YOU ARE:
You grew up watching your aunties, mothers, grandmothers, and the women in your community support each other through everything — births and heartbreaks, triumphs and trials. You carry that tradition of sisterhood forward. You understand the unique experiences of Black women across the diaspora — from Nairobi to Lagos, London to New York, Kingston to Paris.

YOUR PERSONALITY:
- Warm and nurturing, never cold or clinical
- Wise but accessible — you don't lecture, you share
- Cultural pride — you embrace African, Caribbean, and diaspora heritage
- Real talk — you're honest, even when it's hard
- Joyful — you find humor and light even in serious conversations
- Protective — you care deeply about women's wellbeing

YOUR VOICE:
- Use terms of endearment SPARINGLY — "dada", "love", "mama", "girl". Do NOT say "sis", "sister", or "queen" in every message. Talk like a real person.
- Share wisdom through stories and relatability, not lectures
- Show genuine curiosity about HER life — ask about her day, her week, what she's been up to
- NEVER say "How can I assist you?" or "How can I help you?" — instead ask natural questions like "So what's been going on?" or "Tell me about your day"
- Be direct but gentle when addressing hard topics
- Use emojis sparingly but meaningfully (💛🌸✨)

WHAT YOU NEVER DO:
- Sound like a generic chatbot or customer service agent
- Say "How can I assist you?" or "What can I do for you?" — real sisters don't talk like that  
- Call her "sis" or "sister" or "queen" in every message
- Give medical diagnoses (always encourage professional care)
- Dismiss or minimize feelings
- Judge lifestyle choices
- Ignore signs of crisis or danger

Always prioritize safety and encourage users to consult healthcare professionals for medical concerns. When you detect distress, respond with compassion first before offering solutions.`;

export default function ChatbotSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    enabled: false,
    elevenLabsApiKey: '',
    voiceId: DEFAULT_VOICE_ID,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.3,
    autoPlayResponses: true,
  });
  const [config, setConfig] = useState<ChatbotConfig>({
    provider: 'openai',
    openaiApiKey: '',
    anthropicApiKey: '',
    systemPrompt: DEFAULT_PROMPT,
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false,
    model: 'gpt-4o',
  });
  const [savedMessage, setSavedMessage] = useState('');
  
  // Test dialog state
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [testMessages]);

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'integrations', 'chatbot');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ChatbotConfig;
          setConfig(data);
        }

        // Load voice config
        const voiceDocRef = doc(db, 'config', 'voice');
        const voiceDocSnap = await getDoc(voiceDocRef);
        if (voiceDocSnap.exists()) {
          setVoiceConfig(prev => ({ ...prev, ...voiceDocSnap.data() as Partial<VoiceConfig> }));
        }
      } catch (error) {
        console.error('Error loading chatbot config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSavedMessage('');

    try {
      const docRef = doc(db, 'integrations', 'chatbot');
      await setDoc(docRef, {
        ...config,
        lastUpdated: Timestamp.now(),
        updatedBy: user.email,
      });

      // Save voice config separately
      const voiceDocRef = doc(db, 'config', 'voice');
      await setDoc(voiceDocRef, {
        ...voiceConfig,
        lastUpdated: Timestamp.now(),
        updatedBy: user.email,
      });

      setSavedMessage('✅ Configuration saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('Error saving chatbot config:', error);
      setSavedMessage('❌ Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testInput.trim() || testLoading) return;

    const userMessage = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setTestLoading(true);

    try {
      const data = await apiPost<{ response: string }>('/api/ai/test', { message: userMessage });

      if (data.success && data.response) {
        setTestMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setTestMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Error: ${data.error || 'Failed to get response'}` 
        }]);
      }
    } catch (error: any) {
      setTestMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message || 'Failed to connect to AI service'}` 
      }]);
    } finally {
      setTestLoading(false);
    }
  };

  const openTestDialog = () => {
    setTestMessages([]);
    setTestInput('');
    setShowTestDialog(true);
  };

  const resetToDefault = () => {
    if (confirm('Reset system prompt to default? This will overwrite your current prompt.')) {
      setConfig({ ...config, systemPrompt: DEFAULT_PROMPT });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSavedMessage('Copied to clipboard!');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout title="AI Chatbot Settings" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown"></div>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout
      title="AI Chatbot Settings"
      subtitle="Configure AI provider and chatbot personality"
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
        <div className={`mb-6 p-4 rounded-lg border ${config.enabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <i className={`text-2xl ${config.enabled ? 'ri-robot-fill text-green-600' : 'ri-robot-line text-amber-600'}`} />
            <div>
              <h3 className="font-semibold text-gray-900">
                {config.enabled ? 'AI Chatbot Active' : 'AI Chatbot Inactive'}
              </h3>
              <p className="text-sm text-gray-600">
                {config.enabled 
                  ? `Using ${config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} - ${config.model}` 
                  : 'Configure and enable the AI chatbot to start assisting users'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Message */}
        {savedMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {savedMessage}
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-6">
          {/* AI Provider Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-cpu-line text-warm-brown" />
              AI Provider
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setConfig({ ...config, provider: 'openai', model: 'gpt-4o' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.provider === 'openai'
                    ? 'border-warm-brown bg-cream-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    config.provider === 'openai' ? 'bg-warm-brown' : 'bg-gray-100'
                  }`}>
                    <i className={`ri-openai-fill text-2xl ${
                      config.provider === 'openai' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">OpenAI</h4>
                    <p className="text-xs text-gray-500">GPT-4, GPT-3.5</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setConfig({ ...config, provider: 'anthropic', model: 'claude-3-opus-20240229' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.provider === 'anthropic'
                    ? 'border-warm-brown bg-cream-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    config.provider === 'anthropic' ? 'bg-warm-brown' : 'bg-gray-100'
                  }`}>
                    <span className={`font-bold text-lg ${
                      config.provider === 'anthropic' ? 'text-white' : 'text-gray-600'
                    }`}>A</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">Anthropic</h4>
                    <p className="text-xs text-gray-500">Claude 3 Opus, Sonnet</p>
                  </div>
                </div>
              </button>
            </div>

            {/* API Keys */}
            <div className="space-y-4">
              {/* OpenAI API Key */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>OpenAI API Key</span>
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="text-xs text-warm-brown hover:underline"
                  >
                    {showOpenAIKey ? 'Hide' : 'Show'} Key
                  </button>
                </label>
                <input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-warm-brown hover:underline">OpenAI Platform</a>
                </p>
              </div>

              {/* Anthropic API Key */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Anthropic API Key</span>
                  <button
                    type="button"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    className="text-xs text-warm-brown hover:underline"
                  >
                    {showAnthropicKey ? 'Hide' : 'Show'} Key
                  </button>
                </label>
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={config.anthropicApiKey}
                  onChange={(e) => setConfig({ ...config, anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-warm-brown hover:underline">Anthropic Console</a>
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                >
                  {config.provider === 'openai' ? (
                    <>
                      <option value="gpt-4o">GPT-4o (Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Balanced)</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* System Prompt / Personality */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="ri-empathize-line text-warm-brown" />
                Dada Bora Personality
              </h3>
              <button
                onClick={resetToDefault}
                className="text-sm text-warm-brown hover:underline flex items-center gap-1"
              >
                <i className="ri-restart-line" />
                Reset to Default
              </button>
            </div>
            
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent font-mono text-sm"
              placeholder="Define the chatbot's personality, tone, and behavior..."
            />
            <p className="text-xs text-gray-500 mt-2">
              This system prompt defines how Dada Bora interacts with users. Be specific about tone, knowledge areas, and boundaries.
            </p>
          </div>

          {/* Fine-tuning Parameters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-settings-4-line text-warm-brown" />
              Fine-tuning Parameters
            </h3>
            
            <div className="space-y-4">
              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Temperature
                  </label>
                  <span className="text-sm font-semibold text-warm-brown">
                    {config.temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise (0)</span>
                  <span>Balanced (1)</span>
                  <span>Creative (2)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Lower values make responses more focused and deterministic. Higher values increase creativity and variation.
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Response Length (tokens)
                </label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum length of AI responses. ~1 token ≈ 0.75 words. Recommended: 500-1500 tokens.
                </p>
              </div>
            </div>
          </div>

          {/* Voice Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-mic-line text-warm-brown" />
              Voice (ElevenLabs TTS)
            </h3>
            
            <div className="space-y-4">
              {/* Enable Voice */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Enable Voice</p>
                  <p className="text-xs text-gray-500">Let users hear Dada&apos;s responses spoken aloud</p>
                </div>
                <button
                  onClick={() => setVoiceConfig({ ...voiceConfig, enabled: !voiceConfig.enabled })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    voiceConfig.enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      voiceConfig.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {voiceConfig.enabled && (
                <>
                  {/* ElevenLabs API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ElevenLabs API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showElevenLabsKey ? 'text' : 'password'}
                        value={voiceConfig.elevenLabsApiKey}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, elevenLabsApiKey: e.target.value })}
                        placeholder="Enter your ElevenLabs API key"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                      />
                      <button
                        onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <i className={showElevenLabsKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key at{' '}
                      <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-warm-brown hover:underline">
                        elevenlabs.io
                      </a>
                    </p>
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dada&apos;s Voice
                    </label>
                    <select
                      value={voiceConfig.voiceId}
                      onChange={(e) => setVoiceConfig({ ...voiceConfig, voiceId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                    >
                      {DADA_VOICE_OPTIONS.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} — {voice.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose a voice that feels right for Dada. You can also use a custom voice ID from ElevenLabs.
                    </p>
                  </div>

                  {/* Voice Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">Stability</label>
                        <span className="text-xs font-semibold text-warm-brown">{voiceConfig.stability.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voiceConfig.stability}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, stability: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Expressive</span>
                        <span>Stable</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">Clarity</label>
                        <span className="text-xs font-semibold text-warm-brown">{voiceConfig.similarityBoost.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voiceConfig.similarityBoost}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, similarityBoost: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Natural</span>
                        <span>Clear</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">Style</label>
                        <span className="text-xs font-semibold text-warm-brown">{voiceConfig.style.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voiceConfig.style}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, style: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Neutral</span>
                        <span>Expressive</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-play setting */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Auto-play responses</p>
                      <p className="text-xs text-gray-500">Automatically speak Dada&apos;s replies in voice mode</p>
                    </div>
                    <button
                      onClick={() => setVoiceConfig({ ...voiceConfig, autoPlayResponses: !voiceConfig.autoPlayResponses })}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        voiceConfig.autoPlayResponses ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          voiceConfig.autoPlayResponses ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enable/Disable Integration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enable AI Chatbot</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Turn on to activate AI-powered responses
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
              onClick={openTestDialog}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="ri-message-3-line" />
              Test Chatbot
            </button>
          </div>
        </div>
      </div>

      {/* Test Chat Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warm-brown rounded-full flex items-center justify-center">
                  <i className="ri-robot-fill text-white text-lg" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Test AI Chatbot</h3>
                  <p className="text-xs text-gray-500">
                    {config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} • {config.model}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestDialog(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <i className="ri-close-line text-xl text-gray-500" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
              {testMessages.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <i className="ri-chat-3-line text-4xl mb-2" />
                  <p>Send a message to test the AI</p>
                  <p className="text-xs mt-1">Using your configured system prompt</p>
                </div>
              )}
              
              {testMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-warm-brown text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTestSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type a message to test..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
                  disabled={testLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!testInput.trim() || testLoading}
                  className="w-10 h-10 bg-warm-brown text-white rounded-full flex items-center justify-center hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-send-plane-fill" />
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-2">
                This is a test conversation. Messages are not saved.
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
