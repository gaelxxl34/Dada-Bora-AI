
'use client';

import { useState } from 'react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://readdy.ai/api/form/d3n95jii723b7tba39og', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', phone: '' });
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
        
        <h3 className="text-2xl font-playfair font-bold text-warm-brown mb-6">Join the Sisterhood</h3>
        
        {submitStatus === 'success' ? (
          <div className="text-center py-8">
            <i className="ri-check-circle-line text-4xl text-green-500 mb-4 w-10 h-10 flex items-center justify-center mx-auto"></i>
            <p className="text-lg text-gray-700">Welcome to the Dada Bora family! We'll keep you updated on our launch.</p>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-warm-brown hover:bg-amber-800 text-white py-3 rounded-lg font-semibold transition-colors duration-300 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </button>
            
            {submitStatus === 'error' && (
              <p className="text-red-500 text-sm text-center">Something went wrong. Please try again.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}