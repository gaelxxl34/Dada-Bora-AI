/**
 * Progressive Profile System for Dada Bora
 * 
 * ARCHITECTURE:
 * 1. Profiles are linked to phone numbers via consistent hashing
 * 2. Information is collected progressively through natural conversation
 * 3. Only relevant context is sent to AI (token optimization)
 * 4. AI extracts new facts from conversations automatically
 */

import { adminDb } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { UserProfile, TopicCategory, RelationshipStage } from './user-profile';
import { getLocationFromPhone, PhoneLocationInfo, WorldRegion } from './phone-location';

// ============================================
// PROFILE STORAGE & RETRIEVAL
// ============================================

/**
 * Get or create profile by phone hash
 * This ensures the same phone always gets the same profile
 * Now also auto-detects location from phone number!
 */
export async function getOrCreateProfileByPhoneHash(
  phoneHash: string,
  chatId: string,
  anonymousName: string,
  phoneNumber?: string // Optional: pass actual number for location detection
): Promise<{ profile: UserProfile; isNew: boolean; locationInfo?: PhoneLocationInfo }> {
  
  // Auto-detect location from phone number
  let locationInfo: PhoneLocationInfo | null = null;
  if (phoneNumber) {
    locationInfo = getLocationFromPhone(phoneNumber);
  }
  
  // First, check if profile exists for this chat
  const existingProfile = await adminDb.collection('userProfiles').doc(chatId).get();
  
  if (existingProfile.exists) {
    const profile = existingProfile.data() as UserProfile;
    
    // Update location if we have it and it's missing
    if (locationInfo && !profile.location?.country) {
      await adminDb.collection('userProfiles').doc(chatId).update({
        location: {
          country: locationInfo.countryName,
          countryCode: locationInfo.countryCode,
          region: locationInfo.region,
          timezone: locationInfo.timezone,
        },
        detectedLanguage: locationInfo.primaryLanguages[0],
      });
      profile.location = {
        country: locationInfo.countryName,
        region: locationInfo.region,
        timezone: locationInfo.timezone,
      };
    }
    
    return { 
      profile, 
      isNew: false,
      locationInfo: locationInfo || undefined,
    };
  }
  
  // Check if there's a profile with same phone hash (user might have a new chat)
  const profileByPhone = await adminDb.collection('userProfiles')
    .where('phoneHash', '==', phoneHash)
    .limit(1)
    .get();
  
  if (!profileByPhone.empty) {
    // Migrate profile to new chat ID
    const oldProfile = profileByPhone.docs[0].data() as UserProfile;
    const migratedProfile = {
      ...oldProfile,
      chatId,
      previousChatIds: [...(oldProfile.previousChatIds || []), profileByPhone.docs[0].id],
      // Update location if we have new info
      ...(locationInfo && !oldProfile.location?.country ? {
        location: {
          country: locationInfo.countryName,
          countryCode: locationInfo.countryCode,
          region: locationInfo.region,
          timezone: locationInfo.timezone,
        },
      } : {}),
    };
    await adminDb.collection('userProfiles').doc(chatId).set(migratedProfile);
    return { profile: migratedProfile, isNew: false, locationInfo: locationInfo || undefined };
  }
  
  // Create new profile with auto-detected location
  const newProfile: UserProfile = {
    chatId,
    phoneHash,
    languagePreference: locationInfo?.primaryLanguages.includes('french') ? 'french' 
      : locationInfo?.primaryLanguages.includes('swahili') ? 'swahili' 
      : 'english',
    relationshipStage: 'new',
    trustScore: 10,
    totalConversations: 1,
    totalMessages: 0,
    memories: [],
    topConcerns: [],
    interests: [],
    recentTopics: [],
    firstInteraction: Timestamp.now(),
    lastInteraction: Timestamp.now(),
    hasReceivedRecommendation: false,
    hasCrisisHistory: false,
    requiresCarefulHandling: false,
    // Auto-detected location from phone number!
    ...(locationInfo ? {
      location: {
        country: locationInfo.countryName,
        countryCode: locationInfo.countryCode,
        region: locationInfo.region,
        timezone: locationInfo.timezone,
      },
    } : {}),
  };
  
  await adminDb.collection('userProfiles').doc(chatId).set(newProfile);
  return { profile: newProfile, isNew: true, locationInfo: locationInfo || undefined };
}


// ============================================
// PROGRESSIVE INFORMATION COLLECTION
// ============================================

/**
 * Questions Dada can naturally ask to learn more about the user
 * These are triggered based on relationship stage and missing info
 */
