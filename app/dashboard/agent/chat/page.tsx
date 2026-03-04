'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  from: string;
  message: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  agentId?: string;
}

interface ChatSession {
  id: string;
  phoneNumber: string;
  userName?: string;
  lastMessage: string;
  lastMessageTime: Date;
  status: 'active' | 'resolved' | 'pending';
  unreadCount: number;
}

export default function AgentChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load chat sessions
  useEffect(() => {
    const q = query(
      collection(db, 'chatSessions'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageTime: doc.data().lastMessageTime?.toDate(),
      })) as ChatSession[];
      
      // Sort client-side
      sessionsData.sort((a, b) => (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0));
      
      setSessions(sessionsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading sessions:', error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Load messages for selected session
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, 'chatMessages'),
      where('sessionId', '==', selectedSession.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as ChatMessage[];
      
      // Sort client-side by timestamp ascending
      messagesData.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
      
      setMessages(messagesData);
    }, (error) => {
      console.error('Error loading messages:', error);
    });
    
    return () => unsubscribe();
  }, [selectedSession?.id]);

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    const matchesSearch = !searchQuery || 
      session.phoneNumber.includes(searchQuery) ||
      session.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      resolved: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Resolved' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Stats
  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    pending: sessions.filter(s => s.status === 'pending').length,
  };

  return (
    <DashboardLayout
      title="Chat Support"
      subtitle="View customer conversations (read-only)"
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Chats</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <i className="ri-information-line text-blue-600 text-xl mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-900">Read-Only Access</h4>
          <p className="text-sm text-blue-700">
            As an agent, you can view chat conversations to learn about customer inquiries. 
            To respond to chats or manage conversations, please contact an administrator.
          </p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-340px)] min-h-[500px]">
        {/* Sessions List */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative mb-3">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-brown" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <i className="ri-chat-3-line text-3xl mb-2" />
                <p>No chat sessions found</p>
              </div>
            ) : (
              filteredSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full p-4 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors ${
                    selectedSession?.id === session.id ? 'bg-warm-brown/5 border-l-4 border-l-warm-brown' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {session.userName || session.phoneNumber}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(session.lastMessageTime)}
                    </span>
                  </div>
                  {session.userName && (
                    <p className="text-xs text-gray-500 mb-1">{session.phoneNumber}</p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {session.lastMessage}
                  </p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session.status)}
                    {session.unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        {session.unreadCount} new
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedSession.userName || 'Customer'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedSession.phoneNumber}</p>
                </div>
                {getStatusBadge(selectedSession.status)}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <i className="ri-chat-history-line text-3xl mb-2" />
                    <p>No messages in this conversation</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.direction === 'outgoing'
                            ? 'bg-warm-brown text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction === 'outgoing' ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Read-only Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <i className="ri-lock-line" />
                  <span>Read-only mode - contact admin to respond</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <i className="ri-chat-smile-2-line text-5xl mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Conversation</h3>
                <p className="text-gray-500">Choose a chat from the list to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
