'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { chatTranslations, detectBrowserLanguage, type ChatLanguage } from '@/lib/chat-translations';

// Dynamically import AR viewer — client-side only (camera, WebXR, model-viewer)
const DadaBoraARViewer = dynamic(() => import('@/components/DadaBoraARViewer'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Loading AR Experience...</p>
      </div>
    </div>
  ),
});

// Types
interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: string;
  source?: string;
}

interface SessionData {
  sessionId: string;
  phoneNumber: string;
  chatId: string;
  anonymousName: string;
  expiresAt: string;
}

type ViewState = 'phone' | 'pin' | 'create-pin' | 'chat';

export default function WebChatPage() {
  // State
  const [view, setView] = useState<ViewState>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
  const [pinCode, setPinCode] = useState(['', '', '', '']);
  const [confirmPinCode, setConfirmPinCode] = useState(['', '', '', '']);
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [isLegacyUser, setIsLegacyUser] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatInfo, setChatInfo] = useState<{anonymousName?: string; location?: {country?: string}} | null>(null);
  
  // AR state
  const [arActive, setArActive] = useState(false);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // Language state
  const [lang, setLang] = useState<ChatLanguage>('en');
  const t = useMemo(() => chatTranslations[lang], [lang]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect browser language on mount
  useEffect(() => {
    setLang(detectBrowserLanguage());
  }, []);

  // Check if browser supports speech recognition & mic permission
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
    // Check mic permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
        result.onchange = () => setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
      }).catch(() => setMicPermission('unknown'));
    }
  }, []);

  // Check if voice (TTS) is enabled on the server
  useEffect(() => {
    const checkVoice = async () => {
      try {
        const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'test' }) });
        // 503 means no ElevenLabs API key configured
        // 200 means it works (we get audio back)
        setVoiceEnabled(res.ok);
      } catch {
        setVoiceEnabled(false);
      }
    };
    checkVoice();
  }, []);

  // Play Dada's response as audio
  const playAudioResponse = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      setIsPlaying(true);
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sessionId: session?.sessionId,
        }),
      });

      if (!response.ok) {
        // Silently skip if voice not configured (503) or other error
        if (response.status !== 503) {
          console.error('TTS failed:', response.status);
        }
        setIsPlaying(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Audio playback failed:', err);
      setIsPlaying(false);
    }
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  // Start speech recognition
  const startRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Check permission state first
    let permState: string | null = null;
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permState = result.state;
    } catch { /* permissions API not supported */ }

    // If already denied, tell user how to fix it — getUserMedia won't re-prompt
    if (permState === 'denied') {
      setMicPermission('denied');
      setError(t.micBlocked);
      return;
    }

    // Request mic access — browser will prompt if state is "prompt"
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (err: unknown) {
      console.error('Microphone permission error:', err);
      setMicPermission('denied');
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError') {
        setError(t.micDenied);
      } else if (errName === 'NotFoundError') {
        setError(t.noMic);
      } else {
        setError(t.micError);
      }
      return;
    }

    // Stop any playing audio first
    stopAudio();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNewMessage(transcript);
      
      // Auto-send when speech recognition gives a final result
      if (event.results[event.results.length - 1].isFinal) {
        // Small delay to let the state update
        setTimeout(() => {
          setNewMessage(prev => {
            if (prev.trim()) {
              handleVoiceSend(prev.trim());
            }
            return '';
          });
        }, 300);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setMicPermission('denied');
        setError(t.micAccessDenied);
      }
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Stop speech recognition
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Handle sending a voice message (called after speech recognition completes)
  const handleVoiceSend = async (messageContent: string) => {
    if (!messageContent || !session || loading) return;

    setLoading(true);

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      isFromUser: true,
      timestamp: new Date().toISOString(),
      source: 'web-voice',
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          message: messageContent,
          language: lang,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          isFromUser: false,
          timestamp: new Date().toISOString(),
          source: 'web',
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Auto-play the response in voice mode
        playAudioResponse(data.response);
      } else if (data.error) {
        if (response.status === 401) {
          localStorage.removeItem('dada_session');
          setSession(null);
          setView('phone');
          setError(t.sessionExpired);
        } else {
          setError(data.error);
        }
      }
    } catch {
      setError(t.failedSend);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session on load
  useEffect(() => {
    const savedSession = localStorage.getItem('dada_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession) as SessionData;
      // Check if session is still valid
      if (new Date(sessionData.expiresAt) > new Date()) {
        validateExistingSession(sessionData);
      } else {
        localStorage.removeItem('dada_session');
      }
    }
  }, []);

  // Validate existing session
  const validateExistingSession = async (sessionData: SessionData) => {
    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          sessionId: sessionData.sessionId,
        }),
      });

      const data = await response.json();
      
      if (data.valid) {
        setSession(sessionData);
        setView('chat');
        loadChatHistory(sessionData.sessionId);
      } else {
        localStorage.removeItem('dada_session');
      }
    } catch {
      localStorage.removeItem('dada_session');
    }
  };

  // Load chat history
  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/web?sessionId=${sessionId}&limit=50`);
      const data = await response.json();
      
      if (data.messages) {
        setMessages(data.messages);
        setChatInfo({
          anonymousName: data.anonymousName,
          location: data.location,
        });
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Check phone and route to PIN or Create PIN view
  const handleCheckPhone = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-phone', phoneNumber }),
      });

      const data = await response.json();

      if (data.exists) {
        if (data.hasPin) {
          // Existing user with PIN — go to PIN login
          setView('pin');
          setPinCode(['', '', '', '']);
          setTimeout(() => pinRefs.current[0]?.focus(), 100);
        } else {
          // Legacy user without PIN — set up PIN
          setIsLegacyUser(true);
          setView('create-pin');
          setPinCode(['', '', '', '']);
          setConfirmPinCode(['', '', '', '']);
          setIsConfirmingPin(false);
          setTimeout(() => pinRefs.current[0]?.focus(), 100);
        }
      } else {
        // New user — create account with PIN
        setIsLegacyUser(false);
        setView('create-pin');
        setPinCode(['', '', '', '']);
        setConfirmPinCode(['', '', '', '']);
        setIsConfirmingPin(false);
        setTimeout(() => pinRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError(t.failedOtp);
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN input
  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    const setter = isConfirm ? setConfirmPinCode : setPinCode;
    setter(prev => {
      const newPin = [...prev];
      newPin[index] = value.slice(-1);
      return newPin;
    });
    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    if (e.key === 'Backspace' && index > 0) {
      const code = isConfirm ? confirmPinCode : pinCode;
      if (!code[index]) {
        refs.current[index - 1]?.focus();
      }
    }
  };

  // Login with PIN
  const handlePinLogin = async () => {
    setError('');
    setLoading(true);

    const pin = pinCode.join('');

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', phoneNumber, pin }),
      });

      const data = await response.json();

      if (data.success && data.session) {
        handleAuthSuccess(data.session);
      } else if (data.error === 'INVALID_PIN') {
        setError(t.invalidPin);
        setPinCode(['', '', '', '']);
        setTimeout(() => pinRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || t.verificationFailed);
      }
    } catch {
      setError(t.verificationFailed);
    } finally {
      setLoading(false);
    }
  };

  // Create PIN (new user or legacy user)
  const handleCreatePin = async () => {
    setError('');

    if (!isConfirmingPin) {
      // First entry — move to confirm
      setIsConfirmingPin(true);
      setConfirmPinCode(['', '', '', '']);
      setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
      return;
    }

    // Check PINs match
    const pin = pinCode.join('');
    const confirmPin = confirmPinCode.join('');

    if (pin !== confirmPin) {
      setError(t.pinMismatch);
      setConfirmPinCode(['', '', '', '']);
      setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
      return;
    }

    setLoading(true);

    try {
      const action = isLegacyUser ? 'set-pin' : 'register';
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phoneNumber, pin }),
      });

      const data = await response.json();

      if (data.success && data.session) {
        handleAuthSuccess(data.session);
      } else if (data.error === 'PHONE_ALREADY_REGISTERED') {
        setError(t.phoneRegistered);
      } else {
        setError(data.error || t.verificationFailed);
      }
    } catch {
      setError(t.verificationFailed);
    } finally {
      setLoading(false);
    }
  };

  // Common auth success handler
  const handleAuthSuccess = (sessionResponse: { sessionId: string; chatId: string; anonymousName: string; isNew: boolean; expiresAt: string }) => {
    const sessionData: SessionData = {
      sessionId: sessionResponse.sessionId,
      phoneNumber: phoneNumber || '',
      chatId: sessionResponse.chatId,
      anonymousName: sessionResponse.anonymousName,
      expiresAt: sessionResponse.expiresAt,
    };
    
    localStorage.setItem('dada_session', JSON.stringify(sessionData));
    setSession(sessionData);
    setChatInfo({ anonymousName: sessionResponse.anonymousName });
    setView('chat');
    
    if (sessionResponse.isNew) {
      setMessages([{
        id: 'welcome',
        content: t.welcomeMessage,
        isFromUser: false,
        timestamp: new Date().toISOString(),
      }]);
    } else {
      loadChatHistory(sessionResponse.sessionId);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || loading) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      isFromUser: true,
      timestamp: new Date().toISOString(),
      source: 'web',
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          message: messageContent,
          language: lang,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Add AI response
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          isFromUser: false,
          timestamp: new Date().toISOString(),
          source: 'web',
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Play audio if voice is enabled
        if (voiceEnabled) {
          playAudioResponse(data.response);
        }
      } else if (data.error) {
        // Handle session expiry
        if (response.status === 401) {
          localStorage.removeItem('dada_session');
          setSession(null);
          setView('phone');
          setError(t.sessionExpired);
        } else {
          setError(data.error);
        }
      }
    } catch {
      setError(t.failedSend);
    } finally {
      setLoading(false);
    }
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Logout
  const handleLogout = async () => {
    if (session) {
      try {
        await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'logout',
            sessionId: session.sessionId,
          }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    
    localStorage.removeItem('dada_session');
    setSession(null);
    setMessages([]);
    setView('phone');
  };

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[100dvh] bg-cream-50 flex flex-col overflow-hidden">
      {/* Header — compact on mobile like WhatsApp */}
      <header className="bg-warm-brown text-white px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between flex-shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-2.5">
          {view === 'chat' && (
            <button onClick={handleLogout} className="p-1 -ml-1 text-white/70 hover:text-white sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gold bg-cream-50 flex-shrink-0">
            <Image
              src="/dada-bora.png"
              alt="Dada Bora"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-playfair font-bold text-base sm:text-lg leading-tight">Dada Bora</h1>
            {view === 'chat' && chatInfo?.anonymousName ? (
              <p className="text-[11px] sm:text-xs text-gold/80 truncate">
                {chatInfo.anonymousName}{chatInfo.location?.country ? ` • ${chatInfo.location.country}` : ''}
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs text-gold">{t.tagline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {session && (
            <button
              onClick={() => setArActive(true)}
              className="p-1.5 text-gold/80 hover:text-gold transition-colors"
              title="Meet Dada Bora in AR"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
          )}
          {session && (
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors px-2.5 py-1 rounded-full border border-white/30 hover:border-white/60 hidden sm:block"
            >
              {t.endChat}
            </button>
          )}
          {session && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-white/70 hover:text-white sm:hidden"
              title={t.endChat}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-2xl mx-auto sm:mx-auto" style={{ maxWidth: 'min(672px, 100%)' }}>
        {/* Phone Number View */}
        {view === 'phone' && (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 w-full max-w-md border border-gray-100">
              <div className="text-center mb-5 sm:mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gold mx-auto mb-3 bg-cream-50">
                  <Image
                    src="/dada-bora.png"
                    alt="Dada Bora"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-warm-brown mb-1.5">{t.greeting}</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  {t.phoneSubtitle}
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-earth">
                  {t.phoneLabel}
                </label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="phone-input-custom"
                />

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleCheckPhone}
                  disabled={loading || !phoneNumber || phoneNumber.length < 8}
                  className="w-full py-3.5 bg-warm-brown text-white rounded-full font-semibold hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? t.sending : t.continueBtn}
                </button>

                <p className="text-xs text-center text-gray-500">
                  {t.phoneDisclaimer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PIN Login View */}
        {view === 'pin' && (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 w-full max-w-md border border-gray-100">
              <div className="text-center mb-5 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 flex items-center justify-center text-4xl mx-auto mb-3">
                  🔐
                </div>
                <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-warm-brown mb-1.5">{t.enterPin}</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  {t.enterPinSubtitle}<br />
                  <span className="font-semibold text-earth">{phoneNumber}</span>
                </p>
              </div>

              <div className="space-y-5">
                <label className="block text-sm font-medium text-earth text-center">{t.pinLabel}</label>
                <div className="flex justify-center gap-3 sm:gap-4">
                  {pinCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { pinRefs.current[index] = el }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handlePinLogin}
                  disabled={loading || pinCode.some(d => !d)}
                  className="w-full py-3.5 bg-warm-brown text-white rounded-full font-semibold hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? t.verifying : t.loginBtn}
                </button>

                <button
                  onClick={() => { setView('phone'); setError(''); setPinCode(['', '', '', '']); }}
                  className="w-full text-sm text-earth hover:text-warm-brown transition-colors"
                >
                  {t.differentNumber}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create PIN View */}
        {view === 'create-pin' && (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 w-full max-w-md border border-gray-100">
              <div className="text-center mb-5 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 flex items-center justify-center text-4xl mx-auto mb-3">
                  {isConfirmingPin ? '✅' : '🔑'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-warm-brown mb-1.5">
                  {isConfirmingPin ? t.confirmPin : (isLegacyUser ? t.setupPin : t.createPin)}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  {isConfirmingPin ? t.confirmPin : (isLegacyUser ? t.setupPinSubtitle : t.createPinSubtitle)}
                </p>
              </div>

              <div className="space-y-5">
                {!isConfirmingPin ? (
                  <>
                    <label className="block text-sm font-medium text-earth text-center">{t.pinLabel}</label>
                    <div className="flex justify-center gap-3 sm:gap-4">
                      {pinCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { pinRefs.current[index] = el }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold"
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-earth text-center">{t.confirmPin}</label>
                    <div className="flex justify-center gap-3 sm:gap-4">
                      {confirmPinCode.map((digit, index) => (
                        <input
                          key={`confirm-${index}`}
                          ref={(el) => { confirmPinRefs.current[index] = el }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value, true)}
                          onKeyDown={(e) => handlePinKeyDown(index, e, true)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold"
                        />
                      ))}
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleCreatePin}
                  disabled={loading || (isConfirmingPin ? confirmPinCode.some(d => !d) : pinCode.some(d => !d))}
                  className="w-full py-3.5 bg-warm-brown text-white rounded-full font-semibold hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? t.verifying : (isConfirmingPin ? t.startChatBtn : t.continueBtn)}
                </button>

                <button
                  onClick={() => { 
                    setView('phone'); 
                    setError(''); 
                    setPinCode(['', '', '', '']); 
                    setConfirmPinCode(['', '', '', '']);
                    setIsConfirmingPin(false);
                  }}
                  className="w-full text-sm text-earth hover:text-warm-brown transition-colors"
                >
                  {t.differentNumber}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat View — WhatsApp-style layout */}
        {view === 'chat' && (
          <>
            {/* Messages area — fills remaining space, scrollable */}
            <div 
              className="flex-1 overflow-y-auto px-2.5 py-3 sm:px-4 sm:py-4"
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4a84b\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                backgroundColor: '#f5f0eb'
              }}
            >
              {/* Date separator for first message */}
              {messages.length > 0 && (
                <div className="flex justify-center mb-3">
                  <span className="text-[10px] sm:text-xs bg-white/80 text-gray-500 px-3 py-0.5 rounded-full shadow-sm">
                    {new Date(messages[0].timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Dada Bora Avatar for AI messages — smaller on mobile */}
                    {!message.isFromUser && (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-gold/50 mr-1.5 flex-shrink-0 mt-0.5">
                        <Image
                          src="/dada-bora.png"
                          alt="Dada Bora"
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`relative max-w-[82%] sm:max-w-[70%] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm ${
                        message.isFromUser
                          ? 'bg-warm-brown text-white rounded-tr-none'
                          : 'bg-white text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {/* WhatsApp-style message tail */}
                      <div className={`absolute top-0 w-2 h-2 ${
                        message.isFromUser 
                          ? '-right-1 bg-warm-brown' 
                          : '-left-1 bg-white'
                      }`} style={{
                        clipPath: message.isFromUser 
                          ? 'polygon(0 0, 0 100%, 100% 0)' 
                          : 'polygon(0 0, 100% 0, 100% 100%)'
                      }} />
                      <p className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed">{message.content}</p>
                      <div className={`flex items-center gap-1.5 mt-0.5 ${message.isFromUser ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] leading-none ${
                          message.isFromUser ? 'text-white/60' : 'text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                        {/* Play button for AI messages when voice is enabled */}
                        {!message.isFromUser && voiceEnabled && (
                          <button
                            onClick={() => {
                              if (isPlaying) {
                                stopAudio();
                              } else {
                                playAudioResponse(message.content);
                              }
                            }}
                            className="text-gold hover:text-warm-brown transition-colors -mr-0.5"
                            title={t.playVoice}
                          >
                            {isPlaying ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {loading && messages.length > 0 && messages[messages.length - 1].isFromUser && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-gold/50 mr-1.5 flex-shrink-0">
                      <Image
                        src="/dada-bora.png"
                        alt="Dada Bora"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-white shadow-sm rounded-lg rounded-tl-none px-3 py-2.5 relative">
                      <div className="absolute top-0 -left-1 w-2 h-2 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Input area — compact, sticks to bottom like WhatsApp */}
            <div className="flex-shrink-0 bg-cream-50 border-t border-gray-200/80 px-2 py-1.5 sm:px-3 sm:py-2 pb-[env(safe-area-inset-bottom,6px)]">
              {error && (
                <p className="text-red-500 text-xs mb-1.5 bg-red-50 p-2 rounded-lg whitespace-pre-line">{error}</p>
              )}
              
              {/* Recording overlay */}
              {isRecording && (
                <div className="flex items-center justify-center gap-2 mb-1.5 py-2 bg-red-50 rounded-xl border border-red-200">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <div className="flex space-x-0.5">
                    <div className="w-0.5 h-3 bg-red-400 rounded-full animate-pulse" />
                    <div className="w-0.5 h-5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="w-0.5 h-2.5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-0.5 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="w-0.5 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                    <div className="w-0.5 h-5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  </div>
                  <span className="text-xs text-red-600 font-medium">{t.listening}</span>
                  <button 
                    onClick={stopRecording} 
                    className="ml-1 px-2 py-0.5 text-[11px] font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                  >
                    {t.cancelBtn}
                  </button>
                </div>
              )}

              {/* Playing state */}
              {isPlaying && (
                <div className="flex items-center justify-center gap-2 mb-1.5 py-2 bg-gold/10 rounded-xl border border-gold/30">
                  <div className="flex space-x-0.5">
                    <div className="w-0.5 h-2.5 bg-warm-brown rounded-full animate-pulse" />
                    <div className="w-0.5 h-4 bg-warm-brown rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-0.5 h-3 bg-warm-brown rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="w-0.5 h-5 bg-warm-brown rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="w-0.5 h-2.5 bg-warm-brown rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
                  </div>
                  <span className="text-xs text-warm-brown font-medium">{t.dadaSpeaking}</span>
                  <button 
                    onClick={stopAudio} 
                    className="ml-1 px-2 py-0.5 text-[11px] font-medium text-warm-brown bg-gold/20 hover:bg-gold/30 rounded-full transition-colors"
                  >
                    {t.stopBtn}
                  </button>
                </div>
              )}

              <div className="flex items-end gap-1.5">
                {/* Text input — WhatsApp-style rounded pill */}
                <div className="flex-1 flex items-end bg-white rounded-full border border-gray-200 px-3 py-1 min-h-[40px] sm:min-h-[44px]">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder={t.messagePlaceholder}
                    className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] sm:text-[15px] leading-snug py-1.5 max-h-[100px] placeholder:text-gray-400"
                    rows={1}
                    style={{ height: 'auto' }}
                  />
                </div>

                {/* Mic button — circular like WhatsApp */}
                {speechSupported && !newMessage.trim() && (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading || isPlaying}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      isRecording
                        ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-105'
                        : 'bg-warm-brown text-white hover:bg-amber-900 active:scale-95 disabled:opacity-50 shadow-md'
                    }`}
                    title={isRecording ? t.stopListening : t.talkToDada}
                  >
                    {isRecording ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Send button — shows when there's text (like WhatsApp) */}
                {(newMessage.trim() || !speechSupported) && (
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !newMessage.trim()}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-warm-brown text-white flex items-center justify-center hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex-shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer - only on non-chat views */}
      {view !== 'chat' && (
        <footer className="text-center py-3 px-4 flex-shrink-0">
          <p className="text-xs sm:text-sm text-earth">
            {t.poweredBy} <span className="font-playfair font-semibold text-warm-brown">Dada Bora</span> 💛
          </p>
        </footer>
      )}

      {/* AR Overlay — only available when user has an active session */}
      {arActive && session && (
        <DadaBoraARViewer onClose={() => setArActive(false)} sessionId={session.sessionId} />
      )}

    </div>
  );
}