export const PROGRESSIVE_QUESTIONS: Record<string, {
  question: string;
  triggerAfterMessages: number;
  requiresStage: RelationshipStage[];
  category: string;
}> = {
  preferredName: {
    question: "By the way, dada, what should I call you? I'd love to know your name. 💜",
    triggerAfterMessages: 3,
    requiresStage: ['new', 'getting-to-know'],
    category: 'basic',
  },
  // NOTE: Location is auto-detected from phone number - no need to ask!
  lifeStage: {
    question: "Tell me a bit about your life right now — are you a mama, expecting, or just navigating this journey of womanhood?",
    triggerAfterMessages: 5,
    requiresStage: ['getting-to-know'],
    category: 'life',
  },
  interests: {
    question: "What topics are close to your heart, sis? Health, beauty, career, relationships — I'm here for all of it. 💜",
    triggerAfterMessages: 10,
    requiresStage: ['familiar', 'trusted'],
    category: 'preferences',
  },
};

/**
 * Determine what question (if any) Dada should naturally ask
 */
export function getProgressiveQuestion(profile: UserProfile): string | null {
  // Don't ask questions during crisis
  if (profile.requiresCarefulHandling || profile.hasCrisisHistory) {
    return null;
  }
  
  for (const [field, config] of Object.entries(PROGRESSIVE_QUESTIONS)) {
    // Check if we already have this info
    if (profile[field as keyof UserProfile]) continue;
    
    // Check if enough messages have passed
    if (profile.totalMessages < config.triggerAfterMessages) continue;
    
    // Check relationship stage
    if (!config.requiresStage.includes(profile.relationshipStage)) continue;
    
    // Check if we recently asked this (don't repeat)
    const recentlyAsked = profile.recentQuestions?.includes(field);
    if (recentlyAsked) continue;
    
    return config.question;
  }
  
  return null;
}


// ============================================
// AI FACT EXTRACTION (runs after AI response)
// ============================================

/**
 * Patterns to extract facts from user messages
 * This runs on the user's message to learn about them
 */
const EXTRACTION_PATTERNS: Array<{
  patterns: RegExp[];
  extract: (match: RegExpMatchArray, message: string) => { field: string; value: any } | null;
}> = [
  // Name extraction — broadened patterns
  {
    patterns: [
      /(?:i'm|i am|call me|my name is|name's|it's|this is|they call me|you can call me)\s+([A-Za-z]{2,})/i,
      /^([A-Za-z]{2,})(?:\s+here)?[.!]?$/i,
    ],
    extract: (match) => {
      const name = match[1];
      // Skip common words that aren't names
      const skipWords = ['not', 'here', 'good', 'fine', 'okay', 'well', 'just', 'really', 'very', 'the', 'and', 'but', 'sure', 'yes', 'doing', 'feeling', 'going', 'back', 'sorry', 'tired', 'hungry', 'happy', 'sad', 'from'];
      if (skipWords.includes(name.toLowerCase())) return null;
      // Capitalize first letter
      return { field: 'preferredName', value: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() };
    },
  },
  
  // Location extraction
  {
    patterns: [
      /(?:i'm from|i live in|i'm in|based in|living in)\s+([A-Za-z\s,]+)/i,
      /(?:here in|from)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)?)/i,
    ],
    extract: (match) => ({
      field: 'location',
      value: { region: match[1].trim() },
    }),
  },
  
  // Pregnancy extraction
  {
    patterns: [
      /(?:i'm|i am)\s+(\d+)\s+(?:weeks?|months?)\s+pregnant/i,
      /(\d+)\s+(?:weeks?|months?)\s+(?:pregnant|along)/i,
      /(?:due|expecting)\s+(?:in\s+)?([A-Za-z]+)/i,
    ],
    extract: (match, message) => {
      if (message.match(/weeks?\s+pregnant/i)) {
        return { field: 'lifeStage', value: 'pregnant' };
      }
      return { field: 'lifeStage', value: 'pregnant' };
    },
  },
  
  // Children extraction
  {
    patterns: [
      /(?:i have|got)\s+(\d+)\s+(?:kid|child|children|babies|sons?|daughters?)/i,
      /(?:my|i'm a)\s+(?:baby|child|kid|son|daughter)\s+is\s+(\d+)/i,
      /(?:mother|mom|mama|mum)\s+of\s+(\d+)/i,
    ],
    extract: (match) => ({
      field: 'hasChildren',
      value: true,
    }),
  },
  
  // Relationship status
  {
    patterns: [
      /(?:my husband|my wife|my partner|i'm married|we're married)/i,
    ],
    extract: () => ({ field: 'relationshipStatus', value: 'married' }),
  },
  {
    patterns: [
      /(?:my boyfriend|my girlfriend|dating|in a relationship)/i,
    ],
    extract: () => ({ field: 'relationshipStatus', value: 'in-relationship' }),
  },
  {
    patterns: [
      /(?:i'm single|single mom|single mother|on my own)/i,
    ],
    extract: () => ({ field: 'relationshipStatus', value: 'single' }),
  },
];

/**
 * Extract facts from a user message
 * Returns fields to update in the profile
 */
export function extractFactsFromMessage(message: string): Record<string, any> {
  const facts: Record<string, any> = {};
  
  for (const { patterns, extract } of EXTRACTION_PATTERNS) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const result = extract(match, message);
        if (result) {
          facts[result.field] = result.value;
        }
        break; // Only match first pattern per category
      }
    }
  }
  
  return facts;
}


