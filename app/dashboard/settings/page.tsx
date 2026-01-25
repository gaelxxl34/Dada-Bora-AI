'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: 'ri-settings-3-line' },
    { id: 'notifications', name: 'Notifications', icon: 'ri-notification-3-line' },
    { id: 'security', name: 'Security', icon: 'ri-shield-check-line' },
    { id: 'integrations', name: 'Integrations', icon: 'ri-plug-line' },
    { id: 'billing', name: 'Billing', icon: 'ri-bank-card-line' },
  ];

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your platform preferences"
    >
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        {/* Settings Navigation - Horizontal scroll on mobile */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <nav className="flex lg:flex-col gap-2 sm:gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-3 px-3 lg:mx-0 lg:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 lg:w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-warm-brown text-white'
                      : 'text-gray-600 hover:bg-gray-50 bg-gray-50 lg:bg-transparent'
                  }`}
                >
                  <i aria-hidden="true" className={`${tab.icon} text-base sm:text-lg`} />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <>
              {/* Platform Settings */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Platform Settings</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Configure general platform options</p>
                </div>
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Dada Bora AI"
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        defaultValue="support@dadabora.com"
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Default Language
                    </label>
                    <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown">
                      <option value="en">English</option>
                      <option value="sw">Kiswahili</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Description
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="AI-powered maternal health companion for African mothers"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* AI Configuration */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI Configuration</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Configure AI behavior and responses</p>
                </div>
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">Enable AI Responses</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Allow AI to respond to user queries</p>
                    </div>
                    <button className="w-11 sm:w-12 h-6 bg-warm-brown rounded-full relative transition-colors flex-shrink-0">
                      <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">Content Moderation</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Review AI responses before sending</p>
                    </div>
                    <button className="w-11 sm:w-12 h-6 bg-gray-300 rounded-full relative transition-colors flex-shrink-0">
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Temperature
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="70"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warm-brown"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>More Precise</span>
                      <span>More Creative</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notification Preferences</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Choose what notifications you receive</p>
              </div>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {[
                  { title: 'Email Notifications', desc: 'Receive notifications via email', enabled: true },
                  { title: 'New User Alerts', desc: 'Get notified when new users register', enabled: true },
                  { title: 'System Updates', desc: 'Receive system maintenance notifications', enabled: false },
                  { title: 'Weekly Reports', desc: 'Get weekly analytics summary', enabled: true },
                  { title: 'Partner Activity', desc: 'Notifications about partner actions', enabled: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{item.desc}</p>
                    </div>
                    <button className={`w-11 sm:w-12 h-6 ${item.enabled ? 'bg-warm-brown' : 'bg-gray-300'} rounded-full relative transition-colors flex-shrink-0`}>
                      <span className={`absolute ${item.enabled ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <>
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Password</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Update your password regularly for security</p>
                </div>
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown/20 focus:border-warm-brown"
                    />
                  </div>
                  <button className="w-full sm:w-auto px-4 py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Add an extra layer of security</p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <i aria-hidden="true" className="ri-shield-check-line text-lg sm:text-xl text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 mt-0.5">Currently enabled</p>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Active Sessions</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your active login sessions</p>
                </div>
                <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i aria-hidden="true" className="ri-macbook-line text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">MacBook Pro • Nairobi, KE</p>
                        <p className="text-xs text-gray-500">Current session</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 font-medium ml-12 sm:ml-0">Active now</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <i aria-hidden="true" className="ri-smartphone-line text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">iPhone 15 • Mombasa, KE</p>
                        <p className="text-xs text-gray-500">Last active 2 hours ago</p>
                      </div>
                    </div>
                    <button className="text-xs text-red-600 font-medium hover:underline ml-12 sm:ml-0">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Connected Services</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage third-party integrations</p>
              </div>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {[
                  { name: 'WhatsApp Business', icon: 'ri-whatsapp-line', color: 'text-green-600', bg: 'bg-green-100', connected: true, route: '/dashboard/integrations/whatsapp' },
                  { name: 'AI Chatbot', icon: 'ri-robot-line', color: 'text-purple-600', bg: 'bg-purple-100', connected: true, route: '/dashboard/integrations/chatbot' },
                  { name: 'Twilio SMS', icon: 'ri-message-2-line', color: 'text-red-600', bg: 'bg-red-100', connected: false, route: null },
                  { name: 'Google Analytics', icon: 'ri-line-chart-line', color: 'text-blue-600', bg: 'bg-blue-100', connected: false, route: null },
                  { name: 'Slack', icon: 'ri-slack-line', color: 'text-pink-600', bg: 'bg-pink-100', connected: false, route: null },
                ].map((integration, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${integration.bg} flex items-center justify-center flex-shrink-0`}>
                        <i aria-hidden="true" className={`${integration.icon} text-lg sm:text-xl ${integration.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                        <p className="text-xs text-gray-500">
                          {integration.connected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (integration.route) {
                          router.push(integration.route);
                        }
                      }}
                      className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-colors text-center ${
                      integration.connected 
                        ? 'text-gray-600 hover:bg-gray-100 border border-gray-200 sm:border-0' 
                        : 'bg-warm-brown text-white hover:bg-amber-900'
                    }`}>
                      {integration.connected ? 'Manage' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <>
              <div className="bg-gradient-to-r from-warm-brown to-amber-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm">Current Plan</p>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1">Enterprise</h3>
                    <p className="text-white/70 text-xs sm:text-sm mt-2">Unlimited users • Priority support • Custom integrations</p>
                  </div>
                  <button className="w-full sm:w-auto px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors text-center">
                    Upgrade Plan
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Payment Method</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your payment details</p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <i aria-hidden="true" className="ri-visa-line text-xl sm:text-2xl text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                        <p className="text-xs text-gray-500">Expires 12/2027</p>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 sm:border-0">
                      Update
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Billing History</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Download your invoices</p>
                    </div>
                    <button className="text-sm text-warm-brown hover:underline">
                      Download All
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { date: 'Jan 1, 2026', amount: '$299.00', status: 'Paid' },
                    { date: 'Dec 1, 2025', amount: '$299.00', status: 'Paid' },
                    { date: 'Nov 1, 2025', amount: '$299.00', status: 'Paid' },
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <i aria-hidden="true" className="ri-file-text-line text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">Invoice - {invoice.date}</p>
                          <p className="text-xs text-gray-500">{invoice.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full hidden sm:inline">
                          {invoice.status}
                        </span>
                        <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <i aria-hidden="true" className="ri-download-2-line" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button className="w-full sm:w-auto px-6 py-2.5 bg-warm-brown text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
