/**
 * Crisis Detection System for Dada Bora
 * Detects dangerous keywords, patterns, and emotional states
 * Triggers alerts to admins and agents while Dada continues to support
 */

// Crisis severity levels
export type CrisisSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CrisisAlert {
  severity: CrisisSeverity;
  type: string;
  triggers: string[];
  message: string;
  suggestedResponse: string;
  requiresImmediate: boolean;
}

// Critical keywords that require IMMEDIATE escalation
const CRITICAL_KEYWORDS = [
  // Self-harm / Suicide
  'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
  'don\'t want to live', 'better off dead', 'end it all', 'no reason to live',
  'goodbye forever', 'my final message', 'can\'t go on', 'pills to end',
  'jump off', 'hurt myself', 'cutting myself', 'self harm',
  
  // Immediate danger
  'going to hurt', 'being attacked', 'help me now', 'emergency',
  'someone is hurting me', 'in danger', 'he\'s going to kill',
  'she\'s going to kill', 'fear for my life', 'threatening to kill',
  
  // Child safety
  'hurt my child', 'hurt my baby', 'shake the baby', 'can\'t stop crying baby',
  'want to hurt', 'thinking of hurting',
];

// High-risk patterns requiring urgent attention
const HIGH_RISK_KEYWORDS = [
  // Domestic violence
  'he hits me', 'she hits me', 'partner beats', 'husband beats', 'wife beats',
  'abusive relationship', 'domestic violence', 'physically abused', 'strangling',
  'choking me', 'locked me in', 'won\'t let me leave', 'controlling',
  'takes my money', 'financial abuse', 'emotional abuse', 'isolated me',
  
  // Severe mental health
  'severe depression', 'can\'t get out of bed', 'haven\'t eaten in days',
  'not sleeping for days', 'voices in my head', 'hallucinating',
  'panic attack', 'can\'t breathe', 'losing my mind', 'mental breakdown',
  
  // Pregnancy/postpartum crisis
  'don\'t want this baby', 'regret being pregnant', 'hate being a mother',
  'hate my baby', 'postpartum depression', 'can\'t bond with baby',
  'want to give away my baby', 'hurting my newborn thoughts',
  
  // Sexual abuse
  'raped', 'sexually assaulted', 'molested', 'forced me', 'non-consensual',
  'touching me', 'inappropriate touch',
];

// Medium risk - requires follow-up but not immediate
const MEDIUM_RISK_KEYWORDS = [
  // General mental health concerns
  'depressed', 'anxious', 'anxiety', 'stressed', 'overwhelmed',
  'can\'t cope', 'breaking down', 'crying all the time', 'hopeless',
  'worthless', 'no one cares', 'alone', 'lonely', 'no friends',
  'no support', 'no one to talk to', 'exhausted', 'burnt out',
  
  // Relationship issues
  'unhappy marriage', 'want a divorce', 'cheating', 'unfaithful',
  'toxic relationship', 'gaslighting', 'manipulative partner',
  
  // Health concerns
  'bleeding heavily', 'severe pain', 'something is wrong', 'miscarriage',
  'lost the baby', 'stillborn', 'complications',
  
  // Financial distress
  'can\'t afford food', 'no money for rent', 'homeless', 'evicted',
  'can\'t feed my kids', 'starving',
];

// Emotional intensity indicators
const DISTRESS_INDICATORS = [
  'please help', 'i beg you', 'desperate', 'urgent', 'immediately',
  '!!!', 'HELP', 'PLEASE', 'can\'t take it', 'at my wit\'s end',
  'don\'t know what to do', 'no way out', 'trapped', 'suffocating',
];

// Supportive response templates for Dada while humans are alerted
const CRISIS_RESPONSES: Record<string, string> = {
  'self-harm': `Dada, I hear you, and I'm so glad you reached out to me. What you're feeling is real and valid, but please know that you matter — your life matters. I'm here with you right now. 

Can you tell me more about what's happening? I want to understand and help you through this moment. 💜

If you're in immediate danger, please reach out to a crisis line in your country. You don't have to face this alone, sister.`,

  'domestic-violence': `Oh dada, I'm so sorry you're going through this. No one deserves to be treated this way. Your safety is the most important thing right now.

Are you in a safe place right now? If not, is there somewhere you can go — a friend, family member, or shelter?

I want you to know that this is not your fault, and there are people who can help. You are stronger than you know. 💜`,

  'mental-health': `I hear you, sister. What you're feeling is heavy, and I'm grateful you trusted me enough to share it. You don't have to carry this alone.

Can you tell me more about what's been going on? Sometimes just talking about it can help lighten the load. I'm here, and I'm listening. 💜`,

  'pregnancy-crisis': `Mama, these feelings are more common than you might think, and I'm so glad you're talking about them. Being a mother — or expecting to be one — is one of the hardest things, and it's okay to struggle.

What you're feeling doesn't make you a bad person or a bad mother. Can you tell me more about what's been weighing on you? Let's work through this together. 💜`,

  'general-distress': `Dada, I can feel that things are really hard for you right now. Thank you for trusting me with this — that takes real courage.

Take a deep breath with me. I'm here, and we're going to figure this out together. Can you tell me more about what's going on? 💜`,
};

