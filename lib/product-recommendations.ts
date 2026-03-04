/**
 * Product Recommendation Engine for Dada Bora
 * Recommends partner products naturally when trust is built
 * Only suggests products available on the platform
 */

import { adminDb } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { UserProfile, isReadyForRecommendations, TopicCategory } from './user-profile';

export interface PartnerProduct {
  id: string;
  partnerId: string;
  partnerName: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price?: number;
  currency?: string;
  imageUrl?: string;
  purchaseUrl?: string;
  status: 'active' | 'draft' | 'out_of_stock';
  isRecommendable: boolean; // Partner can opt-in/out of recommendations
  relevantTopics: TopicCategory[];
  targetLifeStages?: string[];
}

export interface ProductRecommendation {
  product: PartnerProduct;
  relevanceScore: number;
  reason: string;
  suggestedIntroduction: string;
}

// Topic to product category mapping
const TOPIC_PRODUCT_MAPPING: Record<TopicCategory, string[]> = {
  'pregnancy': ['prenatal', 'maternity', 'baby-prep', 'health-supplements'],
  'motherhood': ['baby-care', 'parenting', 'childcare', 'toys-education'],
  'health': ['wellness', 'supplements', 'healthcare', 'fitness'],
  'mental-health': ['self-care', 'wellness', 'books', 'therapy-tools'],
  'beauty': ['skincare', 'haircare', 'cosmetics', 'natural-beauty'],
  'nutrition': ['food', 'supplements', 'kitchen', 'meal-prep'],
  'fitness': ['activewear', 'fitness-equipment', 'wellness'],
  'self-care': ['spa', 'relaxation', 'aromatherapy', 'journals'],
  'relationships': ['books', 'date-night', 'couples-wellness'],
  'career': ['productivity', 'professional', 'education', 'business'],
  'finance': ['financial-tools', 'education', 'planning'],
  'family': ['family-activities', 'home', 'education'],
  'education': ['books', 'courses', 'learning-materials'],
  'spiritual': ['meditation', 'spiritual-tools', 'books', 'journals'],
};

/**
 * Get relevant products based on user profile and current conversation
 */
export async function getRelevantProducts(
  profile: UserProfile,
  currentTopic?: TopicCategory,
  limit: number = 3
): Promise<ProductRecommendation[]> {
  try {
    // First check if user is ready for recommendations
    if (!isReadyForRecommendations(profile)) {
      return [];
    }
    
    // Get all active, recommendable products
    const productsSnapshot = await adminDb.collection('partnerProducts')
      .where('status', '==', 'active')
      .where('isRecommendable', '==', true)
      .get();
    
    if (productsSnapshot.empty) {
      return [];
    }
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PartnerProduct[];
    
    // Score and rank products based on relevance
    const scoredProducts = products.map(product => {
      let score = 0;
      let reasons: string[] = [];
      
      // Score based on current topic
      if (currentTopic && product.relevantTopics?.includes(currentTopic)) {
        score += 30;
        reasons.push(`relevant to current topic (${currentTopic})`);
      }
      
      // Score based on user interests
      const matchingInterests = profile.interests.filter(interest =>
        product.relevantTopics?.includes(interest)
      );
      if (matchingInterests.length > 0) {
        score += matchingInterests.length * 15;
        reasons.push(`matches your interests`);
      }
      
      // Score based on life stage
      if (profile.lifeStage && product.targetLifeStages?.includes(profile.lifeStage)) {
        score += 20;
        reasons.push(`perfect for your life stage`);
      }
      
      // Score based on concerns
      const concernMatch = profile.topConcerns.some(concern =>
        product.tags?.some(tag => concern.toLowerCase().includes(tag.toLowerCase()))
      );
      if (concernMatch) {
        score += 25;
        reasons.push(`addresses your concerns`);
      }
      
      // Penalize if user already received this recommendation
      const alreadyRecommended = profile.recommendationHistory?.some(
        rec => rec.productId === product.id
      );
      if (alreadyRecommended) {
        score -= 50;
      }
      
      return {
        product,
        relevanceScore: score,
        reason: reasons.join(', ') || 'popular choice among sisters',
        suggestedIntroduction: generateProductIntro(product, profile, reasons),
      };
    });
    
    // Sort by score and return top matches
    return scoredProducts
      .filter(p => p.relevanceScore > 20)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error getting relevant products:', error);
    return [];
  }
}

/**
 * Generate a natural product introduction in Dada's voice
 */
