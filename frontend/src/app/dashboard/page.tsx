'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { useMachineStats } from '@/hooks/useMachines';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import {
  Building2,
  Users,
  Package,
  Disc,
  Wrench,
  AlertCircle,
  TrendingUp,
  Activity,
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
  XCircle,
  Monitor,
  Truck,
  Filter,
  Download,
  FileText,
  Receipt,
  Info,
  Send,
} from 'lucide-react';
// Lazy load Chart.js to improve initial page load
import dynamic from 'next/dynamic';

// Dynamically import chart components to reduce initial bundle size
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

// Initialize Chart.js only when needed
let chartInitialized = false;
const initializeChart = async () => {
  if (typeof window !== 'undefined' && !chartInitialized) {
    try {
      // Use chart.js/auto to auto-register all controllers/plugins including Filler
      await import('chart.js/auto');
      chartInitialized = true;
    } catch (error) {
      // Chart.js initialization error - handled silently
    }
  }
};

interface DashboardStats {
  totalMachines: number;
  totalCassettes: number;
  totalBanks: number;
  totalPengelola: number;
  machineTrend: number;
  cassetteTrend: number;
  machineStatus: {
    operational: number;
    underRepair: number;
    inactive: number;
  };
  cassetteStatus: {
    ok: number;
    bad: number;
    inTransit: number;
    inRepair: number;
  };
  healthScore: number;
  topBanks: Array<{
    bankId: string;
    bankName: string;
    branchName: string;
    machineCount: number;
  }>;
  recentActivities: Array<{
    type: string;
    description: string;
    details: string;
    timestamp: Date;
    ticketId?: string;
  }>;
  alerts: {
    criticalTickets: number;
    longRepairs: number;
    badCassettes: number;
  };
  ticketStats?: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  ticketUsageByCassetteAndPengelola?: Array<{
    pengelolaId: string;
    pengelolaName: string;
    cassetteSerialNumber: string;
    openTickets: number;
  }>;
  repairUsageByCassette?: Array<{
    cassetteSerialNumber: string;
    repairCount: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  
  // Role-based permissions
  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';
  const isRCStaff = user?.role === 'RC_STAFF';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Use React Query untuk fetch stats dengan automatic caching
  // Only fetch if authenticated
  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useMachineStats(isAuthenticated && !isLoading);
  
  // Transform data dari API ke format yang diharapkan
  const stats: DashboardStats = statsData ? {
    totalMachines: statsData.totalMachines || 0,
    totalCassettes: statsData.totalCassettes || 0,
    totalBanks: statsData.totalBanks || 0,
    totalPengelola: statsData.totalPengelola || statsData.totalVendors || 0,
    machineTrend: statsData.machineTrend || 0,
    cassetteTrend: statsData.cassetteTrend || 0,
    machineStatus: statsData.machineStatus || {
      operational: 0,
      underRepair: 0,
      inactive: 0,
    },
    cassetteStatus: statsData.cassetteStatus || {
      ok: 0,
      bad: 0,
      inTransit: 0,
      inRepair: 0,
    },
    healthScore: statsData.healthScore || 0,
    topBanks: statsData.topBanks || [],
    recentActivities: Array.isArray(statsData.recentActivities) ? statsData.recentActivities : [],
    alerts: statsData.alerts || {
      criticalTickets: 0,
      longRepairs: 0,
      badCassettes: 0,
    },
    ticketStats: statsData.ticketStats || {
      total: 0,
      byStatus: {},
      byPriority: {},
    },
    ticketUsageByCassetteAndPengelola: statsData.ticketUsageByCassetteAndPengelola || [],
    repairUsageByCassette: statsData.repairUsageByCassette || [],
  } : {
    totalMachines: 0,
    totalCassettes: 0,
    totalBanks: 0,
    totalPengelola: 0,
    machineTrend: 0,
    cassetteTrend: 0,
    machineStatus: {
      operational: 0,
      underRepair: 0,
      inactive: 0,
    },
    cassetteStatus: {
      ok: 0,
      bad: 0,
      inTransit: 0,
      inRepair: 0,
    },
    healthScore: 0,
    topBanks: [],
    recentActivities: [],
    alerts: {
      criticalTickets: 0,
      longRepairs: 0,
      badCassettes: 0,
    },
    ticketStats: {
      total: 0,
      byStatus: {},
      byPriority: {},
    },
    ticketUsageByCassetteAndPengelola: [],
    repairUsageByCassette: [],
  };
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const retryDelayRef = useRef(120000); // Start with 120 seconds (2 minutes)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch notification counts - Only fetch once on mount, no polling (to avoid rate limiting)
  // Sidebar already handles polling, so dashboard just needs initial load
  // Use useRef to prevent multiple calls
  const hasFetchedNotifications = useRef(false);
  
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      if (!isAuthenticated || !user || hasFetchedNotifications.current) return;

      try {
        setLoadingNotifications(true);
        hasFetchedNotifications.current = true;
      } catch (error) {
        // Error fetching notification counts - handled silently
        hasFetchedNotifications.current = false;
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (isAuthenticated && user) {
      fetchNotificationCounts();
    }
  }, [isAuthenticated, user]);

  // Initialize Chart.js when stats data is loaded
  useEffect(() => {
    if (!loadingStats && statsData) {
      initializeChart();
    }
  }, [loadingStats, statsData]);
  
