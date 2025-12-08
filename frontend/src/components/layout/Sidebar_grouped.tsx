'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Truck,
  Download,
  Monitor,
  Disc,
  Wrench,
  Ticket,
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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useState } from 'react';

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
  defaultOpen?: boolean;
}

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ isMobileOpen = false, setIsMobileOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
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

  // Single items (no grouping)
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
        { href: '/import', label: 'Bulk Import', icon: Download },
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
    <>
      {/* Sidebar - Hidden on mobile, always visible on desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
        <div className="flex h-full w-full flex-col">
          {/* Logo Section */}
          <div className="flex-shrink-0 h-16 flex items-center border-b border-slate-700/50 px-6">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 min-w-0"
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">CASTER</h1>
                <p className="text-xs text-slate-400 truncate">Tracking & Retrieval</p>
              </div>
            </Link>
          </div>

          {/* User Section */}
          <div className="flex-shrink-0 border-b border-slate-700/50 p-4">
            <div className="flex items-center space-x-3 rounded-lg bg-slate-700/30 px-3 py-2.5 min-w-0">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role || 'Role'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Navigation Section - Scrollable */}
          <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 py-4">
            <div className="space-y-1 px-3">
              {/* Single Items */}
              {filteredSingleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-0',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
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
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                        hasActiveItem && !isExpanded
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                      )}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <GroupIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{group.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>

                    {/* Group Items */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1 border-l-2 border-slate-700/50 pl-3">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-0',
                                isActive
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                              )}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Notification Menu Item */}
              <Link
                href="/notifications"
                className={cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-0',
                  pathname === '/notifications'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <Bell className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">Notifications</span>
              </Link>
            </div>
          </nav>

          {/* Logout Button */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-600/10 hover:text-red-400 rounded-lg transition-all duration-200 min-w-0"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

