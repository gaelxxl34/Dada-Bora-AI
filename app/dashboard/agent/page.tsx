'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  categoryName: string;
}

export default function AgentDashboardPage() {
  const { userProfile, user } = useAuth();
  const [myArticlesCount, setMyArticlesCount] = useState(0);
  const [totalArticlesCount, setTotalArticlesCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load agent's article count
  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
      collection(db, 'knowledgeArticles'),
      where('createdBy', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyArticlesCount(snapshot.size);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Load total articles count
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'knowledgeArticles'), (snapshot) => {
      setTotalArticlesCount(snapshot.size);
    });
    
    return () => unsubscribe();
  }, []);

  // Load categories count
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'knowledgeCategories'), (snapshot) => {
      setCategoriesCount(snapshot.size);
    });
    
    return () => unsubscribe();
  }, []);

  // Load recent articles by this agent
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'knowledgeArticles'),
      where('createdBy', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const articles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Article[];
      
      // Sort client-side and limit to 5
      articles.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      setRecentArticles(articles.slice(0, 5));
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading articles:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const stats = [
    {
      name: 'My Articles',
      value: myArticlesCount,
      icon: 'ri-file-text-line',
      color: 'bg-blue-500',
      href: '/dashboard/agent/my-articles',
    },
    {
      name: 'Total KB Articles',
      value: totalArticlesCount,
      icon: 'ri-book-open-line',
      color: 'bg-green-500',
      href: '/dashboard/agent/knowledge-base',
    },
    {
      name: 'Categories',
      value: categoriesCount,
      icon: 'ri-folder-line',
      color: 'bg-purple-500',
      href: '/dashboard/agent/knowledge-base',
    },
  ];

  const quickActions = [
    {
      name: 'New Article',
      description: 'Create a knowledge base article',
      icon: 'ri-file-add-line',
      href: '/dashboard/agent/my-articles?action=new',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Browse KB',
      description: 'Search the knowledge base',
      icon: 'ri-search-line',
      href: '/dashboard/agent/knowledge-base',
      color: 'text-green-600 bg-green-50',
    },
    {
      name: 'Chat Support',
      description: 'View customer conversations',
      icon: 'ri-chat-3-line',
      href: '/dashboard/agent/chat',
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      review: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout
      title={`Welcome, ${userProfile?.displayName || 'Agent'}`}
      subtitle="Manage knowledge base articles and support customers"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <i className={`${stat.icon} text-white text-xl`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-warm-brown/30 hover:shadow-sm transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <i className={`${action.icon} text-xl`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-warm-brown transition-colors">
                      {action.name}
                    </h3>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Articles */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Recent Articles</h2>
              <Link
                href="/dashboard/agent/my-articles"
                className="text-sm text-warm-brown hover:underline"
              >
                View All →
              </Link>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-brown" />
              </div>
            ) : recentArticles.length === 0 ? (
              <div className="text-center py-8">
                <i className="ri-file-text-line text-4xl text-gray-300 mb-2" />
                <p className="text-gray-500">You haven&apos;t written any articles yet</p>
                <Link
                  href="/dashboard/agent/my-articles?action=new"
                  className="mt-3 inline-block text-warm-brown hover:underline text-sm"
                >
                  Write your first article →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/dashboard/agent/my-articles?edit=${article.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{article.title}</h4>
                        <p className="text-sm text-gray-500">
                          {article.categoryName} • {article.createdAt?.toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(article.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
        <h3 className="font-semibold text-gray-900 mb-2">
          <i className="ri-lightbulb-line text-green-600 mr-2" />
          Agent Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Write clear, concise articles that help customers find answers quickly</li>
          <li>• Use the &quot;review&quot; status to submit articles for admin approval</li>
          <li>• You can view all knowledge base articles but only edit your own</li>
          <li>• Keep articles updated with the latest information</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
