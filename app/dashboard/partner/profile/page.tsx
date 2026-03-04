'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessProfile {
  businessName: string;
  businessType: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  socialMedia: {
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
  };
  logo: string;
  coverImage: string;
  foundedYear: string;
  employeeCount: string;
}

const businessTypes = [
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Food & Beverage',
  'Health & Wellness',
  'Home & Living',
  'Technology',
  'Art & Crafts',
  'Services',
  'Other',
];

export default function PartnerProfilePage() {
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: '',
    businessType: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    socialMedia: {
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
    },
    logo: '',
    coverImage: '',
    foundedYear: '',
    employeeCount: '',
  });

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) return;
      
      try {
        const docRef = doc(db, 'partnerProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            businessName: data.businessName || '',
            businessType: data.businessType || '',
            description: data.description || '',
            email: data.email || userProfile?.email || '',
            phone: data.phone || '',
            website: data.website || '',
            socialMedia: {
              instagram: data.socialMedia?.instagram || '',
              facebook: data.socialMedia?.facebook || '',
              twitter: data.socialMedia?.twitter || '',
              tiktok: data.socialMedia?.tiktok || '',
            },
            logo: data.logo || '',
            coverImage: data.coverImage || '',
            foundedYear: data.foundedYear || '',
            employeeCount: data.employeeCount || '',
          });
        } else {
          // Set defaults from user profile
          setProfile(prev => ({
            ...prev,
            email: userProfile?.email || '',
            businessName: userProfile?.businessName || '',
          }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [user?.uid, userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const docRef = doc(db, 'partnerProfiles', user.uid);
      await setDoc(docRef, {
        ...profile,
        partnerId: user.uid,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      
      // Also update the main user document with business name
      await setDoc(doc(db, 'users', user.uid), {
        businessName: profile.businessName,
        phone: profile.phone,
      }, { merge: true });
      
      setMessage('✅ Profile saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('❌ Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateProfileCompletion = () => {
    const fields = [
      profile.businessName,
      profile.businessType,
      profile.description,
      profile.email,
      profile.phone,
      profile.logo,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Business Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown" />
        </div>
      </DashboardLayout>
    );
  }

  const completion = calculateProfileCompletion();

  return (
    <DashboardLayout
      title="Business Profile"
      subtitle="Tell customers about your business"
    >
      <form onSubmit={handleSave} className="max-w-4xl">
        {/* Profile Completion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Profile Completion</h3>
            <span className={`font-semibold ${completion === 100 ? 'text-green-600' : 'text-warm-brown'}`}>
              {completion}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${completion === 100 ? 'bg-green-500' : 'bg-warm-brown'}`}
              style={{ width: `${completion}%` }}
            />
          </div>
          {completion < 100 && (
            <p className="text-sm text-gray-500 mt-2">
              Complete your profile to help customers learn about your business
            </p>
          )}
        </div>

        {/* Cover Image */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="h-48 bg-gray-100 relative">
            {profile.coverImage ? (
              <img
                src={profile.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <i className="ri-image-line text-4xl text-gray-300" />
                  <p className="text-gray-400 text-sm mt-2">No cover image</p>
                </div>
              </div>
            )}
            
            {/* Logo */}
            <div className="absolute -bottom-12 left-6">
              <div className="w-24 h-24 rounded-xl bg-white shadow-lg border-4 border-white overflow-hidden">
                {profile.logo ? (
                  <img
                    src={profile.logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <i className="ri-store-2-line text-3xl text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 pt-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={profile.logo}
                  onChange={(e) => setProfile({ ...profile, logo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={profile.coverImage}
                  onChange={(e) => setProfile({ ...profile, coverImage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Business Information</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type *
                </label>
                <select
                  required
                  value={profile.businessType}
                  onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                >
                  <option value="">Select type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                About Your Business *
              </label>
              <textarea
                required
                rows={4}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="Tell customers about your business, what makes it unique, and what you offer..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Founded
                </label>
                <input
                  type="text"
                  value={profile.foundedYear}
                  onChange={(e) => setProfile({ ...profile, foundedYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Size
                </label>
                <select
                  value={profile.employeeCount}
                  onChange={(e) => setProfile({ ...profile, employeeCount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                >
                  <option value="">Select</option>
                  <option value="1">Just me</option>
                  <option value="2-5">2-5 people</option>
                  <option value="6-10">6-10 people</option>
                  <option value="11-50">11-50 people</option>
                  <option value="50+">50+ people</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="contact@yourbusiness.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                  placeholder="+256..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="https://www.yourbusiness.com"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Social Media</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="ri-instagram-line mr-1" /> Instagram
              </label>
              <input
                type="text"
                value={profile.socialMedia.instagram}
                onChange={(e) => setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, instagram: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="@yourbusiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="ri-facebook-line mr-1" /> Facebook
              </label>
              <input
                type="text"
                value={profile.socialMedia.facebook}
                onChange={(e) => setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, facebook: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="facebook.com/yourbusiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="ri-twitter-x-line mr-1" /> Twitter/X
              </label>
              <input
                type="text"
                value={profile.socialMedia.twitter}
                onChange={(e) => setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, twitter: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="@yourbusiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="ri-tiktok-line mr-1" /> TikTok
              </label>
              <input
                type="text"
                value={profile.socialMedia.tiktok}
                onChange={(e) => setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, tiktok: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                placeholder="@yourbusiness"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className="ri-save-line" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
