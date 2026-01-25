/**
 * Utility functions for chat management
 * Generates anonymous usernames and manages chat data
 */

const adjectives = [
  'Swift', 'Bright', 'Calm', 'Wise', 'Kind',
  'Bold', 'Gentle', 'Noble', 'Clever', 'Brave',
  'Happy', 'Lucky', 'Peaceful', 'Vibrant', 'Serene',
  'Radiant', 'Mighty', 'Swift', 'Golden', 'Silver'
];

const nouns = [
  'Lion', 'Eagle', 'Dolphin', 'Phoenix', 'Tiger',
  'Wolf', 'Falcon', 'Panda', 'Leopard', 'Hawk',
  'Owl', 'Fox', 'Bear', 'Deer', 'Swan',
  'Raven', 'Butterfly', 'Turtle', 'Whale', 'Sparrow'
];

/**
 * Generate a random anonymous username
 * Format: [Adjective][Noun][3-digit-number]
 * Example: SwiftLion247, BrightEagle891
 */
export function generateAnonymousName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999
  
  return `${adjective}${noun}${number}`;
}

/**
 * Create a unique chat ID based on timestamp and random string
 */
export function generateChatId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `chat_${timestamp}_${random}`;
}

/**
 * Hash function for consistent anonymous name generation (optional)
 * This ensures the same input always generates the same anonymous name
 * Note: This is NOT cryptographically secure, just for consistency
 */
export function hashToAnonymousName(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const absHash = Math.abs(hash);
  const adjIndex = absHash % adjectives.length;
  const nounIndex = (absHash >> 8) % nouns.length;
  const number = (absHash % 900) + 100;
  
  return `${adjectives[adjIndex]}${nouns[nounIndex]}${number}`;
}

/**
 * Validate message content
 */
export function validateMessage(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 10000;
}

/**
 * Sanitize message content (basic XSS prevention)
 */
export function sanitizeMessage(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Simple hash function for phone numbers
 * This provides basic obfuscation for privacy
 * For production, consider using a proper hashing algorithm with salt
 */
export function hashPhoneNumber(phoneNumber: string): string {
  let hash = 0;
  const normalizedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
  
  for (let i = 0; i < normalizedPhone.length; i++) {
    const char = normalizedPhone.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `hash_${Math.abs(hash).toString(36)}`;
}
