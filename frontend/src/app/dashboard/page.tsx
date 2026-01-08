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
import { Suspense } from 'react';
import { DashboardStats } from './types';
import { StatCard } from './components/StatCard';
import { AnalyticsSection } from './components/AnalyticsSection';
import { QuickActions } from './components/QuickActions';
import { RecentActivities } from './components/RecentActivities';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

// ... (existing imports)

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



export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();

  // Role-based permissions
  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';
  const isBank = user?.userType === 'BANK';
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
    topBanks: Array.isArray(statsData.topBanks) ? statsData.topBanks : [],
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
    ticketUsageByCassetteAndPengelola: Array.isArray(statsData.ticketUsageByCassetteAndPengelola) ? statsData.ticketUsageByCassetteAndPengelola : [],
    repairUsageByCassette: Array.isArray(statsData.repairUsageByCassette) ? statsData.repairUsageByCassette : [],
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
          {isHitachi && !isRCStaff && !isBank && (
            <TabsTrigger value="analytics" className="flex-1">Analitik</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="summary" className="mt-0">
          {/* Stats Grid - Role Based */}
          {isHitachi ? (
            // Hitachi: Show all stats
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
              <StatCard loading={loadingStats}
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
          <div className="mb-8">
            <QuickActions
              isHitachi={isHitachi}
              isSuperAdmin={isSuperAdmin}
            />
          </div>

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
            {/* Recent Activities */}
            <RecentActivities
              recentActivities={stats.recentActivities}
              loading={loadingStats}
            />

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
                  ) : Array.isArray(stats.topBanks) && stats.topBanks.length > 0 ? (
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

                {isHitachi && !isRCStaff && !isBank && (
                  <TabsContent value="analytics" className="mt-0">

            {stats.ticketUsageByCassetteAndPengelola && stats.ticketUsageByCassetteAndPengelola.length > 0 && (
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
                  // Aggregate by cassette serial number (sum across all pengelola)
                  // This gives us total SO count per cassette regardless of pengelola
                  const aggregate: Record<string, number> = {};
                  stats.ticketUsageByCassetteAndPengelola!.forEach((item) => {
                    // Sum all tickets for this cassette across all pengelola
                    aggregate[item.cassetteSerialNumber] = (aggregate[item.cassetteSerialNumber] || 0) + (item.openTickets || 0);
                  });

                  // Sort by count descending and take top 10
                  const entries = Object.entries(aggregate)
                    .map(([serial, count]: [string, number]) => ({ serial, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                  if (entries.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        <Disc className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada SN kaset dengan jumlah SO yang signifikan.</p>
                      </div>
                    );
                  }
                  // Prepare chart data
                  const chartLabels = entries.map(e => e.serial);
                  const chartData = entries.map(e => e.count);

                  return (
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: chartLabels,
                          datasets: [
                            {
                              label: 'Total SO',
                              data: chartData,
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
                                title: (context: any) => `SN: ${context[0].label}`,
                                label: (context: any) => `Total SO: ${context.raw}`,
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

            {stats.repairUsageByCassette && stats.repairUsageByCassette.length > 0 && (
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
                      labels: Array.isArray(stats.repairUsageByCassette) ? stats.repairUsageByCassette.map((item) => item.cassetteSerialNumber) : [],
                      datasets: [
                        {
                          label: 'Jumlah Repair',
                          data: Array.isArray(stats.repairUsageByCassette) ? stats.repairUsageByCassette.map((item) => item.repairCount) : [],
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
        )}
      </Tabs>
    </PageLayout>
  );
}

// AnalyticsSection moved to ./components/AnalyticsSection

