'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: {
    title: string;
    content: string;
    categoryId: string;
    status: 'draft' | 'review' | 'published';
    tags: string[];
  }) => Promise<void>;
  categories: Category[];
  editArticle?: {
    id: string;
    title: string;
    content: string;
    categoryId: string;
    status: 'draft' | 'review' | 'published';
    tags: string[];
  } | null;
}

export default function ArticleModal({ isOpen, onClose, onSave, categories, editArticle }: ArticleModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editArticle) {
      setTitle(editArticle.title);
      setContent(editArticle.content);
      setCategoryId(editArticle.categoryId);
      setStatus(editArticle.status);
      setTags(editArticle.tags || []);
    } else {
      setTitle('');
      setContent('');
      setCategoryId('');
      setStatus('draft');
      setTags([]);
    }
  }, [editArticle, isOpen]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        title,
        content,
        categoryId,
        status,
        tags,
      });
      setTitle('');
      setContent('');
      setCategoryId('');
      setStatus('draft');
      setTags([]);
      onClose();
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white sm:rounded-2xl max-w-4xl w-full shadow-xl min-h-screen sm:min-h-0 sm:my-8">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white sm:rounded-t-2xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {editArticle ? 'Edit Article' : 'Create New Article'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i aria-hidden="true" className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="articleTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Article Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="articleTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title..."
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            />
          </div>

          {/* Category & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Category */}
            <div>
              <label htmlFor="articleCategory" className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="articleCategory"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="articleStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="articleStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'review' | 'published')}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="articleContent" className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="articleContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here..."
              required
              rows={8}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length} characters
            </p>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="articleTags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="articleTags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-warm-brown/10 text-warm-brown rounded-full text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-warm-brown/20 rounded-full p-0.5"
                    >
                      <i aria-hidden="true" className="ri-close-line text-sm" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-4 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim() || !categoryId}
              className="w-full sm:flex-1 px-4 py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : editArticle ? 'Update Article' : 'Create Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
