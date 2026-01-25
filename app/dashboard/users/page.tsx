'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import UserModal from '../../../components/dashboard/UserModal';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'partner' | 'user' | 'agent';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  lastActive: Date;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load users from Firestore
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Handle both name formats (single 'name' field or 'firstName'/'lastName')
        const name = data.name || (data.firstName && data.lastName 
          ? `${data.firstName} ${data.lastName}` 
          : data.firstName || data.lastName || '');
        
        // Map super_admin to admin for display
        const role = data.role === 'super_admin' ? 'admin' : (data.role || 'user');
        
        return {
          id: doc.id,
          ...data,
          name,
          role: role as 'admin' | 'partner' | 'user' | 'agent',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate(),
          lastActive: data.lastActive?.toDate() || data.createdAt?.toDate(),
        };
      }) as User[];
      
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading users:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter users based on role and search query
  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    partners: users.filter(u => u.role === 'partner').length,
    pending: users.filter(u => u.status === 'pending').length,
    agents: users.filter(u => u.role === 'agent').length,
  };

  // Handle create/update user
  const handleSaveUser = async (userData: {
    name: string;
    email: string;
    role: 'admin' | 'partner' | 'user' | 'agent';
    status: 'active' | 'inactive' | 'pending';
  }) => {
    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: userData.name,
          role: userData.role,
          status: userData.status,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new user
        await addDoc(collection(db, 'users'), {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          createdAt: Timestamp.now(),
          lastActive: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'partner':
        return 'bg-blue-100 text-blue-700';
      case 'agent':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ri-shield-star-line';
      case 'partner':
        return 'ri-handshake-line';
      case 'agent':
        return 'ri-customer-service-2-line';
      case 'user':
        return 'ri-user-line';
      default:
        return 'ri-user-line';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout
      title="Users"
      subtitle="Manage platform users and permissions"
    >
      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        editUser={editingUser}
      />

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-warm-brown/10 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-user-line text-warm-brown" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 truncate">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-user-follow-line text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-handshake-line text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.partners}</p>
              <p className="text-xs text-gray-500">Partners</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <i aria-hidden="true" className="ri-customer-service-2-line text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.agents}</p>
              <p className="text-xs text-gray-500">Agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <i aria-hidden="true" className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="partner">Partners</option>
                <option value="agent">Agents</option>
                <option value="user">Users</option>
              </select>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsUserModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors"
              >
                <i aria-hidden="true" className="ri-user-add-line" />
                <span className="hidden sm:inline">Add User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-warm-brown/20 border-t-warm-brown rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <i aria-hidden="true" className="ri-user-line text-4xl mb-2 block" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warm-brown to-amber-700 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email || 'No email'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                        <i aria-hidden="true" className={`${getRoleIcon(user.role)} text-xs`} />
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'active' ? 'bg-green-500' : 
                          user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        {user.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Joined {user.createdAt ? formatRelativeTime(user.createdAt) : 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <i aria-hidden="true" className="ri-edit-line text-sm" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i aria-hidden="true" className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="w-8 h-8 border-2 border-warm-brown/20 border-t-warm-brown rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <i aria-hidden="true" className="ri-user-line text-4xl mb-2 block" />
                      <p className="text-sm">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warm-brown to-amber-700 flex items-center justify-center text-white font-medium text-sm">
                          {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                        <i aria-hidden="true" className={`${getRoleIcon(user.role)} text-xs`} />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'active' ? 'bg-green-500' : 
                          user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{user.createdAt ? formatRelativeTime(user.createdAt) : 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500">{user.lastActive ? formatRelativeTime(user.lastActive) : 'Never'}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <i aria-hidden="true" className="ri-edit-line" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <i aria-hidden="true" className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
