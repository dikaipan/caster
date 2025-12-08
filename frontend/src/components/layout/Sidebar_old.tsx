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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  hitachiOnly?: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

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
    { href: '/import', label: 'Bulk Import', icon: Download, hitachiOnly: true },
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

          {/* User Section - Moved to Top */}
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

          {/* Navigation */}
          <nav className="flex-1 min-h-0 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-w-0',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                      isActive && 'scale-110'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="flex-shrink-0 border-t border-slate-700/50 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400 min-w-0"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-slate-400" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

