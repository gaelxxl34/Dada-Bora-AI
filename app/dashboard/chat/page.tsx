'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Message {
  id: string;
  content: string;
  timestamp: Timestamp;
  isFromUser: boolean;
}

interface Chat {
  id: string;
  anonymousName: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: number;
  createdAt: Timestamp;
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Load all chats
  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const messagesRef = collection(db, 'chats', selectedChat, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messageData);
      setMessagesLoading(false);
    }, (error) => {
      console.error('Error loading messages:', error);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
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

  const formatMessageTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout
      title="WhatsApp Conversations"
      subtitle="Manage and view all chat conversations"
    >
      <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Chat List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-f pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-transparent"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-brown"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <i className="ri-chat-3-line text-4xl mb-2" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedChat === chat.id ? 'bg-cream-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warm-brown to-gold flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {chat.anonymousName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {chat.anonymousName}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {chat.lastMessage}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-warm-brown text-white text-xs flex items-center justify-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warm-brown to-gold flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {chats.find(c => c.id === selectedChat)?.anonymousName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {chats.find(c => c.id === selectedChat)?.anonymousName}
                    </h2>
                    <p className="text-xs text-gray-500">WhatsApp User</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-brown"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <i className="ri-message-3-line text-4xl mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isFromUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-2xl ${
                          message.isFromUser
                            ? 'bg-white border border-gray-200'
                            : 'bg-warm-brown text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            message.isFromUser ? 'text-gray-500' : 'text-white/70'
                          }`}
                        >
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Info Footer */}
              <div className="bg-cream-50 border-t border-gray-200 px-6 py-3">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <i className="ri-information-line" />
                  This is a read-only view of WhatsApp conversations. User identities are anonymized for privacy.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <i className="ri-chat-3-line text-6xl mb-4" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a chat from the list to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}