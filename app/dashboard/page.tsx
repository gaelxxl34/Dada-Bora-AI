'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  createdAt: Date;
  type: 'user' | 'knowledge' | 'settings' | 'partner' | 'chat';
}

export default function DashboardPage() {
  const { userProfile, user } = useAuth();
  const [usersCount, setUsersCount] = useState(0);
  const [articlesCount, setArticlesCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load users count
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  // Load articles count
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'knowledgeArticles'), (snapshot) => {
      setArticlesCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  // Load categories count
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'knowledgeCategories'), (snapshot) => {
      setCategoriesCount(snapshot.size);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load recent activities (from activity logs or create from recent data)
  useEffect(() => {
    // Try to load from activityLogs collection, or create from recent users/articles
    const activitiesQuery = query(
      collection(db, 'activityLogs'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      if (snapshot.empty) {
        // If no activity logs, we'll show recent data
        setRecentActivities([]);
      } else {
        const activities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as ActivityLog[];
        setRecentActivities(activities);
      }
    }, (error) => {
      console.error('Error loading activities:', error);
      setRecentActivities([]);
    });

    return () => unsubscribe();
  }, []);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return { icon: 'ri-user-add-line', bg: 'bg-green-100', color: 'text-green-600' };
      case 'knowledge':
        return { icon: 'ri-file-edit-line', bg: 'bg-blue-100', color: 'text-blue-600' };
      case 'settings':
        return { icon: 'ri-settings-3-line', bg: 'bg-gray-100', color: 'text-gray-600' };
      case 'partner':
        return { icon: 'ri-handshake-line', bg: 'bg-purple-100', color: 'text-purple-600' };
      case 'chat':
        return { icon: 'ri-chat-3-line', bg: 'bg-amber-100', color: 'text-amber-600' };
      default:
        return { icon: 'ri-notification-line', bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  const stats = [
    {
      title: 'Total Users',
      value: isLoading ? '...' : usersCount.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: 'ri-user-line',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Knowledge Articles',
      value: isLoading ? '...' : articlesCount.toString(),
      change: `${categoriesCount} categories`,
      changeType: 'neutral',
      icon: 'ri-book-open-line',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Active Sessions',
      value: '0',
      change: 'Live',
      changeType: 'neutral',
      icon: 'ri-pulse-line',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'AI Interactions',
      value: '0',
      change: 'This month',
      changeType: 'neutral',
      icon: 'ri-robot-line',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  const defaultActivities = [
    {
      id: '1',
      action: 'System initialized',
      user: 'System',
      createdAt: new Date(),
      type: 'settings' as const,
    },
  ];

  const displayActivities = recentActivities.length > 0 ? recentActivities : defaultActivities;

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${userProfile?.displayName || user?.email?.split('@')[0] || 'Admin'}`}
    >
      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <i aria-hidden="true" className={`${stat.icon} text-lg sm:text-xl ${stat.iconColor}`} />
              </div>
              <span
                className={`text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  stat.changeType === 'positive'
                    ? 'bg-green-50 text-green-600'
                    : stat.changeType === 'negative'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-xs sm:text-sm text-warm-brown hover:underline">View all</button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {displayActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i aria-hidden="true" className="ri-history-line text-4xl mb-2 block" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                displayActivities.map((activity) => {
                  const activityStyle = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${activityStyle.bg} flex items-center justify-center flex-shrink-0`}>
                        <i aria-hidden="true" className={`${activityStyle.icon} ${activityStyle.color} text-sm sm:text-base`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                        <p className="text-xs text-gray-500 truncate">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
            <Link
              href="/dashboard/users"
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 hover:border-warm-brown/30 hover:bg-cream-50 transition-all group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-warm-brown/10 flex items-center justify-center group-hover:bg-warm-brown group-hover:text-white transition-colors flex-shrink-0">
                <i aria-hidden="true" className="ri-user-add-line text-warm-brown group-hover:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Add New User</p>
                <p className="text-xs text-gray-500 hidden sm:block">Create new accounts</p>
              </div>
            </Link>

            <Link
              href="/dashboard/knowledge-base"
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 hover:border-warm-brown/30 hover:bg-cream-50 transition-all group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-600 transition-colors flex-shrink-0">
                <i aria-hidden="true" className="ri-add-circle-line text-purple-600 group-hover:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Add Knowledge</p>
                <p className="text-xs text-gray-500 hidden sm:block">Expand AI training</p>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 hover:border-warm-brown/30 hover:bg-cream-50 transition-all group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-600 transition-colors flex-shrink-0">
                <i aria-hidden="true" className="ri-settings-3-line text-gray-600 group-hover:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Configure Settings</p>
                <p className="text-xs text-gray-500 hidden sm:block">Platform preferences</p>
              </div>
            </Link>

            <button className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 hover:border-warm-brown/30 hover:bg-cream-50 transition-all group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-600 transition-colors flex-shrink-0">
                <i aria-hidden="true" className="ri-download-2-line text-green-600 group-hover:text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-gray-900">Export Report</p>
                <p className="text-xs text-gray-500 hidden sm:block">Download analytics</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-warm-brown to-amber-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-server-line text-xl sm:text-2xl" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">System Status</h3>
              <p className="text-white/80 text-xs sm:text-sm">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">99.9%</p>
              <p className="text-xs text-white/70">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">45ms</p>
              <p className="text-xs text-white/70">Response</p>
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm font-medium">Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
