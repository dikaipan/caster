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

export default function MobileNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Users', icon: User, adminOnly: true },
    { href: '/banks', label: 'Banks', icon: Building2, adminOnly: true },
    { href: '/vendors', label: 'Vendors', icon: Truck, adminOnly: true },
    { href: '/assignments', label: 'Assignments', icon: Link2, adminOnly: true },
    { href: '/data-management', label: 'Data Management', icon: Database, adminOnly: true },
    { href: '/machines', label: 'Machines', icon: Monitor },
    { href: '/cassettes', label: 'Cassettes', icon: Disc },
    { href: '/repairs', label: 'Repairs', icon: Wrench, hitachiOnly: true },
    { href: '/tickets', label: 'Service Orders', icon: Ticket },
    { href: '/history', label: 'SO History', icon: History },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'SUPER_ADMIN') return false;
    if (item.hitachiOnly && user?.userType !== 'HITACHI') return false;
    return true;
  });

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

        {/* Menu Toggle & User Info */}
        <div className="flex items-center space-x-3">
          {/* User Info */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Navigation Items */}
          <div className="px-2 py-2 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-500')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Section & Logout */}
          <div className="border-t border-gray-200 px-2 py-2">
            <div className="mb-2 flex items-center space-x-3 rounded-lg px-3 py-2 bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.role || 'Role'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

