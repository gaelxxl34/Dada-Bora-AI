'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  hours: string;
  isPrimary: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  partnerId: string;
}

const ugandaRegions = [
  'Central',
  'Eastern',
  'Northern',
  'Western',
];

export default function PartnerLocationsPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    region: 'Central',
    country: 'Uganda',
    phone: '',
    email: '',
    hours: '',
    isPrimary: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load locations
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'partnerLocations'),
      where('partnerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Location[];
      
      // Sort client-side: primary locations first
      locationsData.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
      
      setLocations(locationsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading locations:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const handleOpenModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        region: location.region,
        country: location.country,
        phone: location.phone,
        email: location.email || '',
        hours: location.hours,
        isPrimary: location.isPrimary,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        region: 'Central',
        country: 'Uganda',
        phone: '',
        email: '',
        hours: '',
        isPrimary: locations.length === 0, // First location is primary by default
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const locationData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        hours: formData.hours,
        isPrimary: formData.isPrimary,
        partnerId: user.uid,
      };
      
      // If setting as primary, update other locations
      if (formData.isPrimary) {
        const batch = locations.filter(l => l.isPrimary && l.id !== editingLocation?.id);
        for (const loc of batch) {
          await updateDoc(doc(db, 'partnerLocations', loc.id), { isPrimary: false });
        }
      }
      
      if (editingLocation) {
        await updateDoc(doc(db, 'partnerLocations', editingLocation.id), {
          ...locationData,
          updatedAt: Timestamp.now(),
        });
        setMessage('✅ Location updated successfully!');
      } else {
        await addDoc(collection(db, 'partnerLocations'), {
          ...locationData,
          createdAt: Timestamp.now(),
        });
        setMessage('✅ Location added successfully!');
      }
      
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      console.error('Error saving location:', error);
      setMessage('❌ Error saving location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      await deleteDoc(doc(db, 'partnerLocations', locationId));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const handleSetPrimary = async (locationId: string) => {
    try {
      // Remove primary from all other locations
      for (const loc of locations) {
        if (loc.isPrimary) {
          await updateDoc(doc(db, 'partnerLocations', loc.id), { isPrimary: false });
        }
      }
      // Set new primary
      await updateDoc(doc(db, 'partnerLocations', locationId), { isPrimary: true });
    } catch (error) {
      console.error('Error setting primary location:', error);
    }
  };

  return (
    <DashboardLayout
      title="Locations"
      subtitle="Manage your store and business locations"
    >
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500">
          {locations.length} location{locations.length !== 1 ? 's' : ''} registered
        </p>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors flex items-center gap-2"
        >
          <i className="ri-map-pin-add-line" />
          Add Location
        </button>
      </div>

      {/* Locations List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown" />
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <i className="ri-map-pin-line text-5xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No locations yet</h3>
          <p className="text-gray-500 mb-4">Add your store or business locations</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors"
          >
            Add Your First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white rounded-xl shadow-sm border ${location.isPrimary ? 'border-warm-brown' : 'border-gray-100'} p-6 relative`}
            >
              {location.isPrimary && (
                <span className="absolute top-4 right-4 px-2 py-1 bg-warm-brown text-white text-xs font-medium rounded-full">
                  Primary
                </span>
              )}
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-warm-brown/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-store-2-line text-xl text-warm-brown" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{location.name}</h3>
                  <p className="text-gray-600 mt-1">{location.address}</p>
                  <p className="text-gray-500 text-sm">
                    {location.city}, {location.region}, {location.country}
                  </p>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    {location.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <i className="ri-phone-line" />
                        <span>{location.phone}</span>
                      </div>
                    )}
                    {location.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <i className="ri-mail-line" />
                        <span>{location.email}</span>
                      </div>
                    )}
                    {location.hours && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <i className="ri-time-line" />
                        <span>{location.hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                {!location.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(location.id)}
                    className="text-sm text-warm-brown hover:underline"
                  >
                    Set as Primary
                  </button>
                )}
                {location.isPrimary && <div />}
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(location)}
                    className="p-2 text-gray-500 hover:text-warm-brown hover:bg-warm-brown/10 rounded-lg transition-colors"
                  >
                    <i className="ri-edit-line" />
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="e.g., Main Store, Kampala Branch"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="e.g., Plot 123, Kampala Road"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    placeholder="Kampala"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  >
                    {ugandaRegions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    placeholder="+256..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    placeholder="location@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Hours
                </label>
                <input
                  type="text"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="Mon-Sat: 9am-6pm, Sun: Closed"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="w-4 h-4 text-warm-brown border-gray-300 rounded focus:ring-warm-brown"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Set as primary location
                </label>
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
                  {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