  // Monitor recentActivities changes (removed debug logging)
  useEffect(() => {
  }, [stats.recentActivities]);

  if (isLoading || loadingStats) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] dark:text-teal-400" />
            <p className="text-lg font-medium text-gray-600 dark:text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // All authenticated users can access dashboard, but with role-based content
  if (!isAuthenticated) {
    return (
      <PageLayout>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-slate-200 font-bold text-lg mb-2">Akses Ditolak</p>
            <p className="text-slate-300 mb-3">Silakan login terlebih dahulu untuk mengakses dashboard.</p>
            <Button 
              variant="outline" 
              className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold" 
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, link }: any) => (
    <Link href={link || '#'}>
      <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 animate-fade-in`}>
        <div className={`absolute inset-0 ${color.gradient} opacity-10`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">{title}</CardTitle>
          <div className={`p-3 rounded-xl ${color.iconBg} dark:bg-slate-700/50`}>
            <Icon className={`h-6 w-6 ${color.icon}`} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {loadingStats ? '...' : (value || 0).toLocaleString()}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <TrendingUp className={`h-4 w-4 ${trend === 'down' && 'rotate-180'}`} />
              <span className="font-medium">{trendValue}</span>
              <span className="text-gray-500 dark:text-slate-500">vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  const totalMachineIssues = stats.machineStatus.underRepair + stats.machineStatus.inactive;
  const totalCassetteIssues = stats.cassetteStatus.bad + stats.cassetteStatus.inRepair;
  const machineOperationalPercentage = stats.totalMachines > 0 ? (stats.machineStatus.operational / stats.totalMachines) * 100 : 0;
  const cassetteOkPercentage = stats.totalCassettes > 0 ? (stats.cassetteStatus.ok / stats.totalCassettes) * 100 : 0;
  const cassetteIssuePercentage = stats.totalCassettes > 0 ? (totalCassetteIssues / stats.totalCassettes) * 100 : 0;

  return (
    <PageLayout>
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="summary" className="flex-1">Ringkasan</TabsTrigger>
          {isHitachi && (
            <TabsTrigger value="analytics" className="flex-1">Analitik</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="summary" className="mt-0">
          {/* Stats Grid - Role Based */}
          {isHitachi ? (
            // Hitachi: Show all stats
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Mesin"
                value={stats.totalMachines}
                icon={Monitor}
                trend={stats.machineTrend >= 0 ? "up" : "down"}
                trendValue={`${stats.machineTrend > 0 ? '+' : ''}${stats.machineTrend.toFixed(1)}%`}
                link="/machines"
                color={{
                  gradient: 'bg-gradient-to-br from-[#2563EB] to-[#1E40AF]',
                  icon: 'text-[#2563EB]',
                  iconBg: 'bg-blue-50',
                }}
              />
              <StatCard
                title="Total Kaset"
                value={stats.totalCassettes}
                icon={Disc}
                trend={stats.cassetteTrend >= 0 ? "up" : "down"}
                trendValue={`${stats.cassetteTrend > 0 ? '+' : ''}${stats.cassetteTrend.toFixed(1)}%`}
                link="/cassettes"
                color={{
                  gradient: 'bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]',
                  icon: 'text-[#0EA5E9]',
                  iconBg: 'bg-sky-50',
                }}
              />
              <StatCard
                title="Banks"
                value={stats.totalBanks}
                icon={Building2}
                link="/settings?tab=banks"
                color={{
                  gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
                  icon: 'text-green-600',
                  iconBg: 'bg-green-50',
                }}
              />
              <StatCard
                title="Pengelola"
                value={stats.totalPengelola}
                icon={Truck}
                link="/settings?tab=vendors"
                color={{
                  gradient: 'bg-gradient-to-br from-[#64748B] to-[#475569]',
                  icon: 'text-[#64748B]',
                  iconBg: 'bg-slate-50',
                }}
              />
            </div>
          ) : (
            // Pengelola: Show only cassette-focused stats
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Kaset"
                value={stats.totalCassettes}
                icon={Disc}
                link="/cassettes"
                color={{
                  gradient: 'bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]',
                  icon: 'text-[#0EA5E9]',
                  iconBg: 'bg-sky-50',
                }}
              />
              <StatCard
                title="Kaset OK"
                value={stats.cassetteStatus.ok}
                icon={CheckCircle2}
                link="/cassettes"
                color={{
                  gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
                  icon: 'text-green-600',
                  iconBg: 'bg-green-50',
                }}
              />
              <StatCard
                title="Kaset Rusak"
                value={stats.cassetteStatus.bad}
                icon={XCircle}
                link="/cassettes"
                color={{
                  gradient: 'bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]',
                  icon: 'text-red-600',
                  iconBg: 'bg-red-50',
                }}
              />
            </div>
          )}

          {/* Machine & Cassette Status */}
          <div className={`grid grid-cols-1 ${isHitachi ? 'lg:grid-cols-2' : ''} gap-6 mb-8`}>
            {/* Machine Status - Only for Hitachi */}
            {isHitachi && (
              <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg animate-slide-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Monitor className="h-5 w-5 text-[#2563EB] dark:text-teal-400" />
                    </div>
                    Status Mesin
                  </CardTitle>
                  <CardDescription>Status semua mesin dalam sistem</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">Operational</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Running smoothly</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.machineStatus.operational}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {stats.totalMachines > 0 ? ((stats.machineStatus.operational / stats.totalMachines) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">Under Repair</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Need attention</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.machineStatus.underRepair}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {stats.totalMachines > 0 ? ((stats.machineStatus.underRepair / stats.totalMachines) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 group-hover:bg-gray-100 dark:group-hover:bg-slate-700 transition-colors">
                          <Zap className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">Inactive</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Out of service</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-600 dark:text-slate-400">{stats.machineStatus.inactive}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {stats.totalMachines > 0 ? ((stats.machineStatus.inactive / stats.totalMachines) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400 mb-2">
                      <span>Health Score</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {stats.healthScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out animate-pulse-glow"
                        style={{ width: `${stats.healthScore}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cassette Status */}
            <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg animate-slide-in" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                    <Disc className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  Status Kaset
                </CardTitle>
                <CardDescription>Status semua kaset dalam sistem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">Kondisi Baik</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Siap digunakan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.cassetteStatus.ok}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {stats.totalCassettes > 0 ? ((stats.cassetteStatus.ok / stats.totalCassettes) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">Rusak</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Perlu perbaikan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.cassetteStatus.bad}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {stats.totalCassettes > 0 ? ((stats.cassetteStatus.bad / stats.totalCassettes) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                        <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">Dalam Pengiriman</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Sedang dikirim</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.cassetteStatus.inTransit}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {stats.totalCassettes > 0 ? ((stats.cassetteStatus.inTransit / stats.totalCassettes) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                        <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">Dalam Perbaikan</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Sedang diperbaiki</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.cassetteStatus.inRepair}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {stats.totalCassettes > 0 ? ((stats.cassetteStatus.inRepair / stats.totalCassettes) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400 mb-2">
                    <span>Tingkat Ketersediaan</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {stats.totalCassettes > 0 ? ((stats.cassetteStatus.ok / stats.totalCassettes) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out animate-pulse-glow"
                      style={{ width: `${stats.totalCassettes > 0 ? (stats.cassetteStatus.ok / stats.totalCassettes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Role Based */}
          <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg mb-8 animate-slide-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Zap className="h-5 w-5 text-[#2563EB] dark:text-teal-400" />
                </div>
                Aksi Cepat
              </CardTitle>
              <CardDescription>Operasi yang sering digunakan</CardDescription>
            </CardHeader>
            <CardContent>
              {isHitachi ? (
                // Hitachi: All actions
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/machines">
                    <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                      <Monitor className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <p className="font-semibold">Kelola Mesin</p>
                        <p className="text-xs opacity-90">Lihat & edit mesin</p>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/cassettes">
                    <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                      <Disc className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <p className="font-semibold">Kelola Kaset</p>
                        <p className="text-xs opacity-90">Track inventory</p>
                      </div>
                    </Button>
                  </Link>

                  {isSuperAdmin && (
                    <Link href="/settings?tab=data-management">
                      <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                        <Package className="h-8 w-8 group-hover:scale-110 transition-transform" />
                        <div className="text-center">
                          <p className="font-semibold">Bulk Import</p>
                          <p className="text-xs opacity-90">Import data</p>
                        </div>
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                // Pengelola: Cassettes and Tickets only
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/cassettes">
                    <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                      <Disc className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <p className="font-semibold">Kelola Kaset</p>
                        <p className="text-xs opacity-90">Lihat kaset</p>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/tickets/create">
                    <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                      <AlertCircle className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <p className="font-semibold">Buat SO</p>
                        <p className="text-xs opacity-90">Laporkan masalah</p>
                      </div>
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          {(stats.alerts.criticalTickets > 0 || stats.alerts.longRepairs > 0 || stats.alerts.badCassettes > 0) && (
            <Card className="border-2 border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20 shadow-lg mb-8 animate-slide-in" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  Peringatan Penting
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-400">Masalah yang memerlukan perhatian segera</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.alerts.criticalTickets > 0 && (
                    <div className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-2xl text-red-600 dark:text-red-400">{stats.alerts.criticalTickets}</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">SO Kritis</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Masalah prioritas tinggi</p>
                      </div>
                    </div>
                  )}
                  {isHitachi && stats.alerts.longRepairs > 0 && (
                    <div className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40 shrink-0">
                        <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-bold text-2xl text-orange-600 dark:text-orange-400">{stats.alerts.longRepairs}</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Perbaikan Lama</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perbaikan &gt; 7 hari</p>
                      </div>
                    </div>
                  )}
                  {stats.alerts.badCassettes > 0 && (
                    <div className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
                        <Disc className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-2xl text-red-600 dark:text-red-400">{stats.alerts.badCassettes}</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Kaset Rusak</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perlu perbaikan segera</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activities & Top Banks */}
          <div className={`grid grid-cols-1 ${isHitachi ? 'lg:grid-cols-2' : ''} gap-6 mb-8`}>
            {/* Recent Activities */}
            <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg animate-slide-in" style={{ animationDelay: '300ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Activity className="h-5 w-5 text-[#2563EB] dark:text-teal-400" />
                  </div>
                  Aktivitas Terbaru
                </CardTitle>
                <CardDescription>Aktivitas Service Order terbaru</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563EB] dark:text-teal-400" />
                  </div>
                ) : stats.recentActivities && stats.recentActivities.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {stats.recentActivities.map((activity: any, idx: number) => {
                      const getActivityIcon = () => {
                        if (activity.type === 'ticket_created') return Package;
                        if (activity.type === 'ticket_resolved') return CheckCircle2;
                        return AlertCircle;
                      };
                      
                      const getActivityColor = () => {
                        if (activity.type === 'ticket_created') return 'bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] dark:text-teal-400';
                        if (activity.type === 'ticket_resolved') return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
                        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
                      };
                      
                      const ActivityIcon = getActivityIcon();
                      
                      return (
                        <Link 
                          key={idx}
                          href={activity.ticketId ? `/tickets/${activity.ticketId}` : '#'}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors border border-gray-100 dark:border-slate-700 cursor-pointer"
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${getActivityColor()}`}>
                            <ActivityIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{activity.description}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{activity.details}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada aktivitas terbaru</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Banks - Only for Hitachi */}
            {isHitachi && (
              <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg animate-slide-in" style={{ animationDelay: '350ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    Top Banks berdasarkan Jumlah Mesin
                  </CardTitle>
                  <CardDescription>Bank dengan mesin terbanyak</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-400" />
                    </div>
                  ) : stats.topBanks.length > 0 ? (
                    <div className="space-y-3">
                      {stats.topBanks.map((bank, idx) => (
                        <div
                          key={bank.bankId}
                          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 dark:bg-green-500 text-white font-bold text-sm shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{bank.bankName}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{bank.branchName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{bank.machineCount}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">mesin</p>
                            </div>
                            <Monitor className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Tidak ada data bank</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">

          {isHitachi && stats.ticketUsageByCassetteAndPengelola && stats.ticketUsageByCassetteAndPengelola.length > 0 && (
            <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                    <Disc className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  SN Kaset dengan SO Terbanyak
                </CardTitle>
                <CardDescription>Daftar SN kaset yang paling sering muncul di SO (open + closed), terlepas dari pengelola.</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const aggregate: Record<string, number> = {};
                  stats.ticketUsageByCassetteAndPengelola!.forEach((item) => {
                    aggregate[item.cassetteSerialNumber] = (aggregate[item.cassetteSerialNumber] || 0) + (item.openTickets || 0);
                  });
                  const entries = Object.entries(aggregate)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                  if (entries.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        <Disc className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada SN kaset dengan jumlah SO yang signifikan.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: entries.map(([serial]) => serial),
                          datasets: [
                            {
                              label: 'Total SO',
                              data: entries.map(([, count]) => count),
                              backgroundColor: 'rgba(239, 68, 68, 0.6)',
                              borderColor: 'rgba(239, 68, 68, 1)',
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            title: {
                              display: false,
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              titleColor: '#fff',
                              bodyColor: '#fff',
                              padding: 12,
                              displayColors: false,
                              callbacks: {
                                title: (context) => `SN: ${context[0].label}`,
                                label: (context) => `Total SO: ${context.raw}`,
                              },
                            },
                          },
                          scales: {
                            x: {
                              ticks: {
                                maxRotation: 45,
                                minRotation: 45,
                                autoSkip: false,
                                color: '#6b7280',
                                font: {
                                  size: 11,
                                },
                              },
                              grid: {
                                display: false,
                              },
                            },
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                color: '#6b7280',
                                font: {
                                  size: 11,
                                },
                              },
                              grid: {
                                color: 'rgba(156, 163, 175, 0.2)',
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {isHitachi && stats.repairUsageByCassette && stats.repairUsageByCassette.length > 0 && (
            <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  SN Kaset dengan Repair Ticket Terbanyak
                </CardTitle>
                <CardDescription>
                  Daftar SN kaset yang paling sering masuk repair (termasuk multi‑kaset dalam satu tiket). Semakin panjang bar, semakin sering kaset tersebut diperbaiki.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: stats.repairUsageByCassette.map((item) => item.cassetteSerialNumber),
                      datasets: [
                        {
                          label: 'Jumlah Repair',
                          data: stats.repairUsageByCassette.map((item) => item.repairCount),
                          backgroundColor: 'rgba(99, 102, 241, 0.6)',
                          borderColor: 'rgba(99, 102, 241, 1)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          padding: 12,
                          displayColors: false,
                          callbacks: {
                            title: (context) => `SN: ${context[0].label}`,
                            label: (context) => `Repair: ${context.raw}`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: false,
                            color: '#6b7280',
                            font: {
                              size: 11,
                            },
                          },
                          grid: {
                            display: false,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                            color: '#6b7280',
                            font: {
                              size: 11,
                            },
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.2)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Analytics Section */}
          <AnalyticsSection user={user} isHitachi={isHitachi} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

// Analytics Section Component
function AnalyticsSection({ user, isHitachi }: { user: any; isHitachi: boolean }) {
  const [operationalMetrics, setOperationalMetrics] = useState<any>(null);
  const [cassetteAnalytics, setCassetteAnalytics] = useState<any>(null);
  const [repairAnalytics, setRepairAnalytics] = useState<any>(null);
  const [soAnalytics, setSoAnalytics] = useState<any>(null);
  const [pengelolaComparison, setPengelolaComparison] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [metricsInsightOpen, setMetricsInsightOpen] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedPengelolaId, setSelectedPengelolaId] = useState<string>('');
  const [banks, setBanks] = useState<any[]>([]);
  const [pengelolaList, setPengelolaList] = useState<any[]>([]);

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Load banks and pengelola for filter
  useEffect(() => {
    if (isHitachi) {
      api.get('/banks').then(res => {
        setBanks(res.data || []);
      }).catch(() => {});
      
      api.get('/pengelola').then(res => {
        setPengelolaList(res.data || []);
      }).catch(() => {});
    }
  }, [isHitachi]);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }
    
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    
    try {
      const params: any = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      if (selectedBankId) {
        params.bankId = selectedBankId;
      }
      if (selectedPengelolaId) {
        params.pengelolaId = selectedPengelolaId;
      }

      const [opMetrics, cassAnalytics, repAnalytics, soAnalyticsData, pengelolaComp] = await Promise.all([
        api.get('/analytics/operational-metrics', { params }).catch(() => ({ data: null })),
        api.get('/analytics/cassette-analytics', { params }).catch(() => ({ data: null })),
        api.get('/analytics/repair-analytics', { params }).catch(() => ({ data: null })),
        api.get('/analytics/service-order-analytics', { params }).catch(() => ({ data: null })),
        api.get('/analytics/pengelola-comparison', { params }).catch(() => ({ data: [] })),
      ]);

      setOperationalMetrics(opMetrics.data);
      setCassetteAnalytics(cassAnalytics.data);
      setRepairAnalytics(repAnalytics.data);
      setSoAnalytics(soAnalyticsData.data);
      setPengelolaComparison(pengelolaComp.data || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Gagal memuat data analitik';
      setAnalyticsError(errorMessage);
      // Error loading analytics - handled by error state
    } finally {
      setLoadingAnalytics(false);
    }
  }, [startDate, endDate, selectedBankId, selectedPengelolaId]);

  useEffect(() => {
    if (startDate && endDate) {
      loadAnalytics();
    }
  }, [startDate, endDate, selectedBankId, selectedPengelolaId, loadAnalytics]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <Card className="border-2 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Analitik
          </CardTitle>
          <CardDescription>Pilih periode dan filter untuk melihat analitik</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Akhir</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            {isHitachi && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankFilter">Filter Bank</Label>
                  <Select value={selectedBankId || 'all'} onValueChange={(value) => setSelectedBankId(value === 'all' ? '' : value)}>
                    <SelectTrigger id="bankFilter">
                      <SelectValue placeholder="Semua Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Bank</SelectItem>
                      {banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pengelolaFilter">Filter Pengelola</Label>
                  <Select value={selectedPengelolaId || 'all'} onValueChange={(value) => setSelectedPengelolaId(value === 'all' ? '' : value)}>
                    <SelectTrigger id="pengelolaFilter">
                      <SelectValue placeholder="Semua Pengelola" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Pengelola</SelectItem>
                      {pengelolaList.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {analyticsError && (
        <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">Error: {analyticsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* A. Metrik Performa Operasional */}
          <Card className="border-2 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Metrik Performa Operasional
                  </CardTitle>
                  <CardDescription>MTTR, MTBF, Cycle Time, dan Turnaround Time</CardDescription>
                </div>
                <Dialog open={metricsInsightOpen} onOpenChange={setMetricsInsightOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Penjelasan Perhitungan Metrik Operasional
                      </DialogTitle>
                      <DialogDescription>
                        Penjelasan detail tentang cara perhitungan MTTR, MTBF, Cycle Time, dan Turnaround Time
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                      {/* MTTR */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                          MTTR (Mean Time To Repair)
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                          <strong>Definisi:</strong> Rata-rata waktu yang dibutuhkan untuk memperbaiki kaset dari saat diterima di Repair Center (RC) hingga selesai diperbaiki.
                        </p>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                          <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                            <strong>Rumus:</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                            MTTR = Σ(Waktu Perbaikan) / Jumlah Perbaikan yang Selesai
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                            <strong>Keterangan:</strong>
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                            <li>Waktu Perbaikan = completedAt - receivedAtRc (dalam hari)</li>
                            <li>Hanya menghitung perbaikan dengan status COMPLETED</li>
                            <li>Hanya menghitung perbaikan yang memiliki receivedAtRc dan completedAt</li>
                            <li>Satuan: Hari</li>
                          </ul>
                        </div>
                      </div>

                      {/* MTBF */}
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-600"></div>
                          MTBF (Mean Time Between Failures)
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                          <strong>Definisi:</strong> Rata-rata waktu antara dua kegagalan berturut-turut pada kaset yang sama.
                        </p>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-700">
                          <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                            <strong>Rumus:</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                            MTBF = Σ(Waktu Antara Kegagalan) / Jumlah Interval Kegagalan
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                            <strong>Keterangan:</strong>
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                            <li>Menghitung selisih waktu antara completedAt dari perbaikan sebelumnya dan perbaikan berikutnya untuk kaset yang sama</li>
                            <li>Hanya menghitung kaset yang memiliki lebih dari 1 perbaikan (multiple failures)</li>
                            <li>Interval dihitung dari perbaikan pertama ke perbaikan kedua, kedua ke ketiga, dst.</li>
                            <li>Satuan: Hari</li>
                          </ul>
                        </div>
                      </div>

                      {/* Cycle Time */}
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                          Cycle Time (Waktu Siklus)
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                          <strong>Definisi:</strong> Rata-rata waktu total dari pembuatan Service Order (ticket) hingga perbaikan selesai.
                        </p>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded border border-orange-200 dark:border-orange-700">
                          <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                            <strong>Rumus:</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                            Cycle Time ≈ MTTR (saat ini menggunakan pendekatan MTTR)
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                            <strong>Keterangan:</strong>
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                            <li>Cycle Time lengkap = dari reportedAt (ticket creation) hingga completedAt (repair completion)</li>
                            <li>Saat ini menggunakan MTTR sebagai pendekatan karena memerlukan linking yang lebih akurat antara ticket dan repair</li>
                            <li>Cycle Time penuh akan mencakup: waktu pelaporan, pengiriman ke RC, perbaikan, dan QC</li>
                            <li>Satuan: Hari</li>
                          </ul>
                        </div>
                      </div>

                      {/* Turnaround Time */}
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                          Turnaround Time (Waktu Putar Balik)
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                          <strong>Definisi:</strong> Rata-rata waktu dari saat kaset diterima di Repair Center (RC) hingga selesai diperbaiki dan siap dikembalikan.
                        </p>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                          <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                            <strong>Rumus:</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                            Turnaround Time = Σ(completedAt - receivedAtRc) / Jumlah Perbaikan
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                            <strong>Keterangan:</strong>
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                            <li>Waktu dihitung dari receivedAtRc (saat diterima di RC) hingga completedAt (saat perbaikan selesai)</li>
                            <li>Hanya menghitung perbaikan dengan status COMPLETED</li>
                            <li>Hanya menghitung perbaikan yang memiliki receivedAtRc dan completedAt</li>
                            <li>Turnaround Time = MTTR (keduanya menggunakan perhitungan yang sama)</li>
                            <li>Satuan: Hari</li>
                          </ul>
                        </div>
                      </div>

                      {/* Catatan Penting */}
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Catatan Penting
                        </h3>
                        <ul className="text-xs text-gray-700 dark:text-slate-300 list-disc list-inside space-y-1">
                          <li>Semua perhitungan hanya menggunakan data perbaikan yang <strong>COMPLETED</strong></li>
                          <li>Perbaikan yang tidak memiliki <strong>receivedAtRc</strong> atau <strong>completedAt</strong> tidak dihitung</li>
                          <li>Data yang dihitung dapat difilter berdasarkan periode, bank, atau pengelola</li>
                          <li>Metrik ini membantu mengukur efisiensi operasional Repair Center</li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {operationalMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">MTTR</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {operationalMetrics.mttr.toFixed(1)} hari
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Mean Time To Repair</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">MTBF</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {operationalMetrics.mtbf.toFixed(1)} hari
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Mean Time Between Failures</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Cycle Time</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {operationalMetrics.avgCycleTime.toFixed(1)} hari
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Rata-rata waktu perbaikan</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Turnaround Time</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {operationalMetrics.avgTurnaroundTime.toFixed(1)} hari
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Waktu dari RC ke selesai</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada data metrik operasional</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. Analitik Kaset */}
          <Card className="border-2 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Disc className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Analitik Kaset
              </CardTitle>
              <CardDescription>Top 10 kaset bermasalah, distribusi cycle problem, usia kaset, dan utilization rate</CardDescription>
            </CardHeader>
            <CardContent>
              {cassetteAnalytics ? (
                <div className="space-y-6">
                  {/* Top 10 Problematic */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top 10 Kaset Bermasalah</h3>
                    {cassetteAnalytics.top10Problematic.length > 0 ? (
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: cassetteAnalytics.top10Problematic.map((c: any) => c.serialNumber),
                            datasets: [{
                              label: 'Total Issues',
                              data: cassetteAnalytics.top10Problematic.map((c: any) => c.totalIssues),
                              backgroundColor: 'rgba(239, 68, 68, 0.6)',
                              borderColor: 'rgba(239, 68, 68, 1)',
                              borderWidth: 1,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  afterLabel: (context: any) => {
                                    const item = cassetteAnalytics.top10Problematic[context.dataIndex];
                                    return `SO: ${item.problemCount}, Repair: ${item.repairCount}`;
                                  },
                                },
                              },
                            },
                            scales: {
                              x: { ticks: { maxRotation: 45, minRotation: 45 } },
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Tidak ada data</p>
                    )}
                  </div>

                  {/* Cycle Problem Distribution */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Distribusi Cycle Problem</h3>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: Object.keys(cassetteAnalytics.cycleProblemDistribution),
                          datasets: [{
                            label: 'Jumlah Kaset',
                            data: Object.values(cassetteAnalytics.cycleProblemDistribution),
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.6)',
                              'rgba(234, 179, 8, 0.6)',
                              'rgba(249, 115, 22, 0.6)',
                              'rgba(239, 68, 68, 0.6)',
                              'rgba(185, 28, 28, 0.6)',
                            ],
                            borderColor: [
                              'rgba(34, 197, 94, 1)',
                              'rgba(234, 179, 8, 1)',
                              'rgba(249, 115, 22, 1)',
                              'rgba(239, 68, 68, 1)',
                              'rgba(185, 28, 28, 1)',
                            ],
                            borderWidth: 1,
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                          },
                          scales: {
                            y: { beginAtZero: true },
                          },
                        }}
                      />
                    </div>
                  </div>

                  {/* Age Distribution & Utilization */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Distribusi Usia Kaset</h3>
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: Object.keys(cassetteAnalytics.ageDistribution),
                            datasets: [{
                              label: 'Jumlah Kaset',
                              data: Object.values(cassetteAnalytics.ageDistribution),
                              backgroundColor: 'rgba(99, 102, 241, 0.6)',
                              borderColor: 'rgba(99, 102, 241, 1)',
                              borderWidth: 1,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Utilization Rate</h3>
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                            {cassetteAnalytics.utilizationRate.toFixed(1)}%
                          </div>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {cassetteAnalytics.activeCassettes} dari {cassetteAnalytics.totalCassettes} kaset aktif
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  <Disc className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada data analitik kaset</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* D. Analitik Perbaikan */}
          <Card className="border-2 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Analitik Perbaikan
              </CardTitle>
              <CardDescription>Repair success rate, parts replacement frequency, dan top issues</CardDescription>
            </CardHeader>
            <CardContent>
              {repairAnalytics ? (
                <div className="space-y-6">
                  {/* Success Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {repairAnalytics.successRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        {repairAnalytics.qcPassed} dari {repairAnalytics.completedRepairs} perbaikan lulus QC
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Perbaikan</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {repairAnalytics.totalRepairs}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        {repairAnalytics.completedRepairs} selesai
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Parts Replaced</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {repairAnalytics.partsReplacedCount}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        Jenis komponen berbeda
                      </p>
                    </div>
                  </div>

                  {/* Top Issues */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top 10 Issues</h3>
                    {repairAnalytics.topIssues.length > 0 ? (
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: repairAnalytics.topIssues.map((item: any) => 
                              item.issue.length > 30 ? item.issue.substring(0, 30) + '...' : item.issue
                            ),
                            datasets: [{
                              label: 'Frekuensi',
                              data: repairAnalytics.topIssues.map((item: any) => item.count),
                              backgroundColor: 'rgba(249, 115, 22, 0.6)',
                              borderColor: 'rgba(249, 115, 22, 1)',
                              borderWidth: 1,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  title: (context: any) => {
                                    const item = repairAnalytics.topIssues[context[0].dataIndex];
                                    return item.issue;
                                  },
                                },
                              },
                            },
                            scales: {
                              x: { ticks: { maxRotation: 45, minRotation: 45 } },
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Tidak ada data</p>
                    )}
                  </div>

                  {/* Top Parts */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top 10 Parts Replacement</h3>
                    {repairAnalytics.topParts.length > 0 ? (
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: repairAnalytics.topParts.map((item: any) => item.part),
                            datasets: [{
                              label: 'Frekuensi',
                              data: repairAnalytics.topParts.map((item: any) => item.count),
                              backgroundColor: 'rgba(99, 102, 241, 0.6)',
                              borderColor: 'rgba(99, 102, 241, 1)',
                              borderWidth: 1,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              x: { ticks: { maxRotation: 45, minRotation: 45 } },
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Tidak ada data</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada data analitik perbaikan</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* C. Analitik Service Order (SO) */}
          <Card className="border-2 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Analitik Service Order (SO)
                  </CardTitle>
                  <CardDescription>Trend SO, distribusi prioritas, per bank, per pengelola, dan waktu resolusi</CardDescription>
                </div>
                {isHitachi && soAnalytics && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Export to Excel/PDF functionality
                      const data = {
                        period: `${startDate} - ${endDate}`,
                        ...soAnalytics,
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `SO_Analytics_${startDate}_${endDate}.json`;
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter khusus untuk SO Analytics */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Service Order</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="soStartDate" className="text-xs text-slate-600 dark:text-slate-400">Tanggal Mulai</Label>
                    <Input
                      id="soStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="soEndDate" className="text-xs text-slate-600 dark:text-slate-400">Tanggal Akhir</Label>
                    <Input
                      id="soEndDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  {isHitachi && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="soBankFilter" className="text-xs text-slate-600 dark:text-slate-400">Filter Bank</Label>
                        <Select value={selectedBankId || 'all'} onValueChange={(value) => setSelectedBankId(value === 'all' ? '' : value)}>
                          <SelectTrigger id="soBankFilter" className="h-9 text-sm">
                            <SelectValue placeholder="Semua Bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Bank</SelectItem>
                            {banks.map(bank => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.bankName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="soPengelolaFilter" className="text-xs text-slate-600 dark:text-slate-400">Filter Pengelola</Label>
                        <Select value={selectedPengelolaId || 'all'} onValueChange={(value) => setSelectedPengelolaId(value === 'all' ? '' : value)}>
                          <SelectTrigger id="soPengelolaFilter" className="h-9 text-sm">
                            <SelectValue placeholder="Semua Pengelola" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Pengelola</SelectItem>
                            {pengelolaList.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {soAnalytics ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total SO</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {soAnalytics.total}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Resolved</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {soAnalytics.resolvedCount}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Open</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {soAnalytics.openCount}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Resolution</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {soAnalytics.avgResolutionTime.toFixed(1)} hari
                      </p>
                    </div>
                  </div>

                  {/* Monthly Trend */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Trend SO per Bulan</h3>
                    {Object.keys(soAnalytics.monthlyTrend).length > 0 ? (
                      <div className="h-64">
                        <Line
                          data={{
                            labels: Object.keys(soAnalytics.monthlyTrend).sort(),
                            datasets: [{
                              label: 'Jumlah SO',
                              data: Object.keys(soAnalytics.monthlyTrend).sort().map(key => soAnalytics.monthlyTrend[key]),
                              borderColor: 'rgba(59, 130, 246, 1)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.4,
                              fill: true,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Tidak ada data</p>
                    )}
                  </div>

                  {/* By Priority & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Distribusi Prioritas</h3>
                      {Object.keys(soAnalytics.byPriority).length > 0 ? (
                        <div className="h-64">
                          <Bar
                            data={{
                              labels: Object.keys(soAnalytics.byPriority),
                              datasets: [{
                                label: 'Jumlah SO',
                                data: Object.values(soAnalytics.byPriority),
                                backgroundColor: [
                                  'rgba(34, 197, 94, 0.6)',
                                  'rgba(234, 179, 8, 0.6)',
                                  'rgba(249, 115, 22, 0.6)',
                                  'rgba(239, 68, 68, 0.6)',
                                ],
                                borderColor: [
                                  'rgba(34, 197, 94, 1)',
                                  'rgba(234, 179, 8, 1)',
                                  'rgba(249, 115, 22, 1)',
                                  'rgba(239, 68, 68, 1)',
                                ],
                                borderWidth: 1,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                              },
                              scales: {
                                y: { beginAtZero: true },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Tidak ada data</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Distribusi Status</h3>
                      {Object.keys(soAnalytics.byStatus).length > 0 ? (
                        <div className="h-64">
                          <Bar
                            data={{
                              labels: Object.keys(soAnalytics.byStatus),
                              datasets: [{
                                label: 'Jumlah SO',
                                data: Object.values(soAnalytics.byStatus),
                                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                                borderColor: 'rgba(99, 102, 241, 1)',
                                borderWidth: 1,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                              },
                              scales: {
                                y: { beginAtZero: true },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Tidak ada data</p>
                      )}
                    </div>
                  </div>

                  {/* By Bank & By Pengelola */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top 10 Bank</h3>
                      {soAnalytics.byBank && soAnalytics.byBank.length > 0 ? (
                        <div className="h-64">
                          <Bar
                            data={{
                              labels: soAnalytics.byBank.map((b: any) => b.bankName),
                              datasets: [{
                                label: 'Jumlah SO',
                                data: soAnalytics.byBank.map((b: any) => b.count),
                                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                borderColor: 'rgba(59, 130, 246, 1)',
                                borderWidth: 1,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                              },
                              scales: {
                                x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                y: { beginAtZero: true },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Tidak ada data</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top 10 Pengelola</h3>
                      {soAnalytics.byPengelola && soAnalytics.byPengelola.length > 0 ? (
                        <div className="h-64">
                          <Bar
                            data={{
                              labels: soAnalytics.byPengelola.map((p: any) => p.pengelolaName),
                              datasets: [{
                                label: 'Jumlah SO',
                                data: soAnalytics.byPengelola.map((p: any) => p.count),
                                backgroundColor: 'rgba(139, 92, 246, 0.6)',
                                borderColor: 'rgba(139, 92, 246, 1)',
                                borderWidth: 1,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                              },
                              scales: {
                                x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                y: { beginAtZero: true },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Tidak ada data</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada data analitik SO</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Perbandingan Antar Pengelola */}
          {isHitachi && (
            <Card className="border-2 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Perbandingan Antar Pengelola
                </CardTitle>
                <CardDescription>Performa pengelola berdasarkan jumlah SO, resolution rate, dan waktu resolusi</CardDescription>
              </CardHeader>
              <CardContent>
                {pengelolaComparison.length > 0 ? (
                  <div className="space-y-6">
                    {/* Comparison Chart */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Total SO per Pengelola</h3>
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: pengelolaComparison.map((p: any) => p.pengelolaName),
                            datasets: [{
                              label: 'Total SO',
                              data: pengelolaComparison.map((p: any) => p.totalTickets),
                              backgroundColor: 'rgba(99, 102, 241, 0.6)',
                              borderColor: 'rgba(99, 102, 241, 1)',
                              borderWidth: 1,
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              x: { ticks: { maxRotation: 45, minRotation: 45 } },
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    </div>

                    {/* Comparison Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Detail Performa</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50 dark:bg-slate-800">
                              <th className="text-left p-3 font-semibold">Pengelola</th>
                              <th className="text-right p-3 font-semibold">Total SO</th>
                              <th className="text-right p-3 font-semibold">Resolved</th>
                              <th className="text-right p-3 font-semibold">Resolution Rate</th>
                              <th className="text-right p-3 font-semibold">Avg Resolution</th>
                              <th className="text-right p-3 font-semibold">Critical</th>
                              <th className="text-right p-3 font-semibold">High Priority</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pengelolaComparison.map((p: any) => (
                              <tr key={p.pengelolaId} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                                <td className="p-3 align-middle font-medium text-gray-900 dark:text-slate-100">
                                  {p.pengelolaName}
                                </td>
                                <td className="p-3 align-middle text-right text-gray-900 dark:text-slate-100">
                                  {p.totalTickets}
                                </td>
                                <td className="p-3 align-middle text-right text-green-600 dark:text-green-400">
                                  {p.resolvedTickets}
                                </td>
                                <td className="p-3 align-middle text-right text-blue-600 dark:text-blue-400">
                                  {p.resolutionRate.toFixed(1)}%
                                </td>
                                <td className="p-3 align-middle text-right text-gray-700 dark:text-slate-200">
                                  {p.avgResolutionTime.toFixed(1)} hari
                                </td>
                                <td className="p-3 align-middle text-right text-red-600 dark:text-red-400">
                                  {p.criticalTickets}
                                </td>
                                <td className="p-3 align-middle text-right text-orange-600 dark:text-orange-400">
                                  {p.highPriorityTickets}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada data perbandingan pengelola</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
