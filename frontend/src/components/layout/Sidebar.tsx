'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Image from 'next/image';
import { isSuperAdmin, isHitachiUser, isPengelolaUser } from '@/lib/permissions';
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
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  Package,
  X,
  Home,
  BarChart3,
  ShoppingCart,
  Plus,
  Heart,
  Github,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getViewedTickets } from '@/lib/viewed-tickets';

interface NavItem {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  link: string;
  adminOnly?: boolean;
  hitachiOnly?: boolean;
  pengelolaOnly?: boolean;
  badgeCount?: number;
}

interface MenuGroup {
  name: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  shouldTransition?: boolean;
}

export default function Sidebar({ isMobileOpen = false, setIsMobileOpen, collapsed = false, setCollapsed, shouldTransition = false }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  // Memoize sidebar width untuk mencegah perubahan saat navigasi
  const sidebarWidth = useMemo(() => collapsed ? '80px' : '256px', [collapsed]);
  // Initialize expanded groups - semua group terbuka secara default
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'dashboard': true,
    'administration': true,
    'operations': true,
    'service-orders': true,
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

  const handleLinkClick = () => {
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const [newSOCount, setNewSOCount] = useState(0);
  const [pmTasksCount, setPmTasksCount] = useState(0);
  const [replacementRequestCount, setReplacementRequestCount] = useState(0);
  const retryDelayRef = useRef(180000); // Start with 180 seconds (3 minutes) - optimized for better balance between freshness and server load
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<Record<string, number>>({});

  // Fetch notification counts - Skip polling if user is on the same page
  useEffect(() => {
    let isMounted = true;

    // Skip polling if user is on the tickets page
    const isOnPendingPage = pathname === '/tickets';
    if (isOnPendingPage) {
      // Still fetch once on mount, but don't poll
      const fetchOnce = async () => {
        if (!user || !isMounted) return;
        try {
          // Fetch new SO count (OPEN and IN_DELIVERY status) - use optimized endpoint
          try {
            const countResponse = await api.get('/tickets/count/new');
            const totalNewCount = countResponse.data || 0;

            // Get viewed tickets from localStorage
            const viewedTickets = getViewedTickets();

            // If we have viewed tickets, estimate unviewed count
            if (totalNewCount > 0 && viewedTickets.size > 0) {
              // Get a small sample to estimate viewed ratio
              const sampleResponse = await api.get('/tickets', {
                params: {
                  page: 1,
                  limit: 50,
                  status: 'OPEN,IN_DELIVERY'
                }
              });
              const sampleTickets = sampleResponse.data?.data || [];
              const sampleViewedCount = sampleTickets.filter((ticket: any) => viewedTickets.has(ticket.id)).length;
              const viewedRatio = sampleTickets.length > 0 ? sampleViewedCount / sampleTickets.length : 0;
              const estimatedUnviewedCount = Math.max(0, Math.round(totalNewCount * (1 - viewedRatio)));
              if (isMounted) setNewSOCount(estimatedUnviewedCount);
            } else {
              if (isMounted) setNewSOCount(totalNewCount);
            }
          } catch (error: any) {
            if (error.response?.status !== 429) {
              console.warn('Could not fetch new SO count:', error);
            }
          }

          // PM Tasks - DISABLED TEMPORARILY
          // Fetch PM tasks count (unassigned or assigned to current user) - for HITACHI users only
          // Throttle to max once per 5 minutes
          // if (user.userType === 'HITACHI') {
          //   const now = Date.now();
          //   const lastFetch = lastFetchTimeRef.current['pm-tasks'] || 0;
          //   const timeSinceLastFetch = now - lastFetch;
          //   
          //   if (timeSinceLastFetch < 300000) { // 5 minutes
          //     // Skip this fetch, too soon
          //   } else {
          //     try {
          //       const pmCountResponse = await api.get('/preventive-maintenance/count/unassigned');
          //       if (isMounted) {
          //         setPmTasksCount(pmCountResponse.data || 0);
          //         lastFetchTimeRef.current['pm-tasks'] = now;
          //       }
          //     } catch (error: any) {
          //       if (error.response?.status === 429) {
          //         lastFetchTimeRef.current['pm-tasks'] = now; // Update time to prevent immediate retry
          //       } else if (error.response?.status !== 429) {
          //         console.warn('Could not fetch PM tasks count:', error);
          //       }
          //     }
          //   }
          // }

          // Fetch replacement request count
          try {
            const replacementCountResponse = await api.get('/tickets/count/replacement');
            if (isMounted) setReplacementRequestCount(replacementCountResponse.data || 0);
          } catch (error: any) {
            if (error.response?.status !== 429) {
              console.warn('Could not fetch replacement request count:', error);
            }
          }

        } catch (error) {
          console.error('Error fetching notification counts:', error);
        }
      };
      if (user) fetchOnce();
      return;
    }

    const fetchCounts = async () => {
      if (!user || !isMounted) return;

      try {
        // Fetch new SO count (OPEN and IN_DELIVERY status) for all users
        // Use optimized count endpoint, then filter by viewed status in frontend
        try {
          // Get total count of new tickets from backend (optimized endpoint - only count, no data)
          const countResponse = await api.get('/tickets/count/new');
          const totalNewCount = countResponse.data || 0;

          // Get viewed tickets from localStorage
          const viewedTickets = getViewedTickets();

          // If we have viewed tickets and new tickets, get a small sample to estimate viewed ratio
          // Only fetch sample if we have significant number of viewed tickets to avoid unnecessary requests
          if (totalNewCount > 0 && viewedTickets.size > 0 && viewedTickets.size < 100) {
            // Get a small sample (max 20) to check viewed status ratio - reduced to minimize API calls
            const sampleLimit = Math.min(20, totalNewCount);
            try {
              const sampleResponse = await api.get('/tickets', {
                params: {
                  page: 1,
                  limit: sampleLimit,
                  status: 'OPEN,IN_DELIVERY'
                }
              });
              const sampleTickets = sampleResponse.data?.data || [];
              const sampleViewedCount = sampleTickets.filter((ticket: any) => viewedTickets.has(ticket.id)).length;

              // Estimate unviewed count based on sample ratio
              const viewedRatio = sampleTickets.length > 0 ? sampleViewedCount / sampleTickets.length : 0;
              const estimatedUnviewedCount = Math.max(0, Math.round(totalNewCount * (1 - viewedRatio)));

              if (isMounted) {
                setNewSOCount(estimatedUnviewedCount);
                retryDelayRef.current = 180000; // Reset to 180 seconds (3 minutes) on success
              }
            } catch (sampleError: any) {
              // If sample fetch fails, just use total count (better than showing 0)
              if (isMounted) {
                setNewSOCount(totalNewCount);
                retryDelayRef.current = 180000;
              }
            }
          } else {
            // No viewed tickets, too many viewed tickets, or no new tickets - use total count directly
            if (isMounted) {
              setNewSOCount(totalNewCount);
              retryDelayRef.current = 180000; // Reset to 180 seconds (3 minutes) on success
            }
          }
        } catch (error: any) {
          if (error.response?.status === 429) {
            // Rate limited - increase delay significantly
            retryDelayRef.current = Math.min(retryDelayRef.current * 2, 600000); // Max 10 minutes
            console.warn('Rate limited for new SO count, retrying in', retryDelayRef.current / 1000, 'seconds');
          } else {
            console.warn('Could not fetch new SO count:', error);
          }
        }

        // PM Tasks - DISABLED TEMPORARILY
        // Fetch PM tasks count (unassigned or assigned to current user) - for HITACHI users only
        // Throttle to max once per 5 minutes
        // if (user.userType === 'HITACHI') {
        //   const now = Date.now();
        //   const lastFetch = lastFetchTimeRef.current['pm-tasks'] || 0;
        //   const timeSinceLastFetch = now - lastFetch;
        //   
        //   if (timeSinceLastFetch < 300000) { // 5 minutes
        //     // Skip this fetch, too soon
        //   } else {
        //     try {
        //       const pmCountResponse = await api.get('/preventive-maintenance/count/unassigned');
        //       if (isMounted) {
        //         setPmTasksCount(pmCountResponse.data || 0);
        //         lastFetchTimeRef.current['pm-tasks'] = now;
        //         retryDelayRef.current = 300000; // Reset to 300 seconds (5 minutes) on success
        //       }
        //     } catch (error: any) {
        //       if (error.response?.status === 429) {
        //         // Rate limited - increase delay significantly
        //         retryDelayRef.current = Math.min(retryDelayRef.current * 2, 900000); // Max 15 minutes
        //         lastFetchTimeRef.current['pm-tasks'] = now; // Update time to prevent immediate retry
        //         console.warn('Rate limited for PM tasks count, retrying in', retryDelayRef.current / 1000, 'seconds');
        //       } else {
        //         console.warn('Could not fetch PM tasks count:', error);
        //       }
        //     }
        //   }
        // }

        // Fetch replacement request count
        try {
          const replacementCountResponse = await api.get('/tickets/count/replacement');
          if (isMounted) {
            setReplacementRequestCount(replacementCountResponse.data || 0);
            retryDelayRef.current = 180000; // Reset to 180 seconds (3 minutes) on success
          }
        } catch (error: any) {
          if (error.response?.status === 429) {
            // Rate limited - increase delay significantly
            retryDelayRef.current = Math.min(retryDelayRef.current * 2, 600000); // Max 10 minutes
            console.warn('Rate limited for replacement request count, retrying in', retryDelayRef.current / 1000, 'seconds');
          } else {
            console.warn('Could not fetch replacement request count:', error);
          }
        }

      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }

      // Schedule next fetch
      if (isMounted) {
        timeoutRef.current = setTimeout(() => {
          if (isMounted) {
            fetchCounts();
          }
        }, retryDelayRef.current);
      }
    };

    if (user) {
      fetchCounts();

      return () => {
        isMounted = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [user, pathname]);

  // Menu Groups dengan struktur baru - menggunakan useMemo untuk re-render saat badgeCount berubah
  const menuGroups: MenuGroup[] = useMemo(() => [
    {
      name: 'dashboard',
      label: 'Dashboard',
      defaultOpen: true,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', link: '/dashboard' },
        { icon: Settings, label: 'Settings', link: '/settings' }, // Moved here - all users can access
      ],
    },
    {
      name: 'administration',
      label: 'Administration',
      adminOnly: true,
      defaultOpen: true,
      items: [
        { icon: FileText, label: 'Audit Logs', link: '/audit-logs' },
      ],
    },
    {
      name: 'operations',
      label: 'Operations',
      defaultOpen: true,
      items: [
        { icon: Monitor, label: 'Machines', link: '/machines' },
        { icon: Disc, label: 'Cassettes', link: '/cassettes' },
        { icon: Wrench, label: 'Repairs', link: '/repairs', hitachiOnly: true },
        // PM Tasks - DISABLED TEMPORARILY
        // { icon: Settings, label: 'PM Tasks', link: '/preventive-maintenance', hitachiOnly: true, badgeCount: pmTasksCount },
      ],
    },
    {
      name: 'service-orders',
      label: 'Service Orders',
      defaultOpen: true,
      items: [
        { icon: Plus, label: 'Buat SO', link: '/service-orders/create' },
        { icon: Ticket, label: 'Active SOs', link: '/tickets', badgeCount: newSOCount },
        { icon: History, label: 'SO History', link: '/history' },
      ],
    },
  ], [newSOCount]); // pmTasksCount removed - PM disabled temporarily

  // Filter menu groups berdasarkan permissions
  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // BANK users can only see Dashboard, Machines, and Cassettes (read-only)
        if (user?.userType === 'BANK') {
          if (item.link === '/dashboard' || item.link === '/machines' || item.link === '/cassettes') {
            return true;
          }
          // Hide Settings for BANK users (or show only profile settings)
          if (item.link === '/settings') {
            return false; // Or return true if you want to show profile settings only
          }
          return false;
        }
        if (item.adminOnly && !isSuperAdmin(user)) return false;
        if (item.hitachiOnly && !isHitachiUser(user)) return false;
        if (item.pengelolaOnly && !isPengelolaUser(user)) return false;
        return true;
      }),
    }))
    .filter(group => {
      // BANK users should not see Administration or Service Orders groups
      if (user?.userType === 'BANK') {
        if (group.name === 'administration' || group.name === 'service-orders') {
          return false;
        }
      }
      if (group.adminOnly && !isSuperAdmin(user)) return false;
      return group.items.length > 0;
    });

  // Untuk mobile, selalu expanded (tidak collapsed)
  // Di mobile (ketika isMobileOpen true), selalu expanded
  const isMobileExpanded = isMobileOpen ? true : !collapsed;

  const sidebarContent = (
    <div className="flex h-full w-full flex-col relative">

      {/* Logo Section */}
      <div className={`flex-shrink-0 h-16 flex items-center ${isMobileExpanded ? 'justify-between' : 'justify-center'} border-b border-teal-700/50 ${isMobileOpen ? 'px-3' : isMobileExpanded ? 'px-6' : 'px-0'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
        <Link
          href="/dashboard"
          onClick={handleLinkClick}
          className={`flex items-center justify-center min-w-0`}
          style={!isMobileExpanded ? { transition: 'none' } : undefined}
        >
          <Image
            src={isMobileExpanded ? "/logo.png" : "/icon-only.png"}
            alt="CASTER"
            width={isMobileExpanded ? 150 : 40}
            height={40}
            className={`${isMobileExpanded ? 'h-10' : 'h-10'} w-auto object-contain`}
            style={!isMobileExpanded ? { transition: 'none' } : undefined}
            priority
          />
        </Link>
        {/* Mobile Close Button - Always show on mobile when open */}
        {setIsMobileOpen && isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-teal-700/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Navigation Section - Scrollable */}
      <nav className={`flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-700 scrollbar-track-teal-800/50 ${isMobileOpen ? 'py-2 px-1' : isMobileExpanded ? 'py-4 px-3' : 'py-4 px-2'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
        <div className={`${isMobileExpanded ? 'space-y-2' : 'flex flex-col items-center space-y-2'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
          {/* Menu Groups */}
          {filteredGroups.map((group) => {
            const groupKey = group.name;
            // Di mobile, selalu expanded. Di desktop, gunakan state expandedGroups
            const isExpanded = isMobileOpen ? true : (expandedGroups[groupKey] ?? (group.defaultOpen ?? true));
            const hasActiveItem = group.items.some(item => pathname === item.link);

            return (
              <div key={groupKey} className={isMobileExpanded ? 'space-y-1' : 'w-full'}>
                {/* Group Header - Only show when expanded */}
                {isMobileExpanded && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className={cn(
                      `w-full flex items-center justify-between ${isMobileOpen ? 'px-1.5 py-1.5' : 'px-3 py-2.5'} rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200`,
                      hasActiveItem && !isExpanded
                        ? 'bg-teal-700/30 text-teal-300'
                        : 'text-teal-400/80 hover:bg-teal-700/50 hover:text-teal-300'
                    )}
                  >
                    <span className="truncate">{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                )}

                {/* Group Items - Show when expanded (if expanded) or always show when collapsed */}
                {((isMobileExpanded && isExpanded) || !isMobileExpanded) && (
                  <div className={`${isMobileExpanded ? 'mt-1 space-y-1' : 'w-full flex flex-col items-center space-y-1'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      // Check if this item should be active
                      // Strategy: Find the most specific matching item
                      const allMatchingItems = group.items.filter(otherItem => {
                        // Exact match
                        if (pathname === otherItem.link) return true;
                        // Path starts with item link + '/' - but only if no other item matches more specifically
                        if (pathname.startsWith(otherItem.link + '/')) {
                          // Check if there's a more specific match (longer path)
                          const hasMoreSpecificMatch = group.items.some(anotherItem => 
                            anotherItem.link !== otherItem.link && 
                            anotherItem.link.length > otherItem.link.length &&
                            pathname.startsWith(anotherItem.link + '/')
                          );
                          // Only match if no more specific item exists
                          return !hasMoreSpecificMatch;
                        }
                        return false;
                      });

                      // Sort by specificity (longer path = more specific)
                      const sortedMatches = allMatchingItems.sort((a, b) => {
                        // Exact match is most specific
                        if (pathname === a.link) return -1;
                        if (pathname === b.link) return 1;
                        // Otherwise, longer path is more specific
                        return b.link.length - a.link.length;
                      });

                      // This item is active only if it's the most specific match
                      const isActive = sortedMatches.length > 0 && sortedMatches[0].link === item.link;

                      return (
                        <Link
                          key={item.link}
                          href={item.link}
                          onClick={handleLinkClick}
                          className={cn(
                            `relative flex items-center ${isMobileOpen ? 'space-x-1.5 px-1.5 py-1.5' : isMobileExpanded ? 'space-x-3 px-3 py-2' : 'justify-center w-10 h-10 mx-auto'} rounded-lg text-sm font-medium min-w-0`,
                            isMobileExpanded ? 'transition-colors duration-200' : '',
                            isActive
                              ? 'bg-teal-700 text-white shadow-lg'
                              : 'text-teal-300 hover:bg-teal-700/50 hover:text-white'
                          )}
                          title={isMobileExpanded ? undefined : item.label}
                          style={!isMobileExpanded ? { transition: 'none' } : undefined}
                        >
                          <Icon className={`${isMobileExpanded ? 'h-4 w-4' : 'h-5 w-5'} flex-shrink-0`} style={!isMobileExpanded ? { transition: 'none' } : undefined} />
                          {isMobileExpanded && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                                <Badge className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5">
                                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                </Badge>
                              )}
                            </>
                          )}
                          {!isMobileExpanded && item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                              {item.badgeCount > 99 ? '99+' : item.badgeCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Section - Moved to Bottom */}
      <div className={`flex-shrink-0 border-t border-teal-700/50 ${isMobileOpen ? 'px-1 py-2' : isMobileExpanded ? 'px-4 py-4' : 'px-2 py-4'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
        <div className={`flex items-center ${isMobileExpanded ? 'space-x-3' : 'justify-center'} rounded-lg bg-teal-700/30 ${isMobileOpen ? 'px-1.5 py-1.5' : isMobileExpanded ? 'px-3 py-3' : 'p-2'} min-w-0`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-teal-600 border-2 border-teal-400 shadow-md" style={!isMobileExpanded ? { transition: 'none' } : undefined}>
            <User className="h-5 w-5 text-white" style={!isMobileExpanded ? { transition: 'none' } : undefined} />
          </div>
          {isMobileExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-teal-300 truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div className={`flex-shrink-0 border-t border-teal-700/50 ${isMobileOpen ? 'px-1 py-2' : isMobileExpanded ? 'p-4' : 'p-2'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center text-sm font-medium text-teal-300 hover:bg-red-600/10 hover:text-red-400 rounded-lg min-w-0',
            isMobileExpanded
              ? 'space-x-3 px-4 py-2.5 transition-colors duration-200'
              : 'justify-center w-10 h-10 mx-auto'
          )}
          title={isMobileExpanded ? undefined : 'Logout'}
          style={!isMobileExpanded ? { transition: 'none' } : undefined}
        >
          <LogOut className={`${isMobileExpanded ? 'h-5 w-5 flex-shrink-0' : 'h-5 w-5'}`} />
          {isMobileExpanded && (
            <span className="truncate">Logout</span>
          )}
        </button>
      </div>

      {/* Footer - Made with love */}
      <div className={`flex-shrink-0 border-t border-teal-700/50 ${isMobileOpen ? 'px-1 py-1.5' : isMobileExpanded ? 'px-4 py-3' : 'px-2 py-2'}`} style={!isMobileExpanded ? { transition: 'none' } : undefined}>
        {isMobileExpanded ? (
          <p className="text-xs text-center text-teal-400/80 leading-relaxed">
            Made with{' '}
            <Heart
              className="inline h-3.5 w-3.5 text-red-500 fill-red-500 align-middle mx-0.5"
              style={{
                animation: 'heartbeat 1.5s ease-in-out infinite',
              }}
            />{' '}
            by{' '}
            <a
              href="https://github.com/dikaipan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-300 hover:text-teal-200 font-medium transition-colors hover:underline"
            >
              Handika
            </a>{' '}
            &{' '}
            <span className="text-teal-300 font-medium">Ops Team</span>
          </p>
        ) : (
          <div className="flex items-center justify-center">
            <Heart
              className="h-4 w-4 text-red-500 fill-red-500"
              style={{
                animation: 'heartbeat 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, always visible on desktop */}
      <aside
        className={cn(
          "hidden lg:flex bg-gradient-to-b from-teal-800 to-teal-900 text-white shadow-2xl relative",
          collapsed && "[&_*]:!transition-none"
        )}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          width: sidebarWidth,
          transition: shouldTransition ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          zIndex: 40,
        }}
      >
        {/* Collapse Toggle Button - Desktop Only */}
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-8 w-6 h-6 bg-teal-600 rounded-full items-center justify-center text-white hover:bg-teal-700 transition shadow-lg z-50 flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-full h-full overflow-y-auto overflow-x-hidden relative">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar - Overlay */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-[45]"
            onClick={() => setIsMobileOpen?.(false)}
          />
          {/* Sidebar */}
          <aside className="lg:hidden fixed left-0 top-0 z-[50] h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

