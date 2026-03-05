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
    sending: 'Loading...',
    continueBtn: 'Continue 💛',
    phoneDisclaimer: "You'll create a secure PIN to protect your conversations.",

    // PIN view
    createPin: 'Create Your PIN',
    createPinSubtitle: 'Choose a 4-digit PIN to secure your conversations.',
    enterPin: 'Enter Your PIN',
    enterPinSubtitle: 'Enter your 4-digit PIN to access your conversations.',
    confirmPin: 'Confirm PIN',
    pinLabel: 'Your 4-digit PIN',
    pinMismatch: 'PINs do not match. Please try again.',
    verifying: 'Verifying...',
    startChatBtn: 'Start Chatting 💛',
    loginBtn: 'Login 💛',
    differentNumber: '← Use a different number',
    forgotPin: 'Forgot PIN?',
    forgotPinMsg: 'Contact support to reset your PIN.',

    // Legacy OTP user
    setupPin: 'Set Up Your PIN',
    setupPinSubtitle: 'Welcome back! We\'ve upgraded to PIN-based login. Please create a 4-digit PIN for your account.',

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
    sessionExpired: 'Your session has expired. Please log in again.',
    failedSend: 'Failed to send message. Please try again.',
    failedOtp: 'Something went wrong. Please try again.',
    verificationFailed: 'Verification failed. Please try again.',
    invalidCode: 'Incorrect PIN. Please try again.',
    invalidPin: 'Incorrect PIN. Please try again.',
    phoneRegistered: 'This number is already registered. Please enter your PIN.',
    phoneNotFound: 'No account found with this number. Please register first.',
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
    sending: 'Chargement...',
    continueBtn: 'Continuer 💛',
    phoneDisclaimer: "Tu vas créer un code PIN sécurisé pour protéger tes conversations.",

    // PIN view
    createPin: 'Crée ton PIN',
    createPinSubtitle: 'Choisis un code PIN à 4 chiffres pour sécuriser tes conversations.',
    enterPin: 'Entre ton PIN',
    enterPinSubtitle: 'Entre ton code PIN à 4 chiffres pour accéder à tes conversations.',
    confirmPin: 'Confirme le PIN',
    pinLabel: 'Ton code PIN à 4 chiffres',
    pinMismatch: 'Les PINs ne correspondent pas. Réessaie.',
    verifying: 'Vérification...',
    startChatBtn: 'Commencer à discuter 💛',
    loginBtn: 'Se connecter 💛',
    differentNumber: '← Utiliser un autre numéro',
    forgotPin: 'PIN oublié ?',
    forgotPinMsg: 'Contacte le support pour réinitialiser ton PIN.',

    // Legacy OTP user
    setupPin: 'Configure ton PIN',
    setupPinSubtitle: 'Bon retour ! Nous sommes passés à la connexion par PIN. Crée un code PIN à 4 chiffres pour ton compte.',

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
    sessionExpired: 'Ta session a expiré. Reconnecte-toi.',
    failedSend: "L'envoi du message a échoué. Réessaie.",
    failedOtp: "Quelque chose s'est mal passé. Réessaie.",
    verificationFailed: 'La vérification a échoué. Réessaie.',
    invalidCode: 'Code PIN incorrect. Réessaie.',
    invalidPin: 'Code PIN incorrect. Réessaie.',
    phoneRegistered: 'Ce numéro est déjà enregistré. Entre ton PIN.',
    phoneNotFound: 'Aucun compte trouvé avec ce numéro. Inscris-toi d\'abord.',
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
