'use client';

import { useState, useEffect } from 'react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; color: string }) => Promise<void>;
  editCategory?: { id: string; name: string; color: string } | null;
}

const colorOptions = [
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-100', textClass: 'text-green-600' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
  { value: 'pink', label: 'Pink', bgClass: 'bg-pink-100', textClass: 'text-pink-600' },
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-100', textClass: 'text-yellow-600' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-100', textClass: 'text-red-600' },
  { value: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-100', textClass: 'text-indigo-600' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-100', textClass: 'text-orange-600' },
];

export default function CategoryModal({ isOpen, onClose, onSave, editCategory }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setColor(editCategory.color);
    } else {
      setName('');
      setColor('blue');
    }
  }, [editCategory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({ name, color });
      setName('');
      setColor('blue');
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editCategory ? 'Edit Category' : 'Create New Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i aria-hidden="true" className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category Name */}
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Maternal Health, Nutrition, etc."
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-warm-brown bg-warm-brown/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${colorOption.bgClass} flex items-center justify-center`}>
                    <i aria-hidden="true" className={`ri-folder-line ${colorOption.textClass}`} />
                  </div>
                  <span className="text-xs text-gray-600">{colorOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : editCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
