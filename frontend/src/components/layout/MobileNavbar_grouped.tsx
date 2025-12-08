'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Truck,
  Monitor,
  Disc,
  Wrench,
  Ticket,
  Menu,
  X,
  LogOut,
  User,
  Database,
  Link2,
  History,
  ChevronDown,
  ChevronRight,
  Settings,
  Package,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  hitachiOnly?: boolean;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  adminOnly?: boolean;
}

export default function MobileNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'admin': false,
    'operations': true,
    'service': true,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Single items
  const singleNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  // Grouped items
  const menuGroups: MenuGroup[] = [
    {
      label: 'Administration',
      icon: Settings,
      adminOnly: true,
      items: [
        { href: '/users', label: 'Users', icon: User },
        { href: '/banks', label: 'Banks', icon: Building2 },
        { href: '/vendors', label: 'Vendors', icon: Truck },
        { href: '/assignments', label: 'Assignments', icon: Link2 },
        { href: '/data-management', label: 'Data Management', icon: Database },
      ],
    },
    {
      label: 'Operations',
      icon: Package,
      items: [
        { href: '/machines', label: 'Machines', icon: Monitor },
        { href: '/cassettes', label: 'Cassettes', icon: Disc },
        { href: '/repairs', label: 'Repairs', icon: Wrench, hitachiOnly: true },
      ],
    },
    {
      label: 'Service Orders',
      icon: Ticket,
      items: [
        { href: '/tickets', label: 'Active SOs', icon: Ticket },
        { href: '/history', label: 'SO History', icon: History },
      ],
    },
  ];

  const filteredSingleItems = singleNavItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'SUPER_ADMIN') return false;
    if (item.hitachiOnly && user?.userType !== 'HITACHI') return false;
    return true;
  });

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.adminOnly && user?.role !== 'SUPER_ADMIN') return false;
        if (item.hitachiOnly && user?.userType !== 'HITACHI') return false;
        return true;
      }),
    }))
    .filter(group => {
      if (group.adminOnly && user?.role !== 'SUPER_ADMIN') return false;
      return group.items.length > 0;
    });

  const getGroupKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Top Bar */}
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center space-x-2"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">CASTER</h1>
          </div>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={cn(
          'fixed top-16 left-0 right-0 bottom-0 bg-white z-50 transform transition-transform duration-300 ease-in-out',
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full overflow-y-auto">
          {/* User Info */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-500">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-blue-100">
                  {user?.role || 'Role'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-4 space-y-2">
            {/* Single Items */}
            {filteredSingleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Grouped Items */}
            {filteredGroups.map((group) => {
              const groupKey = getGroupKey(group.label);
              const isExpanded = expandedGroups[groupKey] ?? true;
              const GroupIcon = group.icon;
              const hasActiveItem = group.items.some(item => pathname === item.href);

              return (
                <div key={groupKey} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors',
                      hasActiveItem && !isExpanded
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <GroupIcon className="h-5 w-5" />
                      <span>{group.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Notifications */}
            <Link
              href="/notifications"
              onClick={() => setIsMenuOpen(false)}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                pathname === '/notifications'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

