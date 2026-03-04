'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function PartnerAnalyticsPage() {
  const { user } = useAuth();
  const [productsCount, setProductsCount] = useState(0);
  const [catalogueCount, setCatalogueCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load stats
  useEffect(() => {
    if (!user?.uid) return;
    
    // Products
    const productsQ = query(collection(db, 'partnerProducts'), where('partnerId', '==', user.uid));
    const unsubProducts = onSnapshot(productsQ, (snap) => setProductsCount(snap.size));
    
    // Catalogue
    const catalogueQ = query(collection(db, 'partnerCatalogue'), where('partnerId', '==', user.uid));
    const unsubCatalogue = onSnapshot(catalogueQ, (snap) => setCatalogueCount(snap.size));
    
    // Locations
    const locationsQ = query(collection(db, 'partnerLocations'), where('partnerId', '==', user.uid));
    const unsubLocations = onSnapshot(locationsQ, (snap) => {
      setLocationsCount(snap.size);
      setIsLoading(false);
    });
    
    return () => {
      unsubProducts();
      unsubCatalogue();
      unsubLocations();
    };
  }, [user?.uid]);

  return (
    <DashboardLayout
      title="Analytics"
      subtitle="View your business performance"
    >
      {/* Coming Soon Notice */}
      <div className="bg-gradient-to-br from-warm-brown/5 to-gold/10 rounded-xl p-8 border border-warm-brown/20 text-center mb-8">
        <i className="ri-bar-chart-grouped-line text-5xl text-warm-brown mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Coming Soon</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          We&apos;re working on detailed analytics to help you understand how customers interact with your products and business.
        </p>
      </div>

      {/* Current Stats */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="ri-shopping-bag-line text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? '...' : productsCount}
              </p>
              <p className="text-gray-500">Products Listed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <i className="ri-image-2-line text-purple-600 text-xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? '...' : catalogueCount}
              </p>
              <p className="text-gray-500">Catalogue Images</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <i className="ri-map-pin-line text-orange-600 text-xl" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? '...' : locationsCount}
              </p>
              <p className="text-gray-500">Locations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Features */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: 'ri-eye-line', title: 'Product Views', desc: 'Track how many people view your products' },
            { icon: 'ri-chat-smile-2-line', title: 'Customer Inquiries', desc: 'See how many customers ask about your products' },
            { icon: 'ri-star-line', title: 'Reviews & Ratings', desc: 'Monitor customer feedback and ratings' },
            { icon: 'ri-line-chart-line', title: 'Trend Analysis', desc: 'Understand which products are trending' },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 opacity-75">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className={`${feature.icon} text-gray-400`} />
              </div>
              <div>
                <h4 className="font-medium text-gray-700">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
