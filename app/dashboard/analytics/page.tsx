'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
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

// Region display config with colors and icons
const REGION_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  'africa-east': { name: 'East Africa', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🌍' },
  'africa-west': { name: 'West Africa', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '🌍' },
  'africa-south': { name: 'Southern Africa', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '🌍' },
  'africa-north': { name: 'North Africa', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: '🌍' },
  'africa-central': { name: 'Central Africa', color: 'text-lime-600', bgColor: 'bg-lime-100', icon: '🌍' },
  'caribbean': { name: 'Caribbean', color: 'text-cyan-600', bgColor: 'bg-cyan-100', icon: '🏝️' },
  'north-america': { name: 'North America', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🇺🇸' },
  'south-america': { name: 'South America', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: '🌎' },
  'europe': { name: 'Europe', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: '🇪🇺' },
  'asia': { name: 'Asia & Middle East', color: 'text-rose-600', bgColor: 'bg-rose-100', icon: '🌏' },
  'oceania': { name: 'Oceania', color: 'text-teal-600', bgColor: 'bg-teal-100', icon: '🌊' },
  'unknown': { name: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '❓' },
};

// Relationship stage display
const STAGE_LABELS: Record<string, string> = {
  'new': '🌱 New',
  'getting-to-know': '👋 Getting to Know',
  'familiar': '🤝 Familiar',
  'trusted': '💜 Trusted',
  'close': '👯‍♀️ Close Sisters',
};

export default function UserAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch('/api/analytics/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="User Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="User Analytics">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout title="User Analytics">
        <div className="text-gray-500">No data available</div>
      </DashboardLayout>
    );
  }

  // Calculate Africa totals
  const africaTotal = Object.entries(stats.byRegion)
    .filter(([region]) => region.startsWith('africa-'))
    .reduce((sum, [_, data]) => sum + data.count, 0);

  const diasporaTotal = Object.entries(stats.byRegion)
    .filter(([region]) => ['caribbean', 'north-america', 'south-america', 'europe'].includes(region))
    .reduce((sum, [_, data]) => sum + data.count, 0);

  return (
    <DashboardLayout title="User Analytics" subtitle="Understand your community by location">
      <div className="space-y-6">

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-purple-600">{stats.totalUsers}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">{stats.activeUsers}</div>
            <div className="text-sm text-gray-500">Active (7 days)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-blue-600">{stats.newUsersThisWeek}</div>
            <div className="text-sm text-gray-500">New This Week</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-amber-600">{stats.averageTrustScore}</div>
            <div className="text-sm text-gray-500">Avg Trust Score</div>
          </div>
        </div>

        {/* User Categories */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Users by Channel</h2>
            <p className="text-sm text-gray-500">How users are connecting with Dada</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-whatsapp-line text-green-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.byCategory?.whatsapp || 0}</div>
                <div className="text-sm text-green-600">WhatsApp Users</div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-global-line text-blue-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.byCategory?.web || 0}</div>
                <div className="text-sm text-blue-600">Web Chat Users</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="ri-user-line text-gray-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-700">{stats.byCategory?.unknown || 0}</div>
                <div className="text-sm text-gray-600">Other</div>
              </div>
            </div>
          </div>
        </div>

        {/* Africa vs Diaspora Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🌍</span>
              <div>
                <div className="text-2xl font-bold text-green-700">{africaTotal}</div>
                <div className="text-green-600 font-medium">Users in Africa</div>
              </div>
            </div>
            <div className="text-sm text-green-600">
              {stats.totalUsers > 0 ? Math.round((africaTotal / stats.totalUsers) * 100) : 0}% of total users
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🌎</span>
              <div>
                <div className="text-2xl font-bold text-purple-700">{diasporaTotal}</div>
                <div className="text-purple-600 font-medium">Users in Diaspora</div>
              </div>
            </div>
            <div className="text-sm text-purple-600">
              {stats.totalUsers > 0 ? Math.round((diasporaTotal / stats.totalUsers) * 100) : 0}% of total users
            </div>
          </div>
        </div>

        {/* Users by Region */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Users by Region</h2>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(stats.byRegion)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([region, data]) => {
                const config = REGION_CONFIG[region] || REGION_CONFIG['unknown'];
                const isExpanded = expandedRegion === region;
                const countryList = Object.entries(data.countries || {})
                  .sort((a, b) => b[1] - a[1]);

                return (
                  <div key={region} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedRegion(isExpanded ? null : region)}
                      className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${config.bgColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="text-left">
                          <div className={`font-medium ${config.color}`}>{config.name}</div>
                          <div className="text-sm text-gray-500">
                            {countryList.length} {countryList.length === 1 ? 'country' : 'countries'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">{data.count}</div>
                          <div className="text-sm text-gray-500">{data.percentage}%</div>
                        </div>
                        <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-400`}></i>
                      </div>
                    </button>
                    
                    {isExpanded && countryList.length > 0 && (
                      <div className="border-t bg-white p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {countryList.map(([country, count]) => (
                            <div 
                              key={country} 
                              className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg"
                            >
                              <span className="text-sm text-gray-700">{country}</span>
                              <span className="text-sm font-semibold text-gray-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Countries</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {stats.byCountry.slice(0, 10).map((country, index) => {
                const percentage = stats.totalUsers > 0 
                  ? Math.round((country.count / stats.totalUsers) * 100)
                  : 0;
                
                return (
                  <div key={country.countryCode} className="flex items-center gap-3">
                    <div className="w-6 text-center text-gray-400 font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">{country.country}</span>
                        <span className="text-sm text-gray-500">{country.count} users</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Relationship Stages & Languages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Relationship Stages */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Relationship Stages</h2>
              <p className="text-sm text-gray-500">How well Dada knows your users</p>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(stats.byRelationshipStage)
                .sort((a, b) => {
                  const order = ['new', 'getting-to-know', 'familiar', 'trusted', 'close'];
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                })
                .map(([stage, count]) => {
                  const label = STAGE_LABELS[stage] || stage;
                  const percentage = stats.totalUsers > 0
                    ? Math.round((count / stats.totalUsers) * 100)
                    : 0;

                  return (
                    <div key={stage}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-700">{label}</span>
                        <span className="text-sm font-medium text-gray-900">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Languages</h2>
              <p className="text-sm text-gray-500">Detected from user locations</p>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(stats.byLanguage)
                .sort((a, b) => b[1] - a[1])
                .map(([language, count]) => {
                  const percentage = stats.totalUsers > 0
                    ? Math.round((count / stats.totalUsers) * 100)
                    : 0;

                  return (
                    <div key={language} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700 capitalize">{language}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Crisis Stats */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Sensitive User Stats</h2>
            <p className="text-sm text-gray-500">Users requiring extra care</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-heart-pulse-line text-amber-600 text-xl"></i>
                <span className="text-amber-700 font-medium">Crisis History</span>
              </div>
              <div className="text-2xl font-bold text-amber-800">
                {stats.crisisStats.usersWithCrisisHistory}
              </div>
              <div className="text-sm text-amber-600">
                Users who have had crisis moments
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-shield-user-line text-red-600 text-xl"></i>
                <span className="text-red-700 font-medium">Careful Handling</span>
              </div>
              <div className="text-2xl font-bold text-red-800">
                {stats.crisisStats.requiresCarefulHandling}
              </div>
              <div className="text-sm text-red-600">
                Users requiring extra sensitivity
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
