/**
 * User Profile & Memory System for Dada Bora
 * Builds personalized relationships by remembering user context
 * Learns from conversations to provide better support
 */

import { adminDb } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Relationship stages - Dada builds trust over time
export type RelationshipStage = 'new' | 'getting-to-know' | 'familiar' | 'trusted' | 'close';

// Life stages Dada can understand
export type LifeStage = 
  | 'single'
  | 'in-relationship'
  | 'engaged'
  | 'married'
  | 'trying-to-conceive'
  | 'pregnant'
  | 'new-mother'
  | 'mother'
  | 'grandmother';

// Topics user has discussed
export type TopicCategory =
  | 'relationships'
  | 'pregnancy'
  | 'motherhood'
  | 'health'
  | 'mental-health'
  | 'career'
  | 'finance'
  | 'family'
  | 'beauty'
  | 'nutrition'
  | 'fitness'
  | 'self-care'
  | 'education'
  | 'spiritual';

export interface UserMemory {
  fact: string;
  category: TopicCategory;
  importance: 'high' | 'medium' | 'low';
  learnedAt: Timestamp;
  source: 'user-stated' | 'inferred';
}

export interface UserProfile {
  chatId: string;
  
  // Phone linking (for cross-session profile persistence)
  phoneHash?: string;
  previousChatIds?: string[]; // If user had chats before migration
  
  // Basic info (learned from conversation)
  preferredName?: string;
  approximateAge?: string; // "20s", "30s", etc.
  location?: {
    country?: string;
    countryCode?: string; // ISO code like "KE", "US", "NG"
    region?: string;      // "africa-east", "caribbean", etc.
    timezone?: string;
  };
  detectedLanguage?: string; // Auto-detected from phone location
  languagePreference: 'english' | 'french' | 'swahili' | 'mixed';
  
  // Life context
  lifeStage?: LifeStage;
  hasChildren?: boolean;
  childrenInfo?: string; // "2 kids, ages 3 and 7"
  relationshipStatus?: string;
  occupation?: string;
  
  // Relationship with Dada
  relationshipStage: RelationshipStage;
  trustScore: number; // 0-100
  totalConversations: number;
  totalMessages: number;
  
  // What Dada has learned
  memories: UserMemory[];
  topConcerns: string[];
  interests: TopicCategory[];
  
  // Conversation context
  currentMood?: string;
  recentTopics: string[];
  lastConversationSummary?: string;
  recentQuestions?: string[]; // Questions Dada recently asked (to avoid repetition)
  
  // Engagement tracking
  firstInteraction: Timestamp;
  lastInteraction: Timestamp;
  averageResponseTime?: number; // How quickly they respond
  preferredTimeOfDay?: string; // "morning", "evening", etc.
  
  // Product recommendations
  productInterests?: string[];
  hasReceivedRecommendation: boolean;
  recommendationHistory?: Array<{
    productId: string;
    productName: string;
    recommendedAt: Timestamp;
    wasHelpful?: boolean;
  }>;
  
  // Flags
  hasCrisisHistory: boolean;
  requiresCarefulHandling: boolean;
  specialNotes?: string;
}

/**
 * Get or create a user profile
 */
