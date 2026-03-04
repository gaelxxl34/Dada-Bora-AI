/**
 * API Route for User Analytics
 * Provides statistics on users by region, country, and other demographics
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthTokenExtended, hasPermission } from '@/lib/auth-middleware';
import { REGION_NAMES, WorldRegion } from '@/lib/phone-location';

export const dynamic = 'force-dynamic';

interface UserStats {
  totalUsers: number;
  activeUsers: number; // Users who messaged in last 7 days
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  byCategory: {
    whatsapp: number;
    web: number;
    unknown: number;
  };
  byRegion: Record<string, { count: number; percentage: number; countries: Record<string, number> }>;
  byCountry: Array<{ country: string; countryCode: string; region: string; count: number }>;
  byRelationshipStage: Record<string, number>;
  byLanguage: Record<string, number>;
  averageTrustScore: number;
  crisisStats: {
    usersWithCrisisHistory: number;
    requiresCarefulHandling: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthTokenExtended(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (admin, super_admin, or agent can view)
    const userRole = authResult.user.role || '';
    if (!hasPermission(userRole, 'analytics')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all user profiles
    const profilesSnapshot = await adminDb.collection('userProfiles').get();
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize counters
    const stats: UserStats = {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      byCategory: {
        whatsapp: 0,
        web: 0,
        unknown: 0,
      },
      byRegion: {},
      byCountry: [],
      byRelationshipStage: {},
      byLanguage: {},
      averageTrustScore: 0,
      crisisStats: {
        usersWithCrisisHistory: 0,
        requiresCarefulHandling: 0,
      },
    };

    let totalTrustScore = 0;
    const countryMap: Record<string, { country: string; countryCode: string; region: string; count: number }> = {};

    // Process each profile — only count "normal" users (those with phone interaction)
    profilesSnapshot.docs.forEach(doc => {
      const profile = doc.data();
      const chatId = doc.id;

      // Categorize user by channel
      // WhatsApp users have chatId starting with "whatsapp:" 
      // Web users have a phoneHash or came from the web chat
      const isWhatsApp = chatId.startsWith('whatsapp:');
      const isWeb = !isWhatsApp && (profile.phoneHash || chatId.startsWith('web-'));

      if (isWhatsApp) {
        stats.byCategory.whatsapp++;
      } else if (isWeb) {
        stats.byCategory.web++;
      } else {
        stats.byCategory.unknown++;
      }

      stats.totalUsers++;

      // Check activity
      if (profile.lastInteraction) {
        const lastInteraction = profile.lastInteraction.toDate();
        if (lastInteraction >= oneWeekAgo) {
          stats.activeUsers++;
        }
      }

      // Check new users
      if (profile.firstInteraction) {
        const firstInteraction = profile.firstInteraction.toDate();
        if (firstInteraction >= oneDayAgo) {
          stats.newUsersToday++;
        }
        if (firstInteraction >= oneWeekAgo) {
          stats.newUsersThisWeek++;
        }
        if (firstInteraction >= oneMonthAgo) {
          stats.newUsersThisMonth++;
        }
      }

      // Count by region
      const region = profile.location?.region || 'unknown';
      if (!stats.byRegion[region]) {
        stats.byRegion[region] = { count: 0, percentage: 0, countries: {} };
      }
      stats.byRegion[region].count++;

      // Count by country
      const countryCode = profile.location?.countryCode || 'UNKNOWN';
      const countryName = profile.location?.country || 'Unknown';
      
      if (!countryMap[countryCode]) {
        countryMap[countryCode] = {
          country: countryName,
          countryCode,
          region,
          count: 0,
        };
      }
      countryMap[countryCode].count++;
      
      // Also track in region's countries
      if (stats.byRegion[region]) {
        stats.byRegion[region].countries[countryName] = 
          (stats.byRegion[region].countries[countryName] || 0) + 1;
      }

      // Count by relationship stage
      const stage = profile.relationshipStage || 'unknown';
      stats.byRelationshipStage[stage] = (stats.byRelationshipStage[stage] || 0) + 1;

      // Count by language
      const language = profile.languagePreference || profile.detectedLanguage || 'unknown';
      stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;

      // Trust score
      if (typeof profile.trustScore === 'number') {
        totalTrustScore += profile.trustScore;
      }

      // Crisis stats
      if (profile.hasCrisisHistory) {
        stats.crisisStats.usersWithCrisisHistory++;
      }
      if (profile.requiresCarefulHandling) {
        stats.crisisStats.requiresCarefulHandling++;
      }
    });

    // Calculate percentages and averages
    Object.keys(stats.byRegion).forEach(region => {
      stats.byRegion[region].percentage = 
        Math.round((stats.byRegion[region].count / stats.totalUsers) * 100);
    });

    stats.averageTrustScore = stats.totalUsers > 0 
      ? Math.round(totalTrustScore / stats.totalUsers)
      : 0;

    // Convert country map to sorted array
    stats.byCountry = Object.values(countryMap)
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
