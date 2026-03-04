'use client';

import { useState, useEffect, Suspense } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, Timestamp, increment, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  color: string;
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

function AgentMyArticlesContent() {
  const { user, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'new');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    status: 'draft' as 'draft' | 'review' | 'published',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'knowledgeCategories'), (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(categoriesData);
    });
    return () => unsubscribe();
  }, []);

  // Load agent's articles only
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
      const articlesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Article[];
      
      // Sort client-side to avoid needing composite index
      articlesData.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      
      setArticles(articlesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading articles:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Handle edit from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && articles.length > 0) {
      const article = articles.find(a => a.id === editId);
      if (article) {
        handleOpenModal(article);
      }
    }
  }, [searchParams, articles]);

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesStatus = filterStatus === 'all' || article.status === filterStatus;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenModal = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        content: article.content,
        categoryId: article.categoryId,
        status: article.status,
      });
    } else {
      setEditingArticle(null);
      setFormData({
        title: '',
        content: '',
        categoryId: categories[0]?.id || '',
        status: 'draft',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingArticle(null);
    setMessage('');
    // Clean up URL
    window.history.replaceState({}, '', '/dashboard/agent/my-articles');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const category = categories.find(c => c.id === formData.categoryId);
      if (!category) throw new Error('Please select a category');

      const articleData = {
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        categoryName: category.name,
        status: formData.status,
        updatedAt: Timestamp.now(),
      };
      
      if (editingArticle) {
        await updateDoc(doc(db, 'knowledgeArticles', editingArticle.id), articleData);
        
        // Update category count if changed
        if (editingArticle.categoryId !== formData.categoryId) {
          await updateDoc(doc(db, 'knowledgeCategories', editingArticle.categoryId), {
            count: increment(-1)
          });
          await updateDoc(doc(db, 'knowledgeCategories', formData.categoryId), {
            count: increment(1)
          });
        }
        
        setMessage('✅ Article updated successfully!');
      } else {
        await addDoc(collection(db, 'knowledgeArticles'), {
          ...articleData,
          views: 0,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          createdByName: userProfile?.displayName || user.email,
        });
        
        // Update category count
        await updateDoc(doc(db, 'knowledgeCategories', formData.categoryId), {
          count: increment(1)
        });
        
        setMessage('✅ Article created successfully!');
      }
      
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error: any) {
      console.error('Error saving article:', error);
      setMessage(`❌ ${error.message || 'Error saving article. Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        await deleteDoc(doc(db, 'knowledgeArticles', articleId));
        
        // Update category count
        await updateDoc(doc(db, 'knowledgeCategories', article.categoryId), {
          count: increment(-1)
        });
      }
    } catch (error) {
      console.error('Error deleting article:', error);
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

  // Stats
  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    review: articles.filter(a => a.status === 'review').length,
    draft: articles.filter(a => a.status === 'draft').length,
  };

  return (
    <DashboardLayout
      title="My Articles"
      subtitle="Create and manage your knowledge base articles"
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Articles</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{stats.published}</p>
          <p className="text-sm text-gray-500">Published</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-amber-600">{stats.review}</p>
          <p className="text-sm text-gray-500">In Review</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          <p className="text-sm text-gray-500">Drafts</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search your articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="review">In Review</option>
            <option value="draft">Draft</option>
          </select>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors flex items-center gap-2"
          >
            <i className="ri-add-line" />
            New Article
          </button>
        </div>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <i className="ri-file-text-line text-5xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles yet</h3>
          <p className="text-gray-500 mb-4">Start contributing to the knowledge base</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors"
          >
            Write Your First Article
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Title</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Views</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Updated</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{article.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-1 max-w-md">
                      {article.content.substring(0, 100)}...
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{article.categoryName}</td>
                  <td className="px-6 py-4">{getStatusBadge(article.status)}</td>
                  <td className="px-6 py-4 text-gray-600">{article.views || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {article.updatedAt?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(article)}
                      className="p-2 text-gray-500 hover:text-warm-brown hover:bg-warm-brown/10 rounded-lg transition-colors"
                    >
                      <i className="ri-edit-line" />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingArticle ? 'Edit Article' : 'New Article'}
              </h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="Article title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Submit for Review</option>
                    <option value="published">Published</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.status === 'review' && 'Article will be reviewed by an admin before publishing'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  required
                  rows={12}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown font-mono text-sm"
                  placeholder="Write your article content here... You can use markdown formatting."
                />
              </div>
              
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingArticle ? 'Update Article' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AgentMyArticlesPage() {
  return (
    <Suspense fallback={<DashboardLayout title="My Articles"><div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div></DashboardLayout>}>
      <AgentMyArticlesContent />
    </Suspense>
  );
}
