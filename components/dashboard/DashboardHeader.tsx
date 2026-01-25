'use client';

import { useState } from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  userName?: string;
  onMenuClick: () => void;
}

export default function DashboardHeader({
  title,
  subtitle,
  userEmail,
  userName,
  onMenuClick,
}: DashboardHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex justify-between items-center h-14 sm:h-16 px-4 sm:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            <i aria-hidden="true" className="ri-menu-line text-xl" />
          </button>
          
          {/* Page Title */}
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <i aria-hidden="true" className="ri-search-line text-xl" />
          </button>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
            <i aria-hidden="true" className="ri-search-line text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-32 lg:w-48 placeholder:text-gray-400"
            />
            <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <i aria-hidden="true" className="ri-notification-3-line text-xl" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-warm-brown to-amber-700 flex items-center justify-center text-white font-medium text-xs sm:text-sm">
              {userName?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {userName || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">{userEmail}</p>
            </div>
            <button className="hidden sm:block p-1 text-gray-400 hover:text-gray-600">
              <i aria-hidden="true" className="ri-arrow-down-s-line" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {showSearch && (
        <div className="md:hidden px-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl">
            <i aria-hidden="true" className="ri-search-line text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
              autoFocus
            />
            <button onClick={() => setShowSearch(false)} className="text-gray-400">
              <i aria-hidden="true" className="ri-close-line" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
