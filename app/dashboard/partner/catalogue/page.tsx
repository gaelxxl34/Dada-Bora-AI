'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface CatalogueImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  productId?: string;
  tags: string[];
  createdAt: Date;
  partnerId: string;
}

const imageCategories = [
  'Product Photos',
  'Lifestyle',
  'Behind the Scenes',
  'Store/Location',
  'Events',
  'Team',
  'Other',
];

export default function PartnerCataloguePage() {
  const { user } = useAuth();
  const [images, setImages] = useState<CatalogueImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<CatalogueImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<CatalogueImage | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'Product Photos',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load catalogue images
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'partnerCatalogue'),
      where('partnerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const imagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as CatalogueImage[];
      
      // Sort client-side to avoid needing composite index
      imagesData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      setImages(imagesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading catalogue:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Filter images
  const filteredImages = images.filter(img => 
    selectedCategory === 'all' || img.category === selectedCategory
  );

  const handleOpenModal = (image?: CatalogueImage) => {
    if (image) {
      setEditingImage(image);
      setFormData({
        title: image.title,
        description: image.description,
        imageUrl: image.imageUrl,
        category: image.category,
        tags: image.tags.join(', '),
      });
    } else {
      setEditingImage(null);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        category: 'Product Photos',
        tags: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingImage(null);
    setMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const imageData = {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        partnerId: user.uid,
      };
      
      if (editingImage) {
        await updateDoc(doc(db, 'partnerCatalogue', editingImage.id), {
          ...imageData,
          updatedAt: Timestamp.now(),
        });
        setMessage('✅ Image updated successfully!');
      } else {
        await addDoc(collection(db, 'partnerCatalogue'), {
          ...imageData,
          createdAt: Timestamp.now(),
        });
        setMessage('✅ Image added to catalogue!');
      }
      
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      console.error('Error saving image:', error);
      setMessage('❌ Error saving image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await deleteDoc(doc(db, 'partnerCatalogue', imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <DashboardLayout
      title="Catalogue"
      subtitle="Manage your product and business images"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
          >
            <option value="all">All Categories</option>
            {imageCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <i className="ri-grid-fill" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <i className="ri-list-check" />
            </button>
          </div>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors flex items-center gap-2"
        >
          <i className="ri-image-add-line" />
          Add Image
        </button>
      </div>

      {/* Images Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown" />
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <i className="ri-image-2-line text-5xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No images yet</h3>
          <p className="text-gray-500 mb-4">Start building your visual catalogue</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors"
          >
            Add Your First Image
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden aspect-square cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-medium text-sm truncate">{image.title}</p>
                  <p className="text-white/70 text-xs">{image.category}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(image);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <i className="ri-edit-line text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <i className="ri-delete-bin-line text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Image</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredImages.map((image) => (
                <tr key={image.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{image.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{image.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{image.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {image.createdAt?.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(image)}
                      className="p-2 text-gray-500 hover:text-warm-brown hover:bg-warm-brown/10 rounded-lg transition-colors"
                    >
                      <i className="ri-edit-line" />
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
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

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <i className="ri-close-line text-3xl" />
            </button>
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="bg-white p-4 rounded-b-lg">
              <h3 className="font-semibold text-gray-900">{selectedImage.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{selectedImage.description}</p>
              <div className="flex gap-2 mt-2">
                {selectedImage.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingImage ? 'Edit Image' : 'Add New Image'}
              </h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Invalid+URL';
                      }}
                    />
                  </div>
                )}
              </div>
              
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
                  placeholder="e.g., Summer Collection 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="Describe this image..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                >
                  {imageCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="summer, fashion, new"
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
                  {saving ? 'Saving...' : editingImage ? 'Update' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
