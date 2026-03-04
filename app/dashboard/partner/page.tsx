'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'out_of_stock';
}

interface CatalogueImage {
  id: string;
  url: string;
}

export default function PartnerDashboardPage() {
  const { userProfile, user } = useAuth();
  const [productsCount, setProductsCount] = useState(0);
  const [activeProductsCount, setActiveProductsCount] = useState(0);
  const [catalogueCount, setCatalogueCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load partner's products count
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'partnerProducts'),
      where('partnerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProductsCount(snapshot.size);
      const active = snapshot.docs.filter(doc => doc.data().status === 'active').length;
      setActiveProductsCount(active);
    }, (error) => {
      console.error('Error loading products:', error);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Load partner's catalogue images count
  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
      collection(db, 'partnerCatalogue'),
      where('partnerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCatalogueCount(snapshot.size);
    }, (error) => {
      console.error('Error loading catalogue:', error);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Load partner's locations count
  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
      collection(db, 'partnerLocations'),
      where('partnerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLocationsCount(snapshot.size);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading locations:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const stats = [
    {
      name: 'Total Products',
      value: productsCount,
      icon: 'ri-shopping-bag-line',
      color: 'bg-blue-500',
      href: '/dashboard/partner/products',
    },
    {
      name: 'Active Products',
      value: activeProductsCount,
      icon: 'ri-checkbox-circle-line',
      color: 'bg-green-500',
      href: '/dashboard/partner/products',
    },
    {
      name: 'Catalogue Images',
      value: catalogueCount,
      icon: 'ri-image-2-line',
      color: 'bg-purple-500',
      href: '/dashboard/partner/catalogue',
    },
    {
      name: 'Locations',
      value: locationsCount,
      icon: 'ri-map-pin-line',
      color: 'bg-orange-500',
      href: '/dashboard/partner/locations',
    },
  ];

  const quickActions = [
    {
      name: 'Add Product',
      description: 'Create a new product listing',
      icon: 'ri-add-circle-line',
      href: '/dashboard/partner/products?action=new',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Upload Images',
      description: 'Add images to your catalogue',
      icon: 'ri-image-add-line',
      href: '/dashboard/partner/catalogue?action=upload',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      name: 'Add Location',
      description: 'Add a new store location',
      icon: 'ri-map-pin-add-line',
      href: '/dashboard/partner/locations?action=new',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      name: 'Edit Profile',
      description: 'Update your business info',
      icon: 'ri-edit-line',
      href: '/dashboard/partner/profile',
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <DashboardLayout
      title={`Welcome, ${userProfile?.displayName || userProfile?.businessName || 'Partner'}`}
      subtitle="Manage your products, catalogue, and business information"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="p-4 rounded-xl border border-gray-200 hover:border-warm-brown/30 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                <i className={`${action.icon} text-xl`} />
              </div>
              <h3 className="font-medium text-gray-900 group-hover:text-warm-brown transition-colors">
                {action.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      {productsCount === 0 && (
        <div className="bg-gradient-to-br from-warm-brown/5 to-gold/10 rounded-xl p-6 border border-warm-brown/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            <i className="ri-lightbulb-line text-gold mr-2" />
            Getting Started
          </h2>
          <p className="text-gray-600 mb-4">
            Welcome to Dada Bora! Here&apos;s how to set up your partner account:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
              <span className="text-gray-700">Complete your <Link href="/dashboard/partner/profile" className="text-warm-brown font-medium hover:underline">business profile</Link></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
              <span className="text-gray-700">Add your <Link href="/dashboard/partner/products" className="text-warm-brown font-medium hover:underline">products or services</Link></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
              <span className="text-gray-700">Upload images to your <Link href="/dashboard/partner/catalogue" className="text-warm-brown font-medium hover:underline">catalogue</Link></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-warm-brown text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
              <span className="text-gray-700">Add your store <Link href="/dashboard/partner/locations" className="text-warm-brown font-medium hover:underline">locations</Link></span>
            </li>
          </ol>
        </div>
      )}
    </DashboardLayout>
  );
}
