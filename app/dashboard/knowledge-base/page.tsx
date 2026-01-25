'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, increment, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import CategoryModal from '../../../components/dashboard/CategoryModal';
import ArticleModal from '../../../components/dashboard/ArticleModal';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
  createdAt: Date;
  createdBy: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  status: 'published' | 'draft' | 'review';
  views: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryMenu, setShowCategoryMenu] = useState<string | null>(null);

  // Load categories from Firestore
  useEffect(() => {
    const q = query(collection(db, 'knowledgeCategories'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Category[];
      
      setCategories(categoriesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading categories:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load articles from Firestore
  useEffect(() => {
    const q = query(collection(db, 'knowledgeArticles'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const articlesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Article[];
      
      setArticles(articlesData);
    }, (error) => {
      console.error('Error loading articles:', error);
    });

    return () => unsubscribe();
  }, []);

  // Calculate total count for "All Categories"
  const totalCount = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

  // Filter articles based on selected category and search query
  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    review: articles.filter(a => a.status === 'review').length,
    draft: articles.filter(a => a.status === 'draft').length,
  };

  // Handle create/update category
  const handleSaveCategory = async (categoryData: { name: string; description: string; color: string }) => {
    try {
      if (editingCategory) {
        // Update existing category
        await updateDoc(doc(db, 'knowledgeCategories', editingCategory.id), {
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new category
        await addDoc(collection(db, 'knowledgeCategories'), {
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          count: 0,
          createdAt: Timestamp.now(),
          createdBy: 'current-user-id', // TODO: Replace with actual user ID from auth
          updatedAt: Timestamp.now(),
        });
      }
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      throw error;
    }
  };

  // Handle create/update article
  const handleSaveArticle = async (articleData: {
    title: string;
    content: string;
    categoryId: string;
    status: 'draft' | 'review' | 'published';
    tags: string[];
  }) => {
    try {
      const category = categories.find(c => c.id === articleData.categoryId);
      if (!category) throw new Error('Category not found');

      if (editingArticle) {
        // Update existing article
        const oldCategoryId = editingArticle.categoryId;
        await updateDoc(doc(db, 'knowledgeArticles', editingArticle.id), {
          title: articleData.title,
          content: articleData.content,
          categoryId: articleData.categoryId,
          categoryName: category.name,
          status: articleData.status,
          tags: articleData.tags,
          updatedAt: Timestamp.now(),
        });

        // Update category counts if category changed
        if (oldCategoryId !== articleData.categoryId) {
          await updateDoc(doc(db, 'knowledgeCategories', oldCategoryId), {
            count: increment(-1),
          });
          await updateDoc(doc(db, 'knowledgeCategories', articleData.categoryId), {
            count: increment(1),
          });
        }
      } else {
        // Create new article
        await addDoc(collection(db, 'knowledgeArticles'), {
          title: articleData.title,
          content: articleData.content,
          categoryId: articleData.categoryId,
          categoryName: category.name,
          status: articleData.status,
          tags: articleData.tags,
          views: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'current-user-id', // TODO: Replace with actual user ID from auth
        });

        // Increment category count
        await updateDoc(doc(db, 'knowledgeCategories', articleData.categoryId), {
          count: increment(1),
        });
      }
      setEditingArticle(null);
    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId: string) => {
    const articlesInCategory = articles.filter(a => a.categoryId === categoryId).length;
    
    if (articlesInCategory > 0) {
      alert(`Cannot delete this category. It contains ${articlesInCategory} article(s). Please reassign or delete those articles first.`);
      return;
    }

    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'knowledgeCategories', categoryId));
        setShowCategoryMenu(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  // Handle delete article
  const handleDeleteArticle = async (articleId: string) => {
    if (window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      try {
        const article = articles.find(a => a.id === articleId);
        if (article) {
          await deleteDoc(doc(db, 'knowledgeArticles', articleId));
          // Decrement category count
          await updateDoc(doc(db, 'knowledgeCategories', article.categoryId), {
            count: increment(-1),
          });
        }
      } catch (error) {
        console.error('Error deleting article:', error);
      }
    }
  };

  // Handle edit category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
    setShowCategoryMenu(null);
  };

  // Handle edit article
  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsArticleModalOpen(true);
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get color classes for category
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <DashboardLayout
      title="Knowledge Base"
      subtitle="Manage AI training content and resources"
    >
      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        editCategory={editingCategory}
      />

      {/* Article Modal */}
      <ArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => {
          setIsArticleModalOpen(false);
          setEditingArticle(null);
        }}
        onSave={handleSaveArticle}
        categories={categories}
        editArticle={editingArticle}
      />

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-file-text-line text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 truncate">Total Articles</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-check-double-line text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.published}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-time-line text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.review}</p>
              <p className="text-xs text-gray-500">In Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-draft-line text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.draft}</p>
              <p className="text-xs text-gray-500">Drafts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        {/* Categories - Horizontal scroll on mobile, sidebar on desktop */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Categories</h3>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="p-1.5 text-warm-brown hover:bg-warm-brown/10 rounded-lg transition-colors"
                title="Add Category"
              >
                <i aria-hidden="true" className="ri-add-line text-lg" />
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-warm-brown/20 border-t-warm-brown rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex lg:flex-col gap-2 sm:gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-3 px-3 lg:mx-0 lg:px-0">
                {/* All Categories */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex-shrink-0 lg:w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-warm-brown text-white'
                      : 'text-gray-600 hover:bg-gray-50 bg-gray-50 lg:bg-transparent'
                  }`}
                >
                  <span>All Categories</span>
                  <span
                    className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ml-2 ${
                      selectedCategory === 'all'
                        ? 'bg-white/20'
                        : 'bg-gray-100'
                    }`}
                  >
                    {totalCount}
                  </span>
                </button>

                {/* Dynamic Categories */}
                {categories.map((category) => {
                  const colors = getColorClasses(category.color);
                  return (
                    <div key={category.id} className="relative group">
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex-shrink-0 lg:w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                          selectedCategory === category.id
                            ? 'bg-warm-brown text-white'
                            : 'text-gray-600 hover:bg-gray-50 bg-gray-50 lg:bg-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selectedCategory === category.id ? 'bg-white' : colors.bg}`} />
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                              selectedCategory === category.id
                                ? 'bg-white/20'
                                : 'bg-gray-100'
                            }`}
                          >
                            {category.count || 0}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCategoryMenu(showCategoryMenu === category.id ? null : category.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <i aria-hidden="true" className="ri-more-2-fill text-xs" />
                          </button>
                        </div>
                      </button>

                      {/* Category Actions Menu */}
                      {showCategoryMenu === category.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 min-w-[150px]">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <i aria-hidden="true" className="ri-edit-line" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <i aria-hidden="true" className="ri-delete-bin-line" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {categories.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <i aria-hidden="true" className="ri-folder-add-line text-2xl mb-2 block" />
                    No categories yet.
                    <br />
                    Click + to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <i aria-hidden="true" className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20"
                  />
                </div>
                <button className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors"
                  onClick={() => {
                    setEditingArticle(null);
                    setIsArticleModalOpen(true);
                  }}
                >
                  <i aria-hidden="true" className="ri-add-line" />
                  <span>Add Article</span>
                </button>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-50">
              {filteredArticles.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <i aria-hidden="true" className="ri-file-text-line text-4xl mb-2 block" />
                  <p className="text-sm">No articles found</p>
                  {categories.length === 0 && (
                    <p className="text-xs mt-1">Create a category first, then add articles</p>
                  )}
                </div>
              ) : (
                filteredArticles.map((article) => {
                  const category = categories.find(c => c.id === article.categoryId);
                  const colors = category ? getColorClasses(category.color) : getColorClasses('blue');
                  
                  return (
                    <div key={article.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <i aria-hidden="true" className={`ri-file-text-line ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{article.categoryName}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              article.status === 'published' ? 'bg-green-100 text-green-700' :
                              article.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {article.status}
                            </span>
                            <span className="text-xs text-gray-400">{article.views.toLocaleString()} views</span>
                            <span className="text-xs text-gray-400">{formatRelativeTime(article.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditArticle(article)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <i aria-hidden="true" className="ri-edit-line text-sm" />
                          </button>
                          <button 
                            onClick={() => handleDeleteArticle(article.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <i aria-hidden="true" className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="text-gray-400">
                          <i aria-hidden="true" className="ri-file-text-line text-4xl mb-2 block" />
                          <p className="text-sm">No articles found</p>
                          {categories.length === 0 && (
                            <p className="text-xs mt-1">Create a category first, then add articles</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => {
                      const category = categories.find(c => c.id === article.categoryId);
                      const colors = category ? getColorClasses(category.color) : getColorClasses('blue');
                      
                      return (
                        <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <i aria-hidden="true" className={`ri-file-text-line ${colors.text} text-sm`} />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{article.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600">{article.categoryName}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              article.status === 'published' ? 'bg-green-100 text-green-700' :
                              article.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {article.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600">{article.views.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-500">{formatRelativeTime(article.updatedAt)}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleEditArticle(article)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <i aria-hidden="true" className="ri-edit-line" />
                              </button>
                              <button 
                                onClick={() => handleDeleteArticle(article.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <i aria-hidden="true" className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500">
                Showing {filteredArticles.length} of {articles.length} articles
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
