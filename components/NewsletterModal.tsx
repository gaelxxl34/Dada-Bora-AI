
'use client';

import { useState } from 'react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsletterModal({ isOpen, onClose }: NewsletterModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://readdy.ai/api/form/d3n95jii723b7tba39p0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: formData.email,
          name: formData.name
        }),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ email: '', name: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
        </button>
        
        <div className="text-center mb-6">
          <div className="bg-gold/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-mail-heart-line text-2xl text-warm-brown w-6 h-6 flex items-center justify-center"></i>
          </div>
          <h3 className="text-2xl font-playfair font-bold text-warm-brown mb-2">Stay Connected</h3>
          <p className="text-gray-600">Get the latest updates on Dada Bora's journey and wellness tips for Black women.</p>
        </div>
        
        {submitStatus === 'success' ? (
          <div className="text-center py-8">
            <i className="ri-check-circle-line text-4xl text-green-500 mb-4 w-10 h-10 flex items-center justify-center mx-auto"></i>
            <h4 className="text-xl font-semibold text-green-600 mb-2">Welcome to the Family!</h4>
            <p className="text-gray-700">You'll be the first to know about our latest updates and wellness content.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} data-readdy-form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent text-sm"
                placeholder="Your beautiful name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent text-sm"
                placeholder="your.email@example.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-warm-brown hover:bg-amber-800 text-white py-3 rounded-lg font-semibold transition-colors duration-300 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe for Updates'}
            </button>
            
            {submitStatus === 'error' && (
              <p className="text-red-500 text-sm text-center">Something went wrong. Please try again.</p>
            )}
          </form>
        )}
        
        <p className="text-xs text-gray-500 text-center mt-4">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}