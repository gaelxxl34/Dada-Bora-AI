'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onSignOut: () => void;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'ri-dashboard-line',
    activeIcon: 'ri-dashboard-fill',
  },
  {
    name: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: 'ri-book-open-line',
    activeIcon: 'ri-book-open-fill',
  },
  {
    name: 'Chat',
    href: '/dashboard/chat',
    icon: 'ri-chat-3-line',
    activeIcon: 'ri-chat-3-fill',
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: 'ri-user-line',
    activeIcon: 'ri-user-fill',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: 'ri-settings-3-line',
    activeIcon: 'ri-settings-3-fill',
  },
  {
    name: 'Debug',
    href: '/dashboard/debug',
    icon: 'ri-bug-line',
    activeIcon: 'ri-bug-fill',
  },
];

export default function Sidebar({ onSignOut, userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-gray-100 shadow-sm flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-warm-brown flex items-center justify-center">
          <span className="text-white font-playfair font-bold text-lg">D</span>
        </div>
        <div>
          <h1 className="font-playfair font-bold text-warm-brown text-lg leading-tight">
            Dada Bora
          </h1>
          <span className="text-xs text-gray-500">Admin Panel</span>
        </div>
      </div>

      {/* Role Badge */}
      {userRole && (
        <div className="px-6 py-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/20 text-warm-brown text-xs font-medium rounded-full">
            <i aria-hidden="true" className="ri-shield-star-line" />
            {userRole}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-warm-brown text-white shadow-md'
                  : 'text-gray-600 hover:bg-cream-50 hover:text-warm-brown'
              }`}
            >
              <i
                aria-hidden="true"
                className={`text-lg ${active ? item.activeIcon : item.icon} ${
                  active ? '' : 'group-hover:scale-110 transition-transform'
                }`}
              />
              {item.name}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        {/* Help Card */}
        <div className="mb-4 p-4 bg-gradient-to-br from-cream-50 to-blush/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-warm-brown/10 flex items-center justify-center mb-3">
            <i aria-hidden="true" className="ri-question-line text-warm-brown" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Need Help?</h4>
          <p className="text-xs text-gray-500 mb-3">
            Check our documentation for guides
          </p>
          <button className="text-xs font-medium text-warm-brown hover:underline">
            View Docs →
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <i aria-hidden="true" className="ri-logout-box-line text-lg" />
          Logout
        </button>
      </div>
    </aside>
    </>
  );
}
