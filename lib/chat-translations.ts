/**
 * Chat Page Translations
 * Supports English and French with browser language auto-detection
 */

export type ChatLanguage = 'en' | 'fr';

export const chatTranslations = {
  en: {
    // Header
    tagline: 'The big sister you wish you had 💛',
    endChat: 'End Chat',

    // Phone view
    greeting: 'Hey, Queen! 👋',
    phoneSubtitle: "I'm Dada Bora, the big sister you wish you had. Let's connect so I can remember our conversations.",
    phoneLabel: 'Your Phone Number',
    sending: 'Sending...',
    continueBtn: 'Continue 💛',
    phoneDisclaimer: "We'll send you a verification code. Your conversations are private and secure.",

    // OTP view
    checkPhone: 'Check Your Phone',
    otpSubtitle: 'Enter the 6-digit code sent to',
    verifying: 'Verifying...',
    verifyBtn: 'Verify & Start Chat 💛',
    differentNumber: '← Use a different number',

    // Chat view
    messagePlaceholder: 'Message...',
    listening: 'Listening...',
    cancelBtn: 'Cancel',
    dadaSpeaking: 'Dada is speaking...',
    stopBtn: 'Stop',
    talkToDada: 'Talk to Dada',
    stopListening: 'Stop listening',
    playVoice: 'Play voice',

    // Welcome message
    welcomeMessage: "Hey! 💛 I'm Dada Bora — think of me as that big sister energy. I'm really glad you're here. So tell me, how's your day going?",

    // Footer
    poweredBy: 'Powered by',

    // Errors
    sessionExpired: 'Your session has expired. Please verify your phone number again.',
    failedSend: 'Failed to send message. Please try again.',
    failedOtp: 'Failed to send verification code. Please try again.',
    verificationFailed: 'Verification failed. Please try again.',
    invalidCode: 'Invalid verification code',
    micBlocked: 'Microphone is blocked for this site. To fix:\n1. Tap the lock/info icon in your browser address bar\n2. Find "Microphone" and set it to "Allow"\n3. Reload this page\nOn Mac: also check System Settings → Privacy & Security → Microphone → allow your browser.',
    micDenied: 'Microphone access was denied. To fix:\n1. Tap the lock/info icon in your browser address bar\n2. Find "Microphone" and set it to "Allow"\n3. Reload this page\nOn Mac: also check System Settings → Privacy & Security → Microphone → allow your browser.',
    noMic: 'No microphone detected. Please connect a microphone and try again.',
    micError: 'Could not access microphone. Please check your browser and system settings.',
    micAccessDenied: 'Microphone access denied. Please allow microphone in your browser settings.',
  },
  fr: {
    // Header
    tagline: 'La grande sœur que tu aurais aimé avoir 💛',
    endChat: 'Terminer',

    // Phone view
    greeting: 'Hey, ma belle ! 👋',
    phoneSubtitle: "Je suis Dada Bora, la grande sœur que tu aurais aimé avoir. Connectons-nous pour que je puisse me souvenir de nos conversations.",
    phoneLabel: 'Ton numéro de téléphone',
    sending: 'Envoi...',
    continueBtn: 'Continuer 💛',
    phoneDisclaimer: "Nous t'enverrons un code de vérification. Tes conversations sont privées et sécurisées.",

    // OTP view
    checkPhone: 'Vérifie ton téléphone',
    otpSubtitle: 'Entre le code à 6 chiffres envoyé au',
    verifying: 'Vérification...',
    verifyBtn: 'Vérifier & Commencer 💛',
    differentNumber: '← Utiliser un autre numéro',

    // Chat view
    messagePlaceholder: 'Message...',
    listening: 'Écoute en cours...',
    cancelBtn: 'Annuler',
    dadaSpeaking: 'Dada parle...',
    stopBtn: 'Arrêter',
    talkToDada: 'Parler à Dada',
    stopListening: "Arrêter l'écoute",
    playVoice: 'Écouter',

    // Welcome message
    welcomeMessage: "Hey ! 💛 Je suis Dada Bora — pense à moi comme ta grande sœur. Je suis vraiment contente que tu sois là. Alors dis-moi, comment va ta journée ?",

    // Footer
    poweredBy: 'Propulsé par',

    // Errors
    sessionExpired: 'Ta session a expiré. Vérifie à nouveau ton numéro de téléphone.',
    failedSend: "L'envoi du message a échoué. Réessaie.",
    failedOtp: "L'envoi du code de vérification a échoué. Réessaie.",
    verificationFailed: 'La vérification a échoué. Réessaie.',
    invalidCode: 'Code de vérification invalide',
    micBlocked: "Le microphone est bloqué pour ce site. Pour corriger :\n1. Appuie sur l'icône de cadenas dans la barre d'adresse\n2. Trouve \"Microphone\" et mets-le sur \"Autoriser\"\n3. Recharge cette page",
    micDenied: "L'accès au microphone a été refusé. Pour corriger :\n1. Appuie sur l'icône de cadenas dans la barre d'adresse\n2. Trouve \"Microphone\" et mets-le sur \"Autoriser\"\n3. Recharge cette page",
    noMic: 'Aucun microphone détecté. Connecte un microphone et réessaie.',
    micError: "Impossible d'accéder au microphone. Vérifie les paramètres de ton navigateur.",
    micAccessDenied: "Accès au microphone refusé. Autorise le microphone dans les paramètres de ton navigateur.",
  },
} as const;

/**
 * Detect browser language and return 'en' or 'fr'
 */
export function detectBrowserLanguage(): ChatLanguage {
  if (typeof navigator === 'undefined') return 'en';
  
  const lang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'en';
  
  // Check if any preferred language starts with 'fr'
  if (lang.toLowerCase().startsWith('fr')) return 'fr';
  
  // Also check navigator.languages array
  if (navigator.languages) {
    for (const l of navigator.languages) {
      if (l.toLowerCase().startsWith('fr')) return 'fr';
    }
  }
  
  return 'en';
}

/**
 * Get the language instruction to append to the AI system prompt
 */
export function getLanguageInstruction(lang: ChatLanguage): string {
  if (lang === 'fr') {
    return `
LANGUAGE INSTRUCTION:
The user's browser is set to French. You MUST respond in French. 
Write naturally in French as a warm, caring big sister would speak to her younger sister in French.
Use "tu" (informal) instead of "vous". Keep your warm, caring tone in French.
If the user writes in English, still respond in French unless they explicitly ask you to switch to English.
`;
  }
  return ''; // English is the default, no extra instruction needed
}