// ============================================
// TOKEN-OPTIMIZED CONTEXT GENERATION
// ============================================

/**
 * Generate MINIMAL context for AI based on what's relevant
 * This is the key to token optimization
 */
export function generateOptimizedContext(
  profile: UserProfile,
  currentMessage: string,
  isCrisis: boolean
): { context: string; tokenEstimate: number } {
  
  const contextParts: string[] = [];
  let tokenEstimate = 0;
  
  // ALWAYS include: Relationship stage (affects tone)
  const stageContext = getRelationshipStageContext(profile.relationshipStage);
  contextParts.push(stageContext);
  tokenEstimate += 30;
  
  // ALWAYS include name — this is the #1 most important context (~5 tokens)
  if (profile.preferredName) {
    contextParts.push(`Her name: ${profile.preferredName} — ALWAYS use her name naturally in your responses`);
    tokenEstimate += 10;
  }
  
  // ALWAYS include location if known (~5 tokens)
  if (profile.location?.country) {
    contextParts.push(`Location: ${profile.location.country}`);
    tokenEstimate += 5;
  }
  
  // ALWAYS include life stage if known (~5 tokens)
  if (profile.lifeStage) {
    contextParts.push(`Life stage: ${profile.lifeStage}`);
    tokenEstimate += 5;
  }
  
  // ALWAYS include children info if known (~5 tokens)
  if (profile.hasChildren) {
    contextParts.push(`Has children: ${profile.childrenInfo || 'yes'}`);
    tokenEstimate += 5;
  }
  
  // ALWAYS include relationship status if known (~5 tokens)
  if (profile.relationshipStatus) {
    contextParts.push(`Relationship: ${profile.relationshipStatus}`);
    tokenEstimate += 5;
  }
  
  // ALWAYS include total messages for conversation awareness (~5 tokens)
  if (profile.totalMessages && profile.totalMessages > 1) {
    contextParts.push(`Total messages exchanged: ${profile.totalMessages}`);
    tokenEstimate += 5;
  }
  
  // Include recent concerns if this seems like a follow-up
  if (profile.topConcerns.length > 0 && isFollowUp(currentMessage)) {
    contextParts.push(`Her recent concerns: ${profile.topConcerns.slice(-2).join(', ')}`);
    tokenEstimate += 20;
  }
  
  // Include HIGH importance memories only
  const importantMemories = profile.memories
    .filter(m => m.importance === 'high')
    .slice(-3)
    .map(m => m.fact);
  
  if (importantMemories.length > 0) {
    contextParts.push(`Key facts about her:\n- ${importantMemories.join('\n- ')}`);
    tokenEstimate += importantMemories.length * 15;
  }
  
  // CRISIS: Always include crisis history flag
  if (profile.hasCrisisHistory || isCrisis) {
    contextParts.push('⚠️ Handle with extra care - crisis history');
    tokenEstimate += 10;
  }
  
  // Include last conversation summary only if seems relevant
  if (profile.lastConversationSummary && isFollowUp(currentMessage)) {
    contextParts.push(`Last conversation: ${profile.lastConversationSummary}`);
    tokenEstimate += 40;
  }
  
  return {
    context: contextParts.length > 0 
      ? `USER CONTEXT:\n${contextParts.join('\n')}`
      : '',
    tokenEstimate,
  };
}

/**
 * Get minimal relationship stage context
 */
function getRelationshipStageContext(stage: RelationshipStage): string {
  const contexts: Record<RelationshipStage, string> = {
    'new': 'New user - be warm but not overly familiar',
    'getting-to-know': 'Getting to know her - show interest in learning about her',
    'familiar': 'Familiar user - can be warmer, reference past if relevant',
    'trusted': 'Trusted friend - be personal and direct',
    'close': 'Close sister - fully warm and supportive',
  };
  return `Relationship: ${contexts[stage]}`;
}

/**
 * Detect what topics a message is about
 */