/**
 * Analyze a message for crisis indicators
 */
export function detectCrisis(message: string): CrisisAlert | null {
  const lowerMessage = message.toLowerCase();
  
  // Check for CRITICAL keywords first
  const criticalTriggers = CRITICAL_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  if (criticalTriggers.length > 0) {
    const type = categorizeCrisisType(criticalTriggers);
    return {
      severity: 'critical',
      type,
      triggers: criticalTriggers,
      message: `CRITICAL ALERT: User expressing ${type}. Immediate human intervention required.`,
      suggestedResponse: CRISIS_RESPONSES[type] || CRISIS_RESPONSES['general-distress'],
      requiresImmediate: true,
    };
  }
  
  // Check for HIGH risk keywords
  const highRiskTriggers = HIGH_RISK_KEYWORDS.filter(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  if (highRiskTriggers.length > 0) {
    const type = categorizeCrisisType(highRiskTriggers);
    return {
      severity: 'high',
      type,
      triggers: highRiskTriggers,
      message: `HIGH ALERT: User discussing ${type}. Urgent human review recommended.`,
      suggestedResponse: CRISIS_RESPONSES[type] || CRISIS_RESPONSES['general-distress'],
      requiresImmediate: true,
    };
  }
  
  // Check for MEDIUM risk keywords
  const mediumRiskTriggers = MEDIUM_RISK_KEYWORDS.filter(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  // Check for distress indicators
  const distressCount = DISTRESS_INDICATORS.filter(indicator =>
    lowerMessage.includes(indicator.toLowerCase()) || message.includes(indicator)
  ).length;
  
  if (mediumRiskTriggers.length > 0 || distressCount >= 2) {
    const type = categorizeCrisisType(mediumRiskTriggers);
    return {
      severity: 'medium',
      type: type || 'emotional-distress',
      triggers: [...mediumRiskTriggers, ...(distressCount >= 2 ? ['multiple distress indicators'] : [])],
      message: `MEDIUM ALERT: User showing signs of ${type || 'emotional distress'}. Follow-up recommended.`,
      suggestedResponse: CRISIS_RESPONSES[type] || CRISIS_RESPONSES['general-distress'],
      requiresImmediate: false,
    };
  }
  
  // Check for low-level emotional signals
  if (distressCount === 1) {
    return {
      severity: 'low',
      type: 'mild-distress',
      triggers: ['distress indicator detected'],
      message: 'User may be experiencing mild distress. Monitor conversation.',
      suggestedResponse: CRISIS_RESPONSES['general-distress'],
      requiresImmediate: false,
    };
  }
  
  return null;
}

/**
 * Categorize the type of crisis based on triggers
 */
function categorizeCrisisType(triggers: string[]): string {
  const triggerText = triggers.join(' ').toLowerCase();
  
  if (triggerText.match(/kill|suicide|die|end.*life|self.?harm|cut/)) {
    return 'self-harm';
  }
  if (triggerText.match(/hit|beat|abuse|violen|strangle|chok|attack/)) {
    return 'domestic-violence';
  }
  if (triggerText.match(/baby|child|pregnant|mother|postpartum|newborn/)) {
    return 'pregnancy-crisis';
  }
  if (triggerText.match(/rape|assault|molest|sexual|touch/)) {
    return 'sexual-assault';
  }
  if (triggerText.match(/depress|anxious|panic|mental|break|cope/)) {
    return 'mental-health';
  }
  
  return 'general-distress';
}

/**
 * Get crisis hotline information based on detected location or default
 */
export function getCrisisResources(countryCode?: string): string {
  const resources: Record<string, string> = {
    'US': `
🆘 Crisis Resources (USA):
• National Suicide Prevention: 988
• Crisis Text Line: Text HOME to 741741
• Domestic Violence Hotline: 1-800-799-7233`,
    
    'KE': `
🆘 Crisis Resources (Kenya):
• Befrienders Kenya: +254 722 178 177
• FIDA Kenya (Women's Rights): +254 20 272 4744
• Childline Kenya: 116`,
    
    'NG': `
🆘 Crisis Resources (Nigeria):
• SURPIN Nigeria: +234 806 210 0009
• Mentally Aware Nigeria: +234 809 111 0009`,
    
    'ZA': `
🆘 Crisis Resources (South Africa):
• SADAG Depression Line: 0800 567 567
• Lifeline SA: 0861 322 322
• People Opposed to Women Abuse: 011 642 4345`,
    
    'UK': `
🆘 Crisis Resources (UK):
• Samaritans: 116 123
• National Domestic Abuse Helpline: 0808 2000 247
• Mind: 0300 123 3393`,
    
    'DEFAULT': `
🆘 If you're in crisis, please reach out to local emergency services or a crisis helpline in your area. You deserve support. 💜`,
  };
  
  return resources[countryCode || 'DEFAULT'] || resources['DEFAULT'];
}

/**
 * Generate Dada's supportive response during crisis
 */
export function getDadaCrisisResponse(alert: CrisisAlert): string {
  return alert.suggestedResponse;
}
