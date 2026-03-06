'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

interface DadaBoraARViewerProps {
  onClose?: () => void;
  sessionId?: string;
}

// ─── Main AR Viewer with Voice Interaction ───────────────────────────
// <model-viewer> handles cross-platform AR natively.
// Voice: SpeechRecognition → /api/chat/web → /api/tts → audio playback
// Animation plays ONLY while Dada Bora is speaking.

export default function DadaBoraARViewer({ onClose, sessionId }: DadaBoraARViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [arStatus, setArStatus] = useState<'idle' | 'active' | 'unavailable'>('idle');
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Unlock audio on user gesture (iOS Safari requirement) ────────
  // Must be called directly from a tap/click handler
  const unlockAudio = useCallback(() => {
    // Create a silent audio element and play it to unlock audio context
    const audio = new Audio();
    // Play a tiny silent data URI to unlock
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v//////////////////////////////////////////////////////////////////////////////////////////////////wAAAABMYXZjNTguMTMAAAAAAAAAAAAAAAAkAAAAAAAAAAAAYRbPpAAAAAAAAAAAAAAAAAAAAP/7UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    audio.volume = 0.01;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        audio.pause();
        // Reuse this unlocked element for TTS
        preloadedAudioRef.current = audio;
      }).catch(() => {
        // Ignore — we'll try again with the actual audio
      });
    }
  }, []);

  // ─── Model viewer helpers ──────────────────────────────────────────
  const getViewer = useCallback(() => {
    return document.getElementById('dada-bora-viewer') as HTMLElement & {
      activateAR?: () => Promise<void>;
      canActivateAR?: boolean;
      play?: () => void;
      pause?: () => void;
      paused?: boolean;
      autoplay?: boolean;
      animationName?: string;
      availableAnimations?: string[];
    } | null;
  }, []);

  // ─── Animation control ────────────────────────────────────────────
  const startAnimation = useCallback(() => {
    const viewer = getViewer();
    if (viewer?.play) {
      viewer.play();
    }
  }, [getViewer]);

  const stopAnimation = useCallback(() => {
    const viewer = getViewer();
    if (viewer?.pause) {
      viewer.pause();
    }
  }, [getViewer]);

  // ─── Check speech support ─────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
  }, []);

  // ─── Browser TTS fallback (when ElevenLabs quota exceeded) ──────
  const playBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('SpeechSynthesis not supported'));
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        /samantha|karen|moira|fiona|tessa|victoria|zira/i.test(v.name) && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;

      setIsSpeaking(true);
      startAnimation();

      utterance.onend = () => {
        setIsSpeaking(false);
        stopAnimation();
        setResponseText('');
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        stopAnimation();
        setResponseText('');
        reject(new Error('Browser TTS failed'));
      };
      window.speechSynthesis.speak(utterance);
    });
  }, [startAnimation, stopAnimation]);

  // ─── TTS playback ─────────────────────────────────────────────────
  const playAudioResponse = useCallback(async (text: string) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId }),
      });

      if (!res.ok) {
        // Check for quota exceeded → fallback to browser TTS
        try {
          const errorData = await res.json();
          if (errorData.fallbackToBrowser) {
            console.info('ElevenLabs quota exceeded, using browser TTS fallback');
            await playBrowserTTS(text);
            return;
          }
        } catch {
          // Couldn't parse, try browser TTS anyway
        }
        await playBrowserTTS(text);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Clean up previous audio URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = url;

      // Reuse the pre-unlocked audio element if available (iOS fix)
      // Otherwise create a new one
      const audio = preloadedAudioRef.current || new Audio();
      preloadedAudioRef.current = null; // consumed
      audio.src = url;
      audio.volume = 1;
      audioRef.current = audio;

      // Start animation when audio plays
      audio.onplay = () => {
        setIsSpeaking(true);
        startAnimation();
      };

      // Stop animation when audio ends
      audio.onended = () => {
        setIsSpeaking(false);
        stopAnimation();
        setResponseText('');
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        stopAnimation();
        setResponseText('');
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      try {
        await audio.play();
      } catch (playErr) {
        // iOS fallback: if play still fails, try loading first
        console.warn('Play blocked, retrying with load():', playErr);
        audio.load();
        await new Promise(r => setTimeout(r, 100));
        await audio.play();
      }
    } catch (err) {
      console.error('TTS playback error:', err);
      // Last resort: try browser TTS
      try {
        await playBrowserTTS(text);
      } catch {
        setIsSpeaking(false);
        stopAnimation();
      }
    }
  }, [sessionId, startAnimation, stopAnimation, playBrowserTTS]);

  // ─── Send message to AI ───────────────────────────────────────────
  const sendMessage = useCallback(async (message: string) => {
    if (!sessionId || !message.trim()) return;

    setIsThinking(true);
    setTranscript('');

    try {
      const res = await fetch('/api/chat/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: message.trim() }),
      });

      const data = await res.json();
      if (data.success && data.response) {
        setResponseText(data.response);
        setIsThinking(false);
        // Play the response as audio (this triggers the animation)
        await playAudioResponse(data.response);
      } else {
        setIsThinking(false);
      }
    } catch (err) {
      console.error('Chat API error:', err);
      setIsThinking(false);
    }
  }, [sessionId, playAudioResponse]);

  // ─── Speech recognition ───────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!speechSupported || isListening || isSpeaking || isThinking) return;

    // Unlock audio on this user gesture (iOS Safari requires it)
    unlockAudio();

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      console.error('Microphone permission denied');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        setIsListening(false);
        sendMessage(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported, isListening, isSpeaking, isThinking, sendMessage, unlockAudio]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ─── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  // ─── Model viewer events ──────────────────────────────────────────
  useEffect(() => {
    if (!scriptReady) return;

    const timer = setTimeout(() => {
      const viewer = getViewer();
      if (!viewer) return;

      const onLoad = () => {
        setLoaded(true);
        // Pause animation initially — only plays when speaking
        setTimeout(() => {
          stopAnimation();
          const v = getViewer();
          if (v?.canActivateAR) setArSupported(true);
          else setArSupported(false);
        }, 300);
      };
      const onARStatus = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.status === 'session-started') setArStatus('active');
        if (detail?.status === 'not-presenting') setArStatus('idle');
        if (detail?.status === 'failed') {
          setArStatus('unavailable');
          setArSupported(false);
        }
      };
      const onError = () => setLoaded(true);

      viewer.addEventListener('load', onLoad);
      viewer.addEventListener('ar-status', onARStatus);
      viewer.addEventListener('error', onError);

      if ((viewer as HTMLElement & { loaded?: boolean }).loaded) {
        onLoad();
      }

      return () => {
        viewer.removeEventListener('load', onLoad);
        viewer.removeEventListener('ar-status', onARStatus);
        viewer.removeEventListener('error', onError);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [scriptReady, getViewer, stopAnimation]);

  // ─── Activate AR ──────────────────────────────────────────────────
  const activateAR = useCallback(async () => {
    const viewer = getViewer();
    if (!viewer) return;

    if (viewer.activateAR) {
      try { await viewer.activateAR(); } catch { setArStatus('unavailable'); }
    } else {
      setTimeout(async () => {
        const rv = getViewer();
        if (rv?.activateAR) {
          try { await rv.activateAR(); } catch { setArStatus('unavailable'); }
        } else { setArStatus('unavailable'); }
      }, 500);
    }
  }, [getViewer]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Determine mic button state
  const micState = isListening ? 'listening' : isThinking ? 'thinking' : isSpeaking ? 'speaking' : 'idle';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Load model-viewer */}
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        strategy="afterInteractive"
        onLoad={() => setTimeout(() => setScriptReady(true), 200)}
      />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <i className="ri-arrow-left-line text-xl" />
        </button>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div className={`w-2 h-2 rounded-full ${
            isSpeaking ? 'bg-green-400' : isListening ? 'bg-red-400' : isThinking ? 'bg-yellow-400' : 'bg-amber-400'
          } animate-pulse`} />
          <span className="text-white text-sm font-medium">
            {isSpeaking ? 'Dada Bora is speaking...' : isListening ? 'Listening...' : isThinking ? 'Thinking...' : 'Dada Bora AR'}
          </span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Model Viewer */}
      <div ref={containerRef} className="absolute inset-0">
        {/* @ts-expect-error model-viewer is a web component */}
        <model-viewer
          id="dada-bora-viewer"
          src="/models/Talking.glb"
          alt="Dada Bora - Your African Market Guide"
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          ar-placement="floor"
          camera-controls
          auto-rotate
          autoplay
          shadow-intensity="1"
          shadow-softness="1"
          exposure="1"
          camera-orbit="0deg 75deg 2.5m"
          min-camera-orbit="auto auto auto"
          max-camera-orbit="auto auto 10m"
          field-of-view="30deg"
          interaction-prompt="auto"
          touch-action="pan-y"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            '--poster-color': 'transparent',
          } as React.CSSProperties}
        >
          <button slot="ar-button" style={{ display: 'none' }} />

          <div slot="poster" className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Loading Dada Bora...</p>
            </div>
          </div>

          <div slot="progress-bar" className="absolute bottom-0 left-0 right-0 h-1 bg-gold/20">
            <div className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all duration-300" />
          </div>
        {/* @ts-expect-error model-viewer is a web component */}
        </model-viewer>
      </div>

      {/* Transcript / Response bubble */}
      {(transcript || responseText || isThinking) && (
        <div className="absolute top-20 left-4 right-4 z-20 flex justify-center">
          <div className="max-w-sm w-full bg-black/60 backdrop-blur-md rounded-2xl p-4 shadow-lg">
            {transcript && (
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-user-line text-xs text-blue-400" />
                </div>
                <p className="text-white/80 text-sm">{transcript}</p>
              </div>
            )}
            {isThinking && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-3-line text-xs text-gold" />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {responseText && !isThinking && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-user-3-line text-xs text-gold" />
                </div>
                <p className="text-white text-sm line-clamp-4">{responseText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {arStatus !== 'active' && loaded && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="text-center space-y-3 max-w-md mx-auto">
            {/* Voice interaction controls */}
            {sessionId && speechSupported && (
              <div className="flex items-center justify-center gap-4">
                {/* AR button */}
                <button
                  onClick={activateAR}
                  className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  title="View in AR"
                >
                  <i className="ri-camera-3-line text-2xl" />
                </button>

                {/* Main mic button */}
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isThinking || isSpeaking}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    micState === 'listening'
                      ? 'bg-red-500 shadow-red-500/40 scale-110 animate-pulse'
                      : micState === 'thinking'
                      ? 'bg-yellow-500/50 shadow-yellow-500/20 cursor-wait'
                      : micState === 'speaking'
                      ? 'bg-green-500/50 shadow-green-500/20 cursor-wait'
                      : 'bg-gradient-to-br from-gold to-amber-600 shadow-gold/30 hover:scale-105 active:scale-95'
                  }`}
                >
                  <i className={`text-3xl text-white ${
                    micState === 'listening' ? 'ri-mic-fill' :
                    micState === 'thinking' ? 'ri-loader-4-line animate-spin' :
                    micState === 'speaking' ? 'ri-volume-up-fill' :
                    'ri-mic-line'
                  }`} />
                </button>

                {/* Stop audio button — only when speaking */}
                {isSpeaking ? (
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                      }
                      setIsSpeaking(false);
                      stopAnimation();
                      setResponseText('');
                    }}
                    className="w-14 h-14 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
                    title="Stop"
                  >
                    <i className="ri-stop-fill text-2xl" />
                  </button>
                ) : (
                  <div style={{ width: 56 }} />
                )}
              </div>
            )}

            {/* Fallback: no session or no speech support */}
            {(!sessionId || !speechSupported) && (
              <button
                onClick={activateAR}
                className="w-full bg-gradient-to-r from-gold to-amber-600 text-white py-4 px-8 rounded-2xl font-semibold text-lg shadow-lg shadow-gold/25 hover:shadow-gold/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <i className="ri-camera-3-line text-2xl" />
                Place Dada Bora in Your Space
              </button>
            )}

            {/* Status text */}
            <p className="text-white/40 text-xs">
              {micState === 'listening' ? 'Speak now... tap mic to cancel' :
               micState === 'thinking' ? 'Dada Bora is thinking...' :
               micState === 'speaking' ? 'Dada Bora is speaking...' :
               sessionId && speechSupported ? 'Tap the mic to talk to Dada Bora' :
               'Drag to rotate • Pinch to zoom'}
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!loaded && (
        <div className="absolute inset-0 z-30 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gold/80 to-amber-700 flex items-center justify-center shadow-lg shadow-gold/20">
              <i className="ri-user-3-line text-4xl text-white" />
            </div>
            <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white font-playfair">Loading Dada Bora...</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Preparing your AR experience. This may take a moment on first load.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