function generateProductIntro(
  product: PartnerProduct,
  profile: UserProfile,
  reasons: string[]
): string {
  const intros = [
    `Dada, speaking of that, I know something that might help. Have you heard of ${product.name} by ${product.partnerName}? Many of our sisters have found it really helpful.`,
    
    `You know what, this reminds me of something one of our partner businesses offers. ${product.name} - it's ${reasons[0] || 'something I think you might like'}.`,
    
    `I want to share something with you, sister to sister. ${product.partnerName} has this ${product.name} that could be just what you need right now.`,
    
    `Actually, dada, there's something I've been meaning to mention. A business in our community makes ${product.name}, and based on what you've shared, it might be perfect for you.`,
  ];
  
  // Select based on relationship stage
  const stageIndex = {
    'new': 0,
    'getting-to-know': 0,
    'familiar': 1,
    'trusted': 2,
    'close': 3,
  };
  
  return intros[stageIndex[profile.relationshipStage] || 0];
}

/**
 * Check if current conversation context is appropriate for recommendation
 */
export function isAppropriateForRecommendation(
  profile: UserProfile,
  currentMessage: string,
  recentMood?: string
): { appropriate: boolean; reason?: string } {
  // NEVER recommend during crisis
  if (recentMood === 'distressed' || recentMood === 'crisis') {
    return { appropriate: false, reason: 'User is in distress' };
  }
  
  // Don't recommend if user requires careful handling
  if (profile.requiresCarefulHandling) {
    return { appropriate: false, reason: 'User needs sensitive handling' };
  }
  
  // Don't recommend too frequently (at least 5 messages between recommendations)
  const lastRecommendation = profile.recommendationHistory?.[profile.recommendationHistory.length - 1];
  if (lastRecommendation) {
    const messagesSince = profile.totalMessages - (profile.recommendationHistory?.length || 0) * 5;
    if (messagesSince < 5) {
      return { appropriate: false, reason: 'Too soon since last recommendation' };
    }
  }
  
  // Check for negative keywords that suggest not a good time
  const negativeKeywords = [
    'stressed', 'angry', 'upset', 'sad', 'depressed', 'worried',
    'can\'t afford', 'no money', 'broke', 'struggling financially',
    'hate', 'terrible', 'awful', 'worst',
  ];
  
  const lowerMessage = currentMessage.toLowerCase();
  const hasNegative = negativeKeywords.some(kw => lowerMessage.includes(kw));
  
  if (hasNegative) {
    return { appropriate: false, reason: 'Negative emotional context' };
  }
  
  // Check for positive/neutral context where recommendation might fit
  const positiveKeywords = [
    'looking for', 'recommend', 'suggest', 'help me find',
    'where can i', 'what should i', 'need to buy', 'shopping for',
    'any tips', 'what do you think about',
  ];
  
  const isAskingForHelp = positiveKeywords.some(kw => lowerMessage.includes(kw));
  
  return { 
    appropriate: isAskingForHelp || profile.relationshipStage === 'trusted' || profile.relationshipStage === 'close',
    reason: isAskingForHelp ? 'User is seeking recommendations' : 'Trust level sufficient',
  };
}

/**
 * Record that a recommendation was made
 */
export async function recordRecommendation(
  chatId: string,
  productId: string,
  productName: string
): Promise<void> {
  try {
    const profileRef = adminDb.collection('userProfiles').doc(chatId);
    
    await profileRef.update({
      hasReceivedRecommendation: true,
      recommendationHistory: FieldValue.arrayUnion({
        productId,
        productName,
        recommendedAt: Timestamp.now(),
      }),
    });
    
    // Also record in analytics
    await adminDb.collection('recommendationAnalytics').add({
      chatId,
      productId,
      productName,
      recommendedAt: Timestamp.now(),
    });
    
  } catch (error) {
    console.error('Error recording recommendation:', error);
  }
}

/**
 * Generate context for AI about available products
 * This is injected into the prompt so Dada knows what's available
 */
export async function getProductContext(
  profile: UserProfile,
  currentTopic?: TopicCategory
): Promise<string> {
  // Don't include product context if not ready
  if (!isReadyForRecommendations(profile)) {
    return '';
  }
  
  const recommendations = await getRelevantProducts(profile, currentTopic, 3);
  
  if (recommendations.length === 0) {
    return '';
  }
  
  const productList = recommendations.map(rec => 
    `- ${rec.product.name} by ${rec.product.partnerName}: ${rec.product.description} (${rec.reason})`
  ).join('\n');
  
  return `

AVAILABLE PRODUCTS (only recommend if naturally fitting the conversation):
You can mention these products from our partner businesses if they genuinely help the user:
${productList}

RECOMMENDATION RULES:
- Only recommend if it genuinely helps the user
- Never push products - be a helpful sister, not a salesperson
- If recommending, do it naturally as part of the conversation
- One recommendation per conversation maximum
- If user seems distressed or in crisis, NEVER recommend products
`;
}
