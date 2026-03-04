'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface Article {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  status: 'published' | 'draft' | 'review';
  views: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName?: string;
}

export default function AgentKnowledgeBasePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);

  // Load categories
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'knowledgeCategories'), orderBy('name')),
      (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesData);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load ALL articles (agents can view all published articles)
  useEffect(() => {
    const q = query(
      collection(db, 'knowledgeArticles'),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const articlesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Article[];
      
      setArticles(articlesData);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Check if current user can edit this article
  const canEdit = (article: Article) => {
    return article.createdBy === user?.uid;
  };

  // Filter articles - show published to all, show drafts/review only if owner
  const filteredArticles = articles.filter(article => {
    // Non-owners can only see published articles
    if (article.createdBy !== user?.uid && article.status !== 'published') {
      return false;
    }
    
    const matchesCategory = selectedCategory === 'all' || article.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Group by category for sidebar counts
  const categoryCounts = articles.reduce((acc, article) => {
    if (article.status === 'published' || article.createdBy === user?.uid) {
      acc[article.categoryId] = (acc[article.categoryId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Increment view count and show article
  const handleViewArticle = async (article: Article) => {
    setViewingArticle(article);
    
    // Only increment views for articles not owned by current user
    if (article.createdBy !== user?.uid) {
      try {
        await updateDoc(doc(db, 'knowledgeArticles', article.id), {
          views: increment(1)
        });
      } catch (error) {
        console.error('Error updating views:', error);
      }
    }
  };

  // Navigate to edit (only for own articles)
  const handleEdit = (article: Article) => {
    if (canEdit(article)) {
      router.push(`/dashboard/agent/my-articles?edit=${article.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      review: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout
      title="Knowledge Base"
      subtitle="Browse all articles - you can edit your own contributions"
    >
      <div className="flex gap-6">
        {/* Categories Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-warm-brown text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>All Articles</span>
                <span className={`text-xs ${selectedCategory === 'all' ? 'text-white/80' : 'text-gray-400'}`}>
                  {filteredArticles.length}
                </span>
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-warm-brown text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color || '#6B7280' }}
                    />
                    {category.name}
                  </span>
                  <span className={`text-xs ${selectedCategory === category.id ? 'text-white/80' : 'text-gray-400'}`}>
                    {categoryCounts[category.id] || 0}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Quick Action */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => router.push('/dashboard/agent/my-articles?action=new')}
                className="w-full px-4 py-2 bg-warm-brown/10 text-warm-brown rounded-lg hover:bg-warm-brown/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <i className="ri-add-line" />
                Write New Article
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown bg-white"
              />
            </div>
          </div>

          {/* Mobile Category Filter */}
          <div className="lg:hidden mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Articles Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <i className="ri-article-line text-5xl text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'This category is empty'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map(article => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-warm-brown/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${categories.find(c => c.id === article.categoryId)?.color}20` || '#6B728020',
                            color: categories.find(c => c.id === article.categoryId)?.color || '#6B7280',
                          }}
                        >
                          {article.categoryName}
                        </span>
                        {getStatusBadge(article.status)}
                        {canEdit(article) && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            Your Article
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h3>
                      <p className="text-gray-600 line-clamp-2 mb-3">
                        {article.content.substring(0, 200)}...
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <i className="ri-eye-line" />
                          {article.views || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-user-line" />
                          {article.createdByName || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-time-line" />
                          {article.updatedAt?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewArticle(article)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Read
                      </button>
                      {canEdit(article) && (
                        <button
                          onClick={() => handleEdit(article)}
                          className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors text-sm"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article View Modal */}
      {viewingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${categories.find(c => c.id === viewingArticle.categoryId)?.color}20` || '#6B728020',
                      color: categories.find(c => c.id === viewingArticle.categoryId)?.color || '#6B7280',
                    }}
                  >
                    {viewingArticle.categoryName}
                  </span>
                  {getStatusBadge(viewingArticle.status)}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{viewingArticle.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  By {viewingArticle.createdByName || 'Unknown'} • {viewingArticle.updatedAt?.toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setViewingArticle(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose max-w-none">
                {viewingArticle.content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-700 mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <i className="ri-eye-line" />
                {viewingArticle.views || 0} views
              </span>
              <div className="flex gap-2">
                {canEdit(viewingArticle) && (
                  <button
                    onClick={() => {
                      setViewingArticle(null);
                      handleEdit(viewingArticle);
                    }}
                    className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors text-sm"
                  >
                    Edit Article
                  </button>
                )}
                <button
                  onClick={() => setViewingArticle(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
