'use client';

import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './Sidebar';
import LazyNotificationService from '@/components/notifications/LazyNotificationService';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useAuthStore } from '@/store/authStore';
import {
  Menu,
  X,
  Sun,
  Moon,
  Clock,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const previousOverflow = useRef<string>('');
  const pathname = usePathname();
  const { user } = useAuthStore();

  const pageTitle = useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '/dashboard') return 'Dashboard';

    const routeTitles: Record<string, string> = {
      '/settings': 'Settings',
      '/machines': 'Machines',
      '/cassettes': 'Cassettes',
      '/tickets': 'Tickets',
      '/service-orders/create': 'Create Service Order',
      '/notifications': 'Notifications',
      '/resources': 'Resources',
      '/history': 'SO History',
      '/repairs': 'Repairs',
      // PM - DISABLED TEMPORARILY
      // '/preventive-maintenance': 'Preventive Maint.',
      // '/preventive-maintenance/create': 'Create PM Task',
    };

    if (routeTitles[pathname]) return routeTitles[pathname];

    const segments = pathname.split('/').filter(Boolean);
    if (!segments.length) return 'Dashboard';
    
    // Detect dynamic routes with UUIDs or IDs
    const lastSegment = segments[segments.length - 1];
    // UUID pattern: with or without dashes, 32 hex characters
    const isUUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(lastSegment) || 
                   /^[0-9a-f]{32}$/i.test(lastSegment);
    const isNumericID = /^\d+$/.test(lastSegment);
    
    if (isUUID || isNumericID) {
      // Map parent route to appropriate title
      const parentRoute = segments.slice(0, -1).join('/');
      const dynamicRouteTitles: Record<string, string> = {
        'tickets': 'SO Detail',
        'repairs': 'Repair Detail',
        // PM - DISABLED TEMPORARILY
        // 'preventive-maintenance': 'PM Detail',
        'tickets/receive': 'Receive SO',
        'tickets/delivery': 'Delivery SO',
        'tickets/return': 'Return SO',
        'tickets/receive-return': 'Receive Return'
      };
      
      return dynamicRouteTitles[parentRoute] || dynamicRouteTitles[segments[0]] || 'Detail';
    }
    
    const formatted = lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return formatted || 'Dashboard';
  }, [pathname]);

  // State untuk track apakah di desktop (lg breakpoint)
  const [isDesktop, setIsDesktop] = useState(false);

  // Check screen size setelah hydration
  useEffect(() => {
    if (!isHydrated) return;
    
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, [isHydrated]);

  // Memoize margin left untuk mencegah perubahan saat navigasi
  // Hanya set margin setelah hydration dan hanya di desktop untuk menghindari SSR mismatch
  const mainContentMargin = useMemo(() => {
    // Di server atau sebelum hydration, selalu return 0 untuk menghindari mismatch
    if (!isHydrated || !isDesktop) return '0px';
    return sidebarCollapsed ? '80px' : '256px';
  }, [sidebarCollapsed, isHydrated, isDesktop]);

  // Load dark mode and sidebar state from localStorage after hydration (hanya sekali saat mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      const isDark = JSON.parse(savedDarkMode);
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
    const savedSidebarCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarCollapsed !== null) {
      const isCollapsed = JSON.parse(savedSidebarCollapsed);
      // Jangan set transition saat load dari localStorage (bukan user action)
      isUserActionRef.current = false;
      setShouldTransition(false);
      setSidebarCollapsed(isCollapsed);
    }
    setIsHydrated(true);
    prevPathnameRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobileMenuOpen) {
      previousOverflow.current = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow.current || '';
    }
    return () => {
      document.body.style.overflow = previousOverflow.current || '';
    };
  }, [isMobileMenuOpen]);

  // Toggle dark mode and save to localStorage
  const toggleDarkMode = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  // Track apakah perubahan collapsed adalah user action
  const isUserActionRef = useRef(false);
  const [shouldTransition, setShouldTransition] = useState(false);
  const prevPathnameRef = useRef(pathname);

  // Reset transition saat pathname berubah (navigasi)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      // Pathname berubah = navigasi, nonaktifkan transisi
      setShouldTransition(false);
      isUserActionRef.current = false;
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Toggle sidebar collapse and save to localStorage
  const toggleSidebar = () => {
    if (typeof window === 'undefined') return;
    isUserActionRef.current = true;
    setShouldTransition(true);
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
    // Reset transition flag setelah transisi selesai
    setTimeout(() => {
      setShouldTransition(false);
      isUserActionRef.current = false;
    }, 300);
  };

  // Handler untuk update sidebar collapsed state dari Sidebar component
  const handleSidebarCollapse = (collapsed: boolean) => {
    if (typeof window === 'undefined') return;
    isUserActionRef.current = true;
    setShouldTransition(true);
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
    // Reset transition flag setelah transisi selesai
    setTimeout(() => {
      setShouldTransition(false);
      isUserActionRef.current = false;
    }, 300);
  };

  return (
    <>
      {/* Notification Service - lazy loaded to reduce initial TBT */}
      <LazyNotificationService />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">
        {/* Sidebar - Responsive untuk desktop dan mobile */}
        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          setIsMobileOpen={setIsMobileMenuOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={handleSidebarCollapse}
          shouldTransition={shouldTransition}
        />
        
        {/* Main Content */}
        <div 
          className="min-h-screen bg-slate-50 dark:bg-slate-900 flex-1 flex flex-col overflow-hidden w-full lg:w-auto"
          style={{
            marginLeft: isHydrated ? mainContentMargin : '0px',
            transition: shouldTransition ? 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {/* Mobile Header - Fixed at top */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-[50] bg-gradient-to-r from-teal-900 via-teal-800 to-teal-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 inline-flex items-center justify-center"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/70">CASTER</p>
                <p className="text-base font-semibold leading-tight text-white">{pageTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                <NotificationBell />
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[0.7rem] text-white/70 uppercase tracking-wide">Hari Ini</p>
                <p className="text-sm font-semibold text-white">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
              </div>
            </div>
          </div>

          {/* Spacer for fixed mobile header - matches header height */}
          <div className="lg:hidden h-[73px] flex-shrink-0"></div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
            {/* Left: Page Title & Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 bg-clip-text text-transparent dark:bg-none dark:text-teal-200 dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {pageTitle}
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl border transition bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl border transition bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <div className="p-2 rounded-xl border transition bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                <NotificationBell />
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-0 sm:p-2 lg:p-8 w-full bg-slate-50 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <div className="w-full h-full px-3 sm:px-4 pt-2 lg:pt-0 mx-auto">
            {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
