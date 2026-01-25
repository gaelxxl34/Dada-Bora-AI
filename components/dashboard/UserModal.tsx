'use client';

import { useState, useEffect } from 'react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: {
    name: string;
    email: string;
    role: 'admin' | 'partner' | 'user' | 'agent';
    status: 'active' | 'inactive' | 'pending';
  }) => Promise<void>;
  editUser?: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'partner' | 'user' | 'agent';
    status: 'active' | 'inactive' | 'pending';
  } | null;
}

export default function UserModal({ isOpen, onClose, onSave, editUser }: UserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'partner' | 'user' | 'agent'>('user');
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending'>('pending');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editUser) {
      setName(editUser.name);
      setEmail(editUser.email);
      setRole(editUser.role);
      setStatus(editUser.status);
    } else {
      setName('');
      setEmail('');
      setRole('user');
      setStatus('pending');
    }
  }, [editUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        name,
        email,
        role,
        status,
      });
      setName('');
      setEmail('');
      setRole('user');
      setStatus('pending');
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {editUser ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i aria-hidden="true" className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="userName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="userEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
              disabled={!!editUser}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            {editUser && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="userRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'partner' | 'user' | 'agent')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            >
              <option value="user">User - Regular platform user</option>
              <option value="agent">Agent - Customer support agent</option>
              <option value="partner">Partner - Organization partner</option>
              <option value="admin">Admin - Full system access</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="userStatus" className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="userStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'pending')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            >
              <option value="pending">Pending - Awaiting activation</option>
              <option value="active">Active - Full access</option>
              <option value="inactive">Inactive - Suspended access</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
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
              disabled={isLoading || !name.trim() || !email.trim()}
              className="w-full sm:flex-1 px-4 py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : editUser ? 'Update User' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