function detectMessageTopics(message: string): string[] {
  const topics: string[] = [];
  const lower = message.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    pregnancy: ['pregnant', 'pregnancy', 'trimester', 'baby bump', 'expecting', 'due date'],
    motherhood: ['mother', 'mom', 'mama', 'parenting', 'kids', 'children'],
    baby: ['baby', 'newborn', 'infant', 'breastfeed', 'formula'],
    health: ['doctor', 'hospital', 'sick', 'pain', 'symptoms', 'medication'],
    mental: ['depressed', 'anxious', 'stressed', 'overwhelmed', 'sad'],
    relationships: ['husband', 'wife', 'partner', 'boyfriend', 'girlfriend', 'marriage'],
    work: ['job', 'work', 'career', 'boss', 'office'],
    resources: ['help', 'where can i', 'how do i', 'resources', 'support'],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

/**
 * Check if detected topics are relevant to certain categories
 */
function isTopicRelevant(detectedTopics: string[], relevantCategories: string[]): boolean {
  return detectedTopics.some(t => relevantCategories.includes(t));
}

/**
 * Detect if message seems like a follow-up to previous conversation
 */
function isFollowUp(message: string): boolean {
  const followUpIndicators = [
    'remember', 'last time', 'you said', 'we talked', 'earlier',
    'following up', 'update', 'still', 'again', 'about that',
  ];
  const lower = message.toLowerCase();
  return followUpIndicators.some(indicator => lower.includes(indicator));
}


// ============================================
// KNOWLEDGE BASE CACHING (Token Optimization)
// ============================================

/**
 * Instead of sending ALL knowledge base articles,
 * we cache summaries and only include relevant ones
 */
interface KnowledgeCache {
  summaries: Map<string, { title: string; category: string; keywords: string[] }>;
  lastUpdated: number;
}

let knowledgeCache: KnowledgeCache | null = null;

/**
 * Build a lightweight cache of knowledge base articles
 */
export async function buildKnowledgeCache(): Promise<KnowledgeCache> {
  const now = Date.now();
  
  // Use cache if less than 5 minutes old
  if (knowledgeCache && (now - knowledgeCache.lastUpdated) < 300000) {
    return knowledgeCache;
  }
  
  const articlesSnapshot = await adminDb
    .collection('knowledgeArticles')
    .where('status', '==', 'published')
    .get();
  
  const summaries = new Map();
  
  articlesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    // Extract keywords from title and first 100 chars of content
    const keywords = extractKeywords(
      `${data.title} ${data.content.substring(0, 100)}`
    );
    
    summaries.set(doc.id, {
      title: data.title,
      category: data.categoryName,
      keywords,
    });
  });
  
  knowledgeCache = { summaries, lastUpdated: now };
  return knowledgeCache;
}

/**
 * Extract keywords from text for matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'with', 'how', 'what', 'when', 'where', 'why', 'can', 'do', 'does'];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10);
}

/**
 * Get only relevant knowledge articles for current message
 * Instead of sending everything (1000+ tokens), send only relevant (100-200 tokens)
 */
export async function getRelevantKnowledge(
  message: string,
  maxArticles: number = 2
): Promise<string> {
  const cache = await buildKnowledgeCache();
  const messageKeywords = extractKeywords(message);
  
  // Score each article by keyword overlap
  const scored: Array<{ id: string; score: number; title: string; category: string }> = [];
  
  cache.summaries.forEach((summary, id) => {
    const overlap = messageKeywords.filter(kw => 
      summary.keywords.includes(kw)
    ).length;
    
    if (overlap > 0) {
      scored.push({ id, score: overlap, title: summary.title, category: summary.category });
    }
  });
  
  // Get top matches
  const topMatches = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxArticles);
  
  if (topMatches.length === 0) {
    return '';
  }
  
  // Fetch full content for top matches only
  const articles = await Promise.all(
    topMatches.map(async match => {
      const doc = await adminDb.collection('knowledgeArticles').doc(match.id).get();
      const data = doc.data();
      // Truncate to 300 chars to save tokens
      const truncatedContent = data?.content.substring(0, 300) + (data?.content.length > 300 ? '...' : '');
      return `**${match.title}** (${match.category}):\n${truncatedContent}`;
    })
  );
  
  return `RELEVANT KNOWLEDGE:\n${articles.join('\n\n')}`;
}


// ============================================
// TOKEN BUDGET TRACKING
// ============================================

/**
 * Track token usage per user for cost optimization
 */
export async function trackTokenUsage(
  chatId: string,
  tokensUsed: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  await adminDb.collection('tokenUsage').doc(`${chatId}_${today}`).set({
    chatId,
    date: today,
    tokens: FieldValue.increment(tokensUsed),
    requests: FieldValue.increment(1),
  }, { merge: true });
}

/**
 * Check if user is within daily token budget
 * (Useful for rate limiting heavy users)
 */
export async function checkTokenBudget(
  chatId: string,
  dailyLimit: number = 10000
): Promise<{ withinBudget: boolean; used: number; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  const usage = await adminDb.collection('tokenUsage').doc(`${chatId}_${today}`).get();
  const used = usage.data()?.tokens || 0;
  
  return {
    withinBudget: used < dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
  };
}