export async function getUserProfile(chatId: string): Promise<UserProfile | null> {
  try {
    const profileRef = adminDb.collection('userProfiles').doc(chatId);
    const profileDoc = await profileRef.get();
    
    if (profileDoc.exists) {
      return profileDoc.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(chatId: string, anonymousName: string): Promise<UserProfile> {
  const newProfile: UserProfile = {
    chatId,
    languagePreference: 'english',
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
  };
  
  await adminDb.collection('userProfiles').doc(chatId).set(newProfile);
  return newProfile;
}

/**
 * Update user profile after each message
 */
export async function updateUserProfile(
  chatId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    // Filter out undefined values - Firestore doesn't accept them
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    
    await adminDb.collection('userProfiles').doc(chatId).update({
      ...cleanedUpdates,
      lastInteraction: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

/**
 * Add a memory/fact about the user
 */
export async function addUserMemory(
  chatId: string, 
  memory: Omit<UserMemory, 'learnedAt'>
): Promise<void> {
  try {
    await adminDb.collection('userProfiles').doc(chatId).update({
      memories: FieldValue.arrayUnion({
        ...memory,
        learnedAt: Timestamp.now(),
      }),
      lastInteraction: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error adding user memory:', error);
  }
}

/**
 * Update relationship stage based on interactions
 */
export async function updateRelationshipStage(chatId: string): Promise<RelationshipStage> {
  try {
    const profileDoc = await adminDb.collection('userProfiles').doc(chatId).get();
    const profile = profileDoc.data() as UserProfile;
    
    if (!profile) return 'new';
    
    let newStage: RelationshipStage = profile.relationshipStage;
    const messageCount = profile.totalMessages;
    const trustScore = profile.trustScore;
    
    // Determine relationship stage based on interactions and trust
    if (messageCount >= 100 && trustScore >= 80) {
      newStage = 'close';
    } else if (messageCount >= 50 && trustScore >= 60) {
      newStage = 'trusted';
    } else if (messageCount >= 20 && trustScore >= 40) {
      newStage = 'familiar';
    } else if (messageCount >= 5) {
      newStage = 'getting-to-know';
    }
    
    if (newStage !== profile.relationshipStage) {
      await updateUserProfile(chatId, { relationshipStage: newStage });
    }
    
    return newStage;
  } catch (error) {
    console.error('Error updating relationship stage:', error);
    return 'new';
  }
}

/**
 * Increment trust score based on positive interaction
 */
export async function incrementTrustScore(
  chatId: string, 
  amount: number = 1
): Promise<number> {
  try {
    const profileRef = adminDb.collection('userProfiles').doc(chatId);
    const profileDoc = await profileRef.get();
    const currentScore = profileDoc.data()?.trustScore || 10;
    
    const newScore = Math.min(100, currentScore + amount);
    
    await profileRef.update({
      trustScore: newScore,
      totalMessages: FieldValue.increment(1),
    });
    
    return newScore;
  } catch (error) {
    console.error('Error incrementing trust score:', error);
    return 0;
  }
}

/**
 * Extract potential facts from a message using AI
 * This should be called with the AI response analyzing the user message
 */
export function extractPotentialFacts(message: string): Array<{fact: string; category: TopicCategory}> {
  const facts: Array<{fact: string; category: TopicCategory}> = [];
  const lowerMessage = message.toLowerCase();
  
  // Pregnancy indicators
  if (lowerMessage.match(/i('m| am) pregnant|expecting|weeks pregnant|trimester|due date/)) {
    facts.push({ fact: 'User is pregnant', category: 'pregnancy' });
  }
  
  // Children indicators
  if (lowerMessage.match(/my (son|daughter|child|kid|baby|toddler|teen)/)) {
    facts.push({ fact: 'User has children', category: 'motherhood' });
  }
  
  // Relationship indicators
  if (lowerMessage.match(/my (husband|wife|partner|boyfriend|girlfriend|fiancé)/)) {
    facts.push({ fact: 'User is in a relationship', category: 'relationships' });
  }
  
  // Work indicators
  if (lowerMessage.match(/my (job|work|boss|career|business|company)/)) {
    facts.push({ fact: 'User mentioned work/career', category: 'career' });
  }
  
  // Health indicators
  if (lowerMessage.match(/diagnosed|condition|doctor|hospital|medication|treatment/)) {
    facts.push({ fact: 'User has health concerns', category: 'health' });
  }
  
  // Mental health indicators
  if (lowerMessage.match(/therapy|therapist|counseling|antidepressant|anxiety|depression/)) {
    facts.push({ fact: 'User engaged with mental health support', category: 'mental-health' });
  }
  
  return facts;
}

/**
 * Generate context summary for AI from user profile
 */
export function generateProfileContext(profile: UserProfile): string {
  const contextParts: string[] = [];
  
  // Relationship stage context
  const stageDescriptions: Record<RelationshipStage, string> = {
    'new': 'This is a new user. Be warm and welcoming, but not too familiar yet.',
    'getting-to-know': 'You\'re getting to know this user. Show genuine interest in learning about them.',
    'familiar': 'This user is becoming familiar. You can be warmer and reference past conversations.',
    'trusted': 'This user trusts you. You can be more personal and give more direct advice.',
    'close': 'This is a close sister/friend. Be very warm, use their name if known, and be fully supportive.',
  };
  
  contextParts.push(`RELATIONSHIP: ${stageDescriptions[profile.relationshipStage]}`);
  
  // Add personal context
  if (profile.preferredName) {
    contextParts.push(`Her name is ${profile.preferredName}.`);
  }
  
  if (profile.lifeStage) {
    contextParts.push(`Life stage: ${profile.lifeStage.replace('-', ' ')}.`);
  }
  
  if (profile.childrenInfo) {
    contextParts.push(`Children: ${profile.childrenInfo}.`);
  }
  
  if (profile.location?.country) {
    contextParts.push(`Location: ${profile.location.country}.`);
  }
  
  // Add memories
  if (profile.memories.length > 0) {
    const importantMemories = profile.memories
      .filter(m => m.importance === 'high')
      .slice(-5)
      .map(m => m.fact);
    
    if (importantMemories.length > 0) {
      contextParts.push(`WHAT YOU KNOW ABOUT HER:\n- ${importantMemories.join('\n- ')}`);
    }
  }
  
  // Add recent topics
  if (profile.recentTopics.length > 0) {
    contextParts.push(`Recent topics discussed: ${profile.recentTopics.slice(-3).join(', ')}.`);
  }
  
  // Add concerns
  if (profile.topConcerns.length > 0) {
    contextParts.push(`Her main concerns: ${profile.topConcerns.join(', ')}.`);
  }
  
  // Add conversation summary
  if (profile.lastConversationSummary) {
    contextParts.push(`Previous conversation summary: ${profile.lastConversationSummary}`);
  }
  
  // Special handling notes
  if (profile.requiresCarefulHandling) {
    contextParts.push('⚠️ This user requires careful, sensitive handling based on history.');
  }
  
  if (profile.hasCrisisHistory) {
    contextParts.push('⚠️ This user has crisis history. Be extra attentive to emotional state.');
  }
  
  return contextParts.join('\n');
}

/**
 * Check if user is ready for product recommendations
 */
export function isReadyForRecommendations(profile: UserProfile): boolean {
  // Only recommend to users who:
  // 1. Have reached at least "familiar" relationship stage
  // 2. Have trust score of at least 50
  // 3. Have had at least 10 messages
  // 4. Haven't been flagged for careful handling
  
  return (
    ['familiar', 'trusted', 'close'].includes(profile.relationshipStage) &&
    profile.trustScore >= 50 &&
    profile.totalMessages >= 10 &&
    !profile.requiresCarefulHandling
  );
}
