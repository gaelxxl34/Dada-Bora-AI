'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onSignOut: () => void;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  activeIcon: string;
  roles?: string[]; // If undefined, available to all roles
}

// Menu items with role-based access
const allMenuItems: MenuItem[] = [
  // Admin/Super Admin items
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'ri-dashboard-line',
    activeIcon: 'ri-dashboard-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: 'ri-book-open-line',
    activeIcon: 'ri-book-open-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Chat',
    href: '/dashboard/chat',
    icon: 'ri-chat-3-line',
    activeIcon: 'ri-chat-3-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Crisis Alerts',
    href: '/dashboard/alerts',
    icon: 'ri-alarm-warning-line',
    activeIcon: 'ri-alarm-warning-fill',
    roles: ['super_admin', 'admin', 'agent'],
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: 'ri-user-line',
    activeIcon: 'ri-user-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'User Analytics',
    href: '/dashboard/analytics',
    icon: 'ri-pie-chart-line',
    activeIcon: 'ri-pie-chart-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: 'ri-settings-3-line',
    activeIcon: 'ri-settings-3-fill',
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Debug',
    href: '/dashboard/debug',
    icon: 'ri-bug-line',
    activeIcon: 'ri-bug-fill',
    roles: ['super_admin'],
  },
  
  // Partner items
  {
    name: 'Overview',
    href: '/dashboard/partner',
    icon: 'ri-home-4-line',
    activeIcon: 'ri-home-4-fill',
    roles: ['partner'],
  },
  {
    name: 'My Products',
    href: '/dashboard/partner/products',
    icon: 'ri-shopping-bag-line',
    activeIcon: 'ri-shopping-bag-fill',
    roles: ['partner'],
  },
  {
    name: 'Catalogue',
    href: '/dashboard/partner/catalogue',
    icon: 'ri-image-2-line',
    activeIcon: 'ri-image-2-fill',
    roles: ['partner'],
  },
  {
    name: 'Locations',
    href: '/dashboard/partner/locations',
    icon: 'ri-map-pin-line',
    activeIcon: 'ri-map-pin-fill',
    roles: ['partner'],
  },
  {
    name: 'Business Profile',
    href: '/dashboard/partner/profile',
    icon: 'ri-store-2-line',
    activeIcon: 'ri-store-2-fill',
    roles: ['partner'],
  },
  {
    name: 'Analytics',
    href: '/dashboard/partner/analytics',
    icon: 'ri-bar-chart-line',
    activeIcon: 'ri-bar-chart-fill',
    roles: ['partner'],
  },
  
  // Agent items
  {
    name: 'My Dashboard',
    href: '/dashboard/agent',
    icon: 'ri-home-4-line',
    activeIcon: 'ri-home-4-fill',
    roles: ['agent'],
  },
  {
    name: 'Knowledge Base',
    href: '/dashboard/agent/knowledge-base',
    icon: 'ri-book-open-line',
    activeIcon: 'ri-book-open-fill',
    roles: ['agent'],
  },
  {
    name: 'My Articles',
    href: '/dashboard/agent/my-articles',
    icon: 'ri-file-text-line',
    activeIcon: 'ri-file-text-fill',
    roles: ['agent'],
  },
  {
    name: 'Chat Support',
    href: '/dashboard/agent/chat',
    icon: 'ri-chat-3-line',
    activeIcon: 'ri-chat-3-fill',
    roles: ['agent'],
  },
];

// Helper to get role display name
const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    partner: 'Partner',
    agent: 'Agent',
    user: 'User',
  };
  return roleNames[role] || role;
};

export default function Sidebar({ onSignOut, userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (!item.roles) return true; // Available to all
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const isActive = (href: string) => {
    if (href === '/dashboard' && userRole && ['super_admin', 'admin'].includes(userRole)) {
      return pathname === '/dashboard';
    }
    if (href === '/dashboard/partner' && userRole === 'partner') {
      return pathname === '/dashboard/partner';
    }
    if (href === '/dashboard/agent' && userRole === 'agent') {
      return pathname === '/dashboard/agent';
    }
    return pathname.startsWith(href) && href !== '/dashboard/partner' && href !== '/dashboard/agent' && href !== '/dashboard';
  };

  // Get panel title based on role
  const getPanelTitle = () => {
    if (userRole === 'partner') return 'Partner Portal';
    if (userRole === 'agent') return 'Agent Portal';
    return 'Admin Panel';
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
          <span className="text-xs text-gray-500">{getPanelTitle()}</span>
        </div>
      </div>

      {/* Role Badge */}
      {userRole && (
        <div className="px-6 py-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${
            userRole === 'super_admin' ? 'bg-purple-100 text-purple-700' :
            userRole === 'admin' ? 'bg-gold/20 text-warm-brown' :
            userRole === 'partner' ? 'bg-blue-100 text-blue-700' :
            userRole === 'agent' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            <i aria-hidden="true" className={
              userRole === 'super_admin' ? 'ri-shield-star-line' :
              userRole === 'admin' ? 'ri-shield-user-line' :
              userRole === 'partner' ? 'ri-store-2-line' :
              userRole === 'agent' ? 'ri-customer-service-line' :
              'ri-user-line'
            } />
            {getRoleDisplayName(userRole)}
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
