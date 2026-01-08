'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { usePreventiveMaintenance, useTakePMTask } from '@/hooks/usePreventiveMaintenance';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarCheck,
  Search,
  FileText,
  Calendar,
  User,
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  UserPlus,
  Wrench,
  RefreshCw,
  MapPin,
  Tag,
  Building2,
} from 'lucide-react';

function PreventiveMaintenanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [takingPMTask, setTakingPMTask] = useState<string | null>(null);
  const itemsPerPage = 15;

  // User type check - needed for hook conditions
  const isPengelola = user?.userType === 'PENGELOLA';
  const isHitachi = user?.userType === 'HITACHI';

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use React Query hook for better caching and performance
  const { data: pmsData, isLoading: loading } = usePreventiveMaintenance({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
    dateFilter: dateFilter !== 'ALL' ? dateFilter : undefined,
  }, isAuthenticated && !isPengelola);

  // Extract data from React Query response
  const pms = useMemo(() => {
    if (!pmsData) return [];
    return Array.isArray(pmsData) ? pmsData : (pmsData?.data || []);
  }, [pmsData]);

  const total = useMemo(() => {
    if (!pmsData || Array.isArray(pmsData)) return pms.length;
    return pmsData?.pagination?.total || 0;
  }, [pmsData, pms.length]);

  const totalPages = useMemo(() => {
    if (!pmsData || Array.isArray(pmsData)) return Math.ceil(pms.length / itemsPerPage);
    return pmsData?.pagination?.totalPages || 0;
  }, [pmsData, pms.length, itemsPerPage]);

  // Take PM task mutation
  const takePMTaskMutation = useTakePMTask();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    // Redirect Pengelola users - PM feature is temporarily disabled for Pengelola
    if (!isLoading && isAuthenticated && isPengelola) {
      router.push('/tickets');
    }
  }, [isAuthenticated, isLoading, router, isPengelola]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [dateFilter, selectedStatus, searchTerm, currentPage]);

  // Update URL query parameter when page changes
  useEffect(() => {
    if (currentPage > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', currentPage.toString());
      router.replace(`/preventive-maintenance?${params.toString()}`, { scroll: false });
    } else {
      // Remove page param if on page 1
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      const newUrl = params.toString() ? `/preventive-maintenance?${params.toString()}` : '/preventive-maintenance';
      router.replace(newUrl, { scroll: false });
    }
  }, [currentPage, router, searchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus, dateFilter]);

  // React Query handles data fetching automatically - no manual useEffect needed!

  // Use server-side filtered and sorted data directly
  const paginatedPMs = pms; // Already filtered, sorted, and paginated from server

  // Status summary - Calculate from current page data (for display only)
  // Note: For accurate counts across all pages, backend should provide statusCounts
  const statusSummary = useMemo(() => ({
    total: total, // Use total from pagination
    scheduled: pms.filter((pm: any) => pm.status === 'SCHEDULED').length,
    inProgress: pms.filter((pm: any) => pm.status === 'IN_PROGRESS').length,
    completed: pms.filter((pm: any) => pm.status === 'COMPLETED').length,
    cancelled: pms.filter((pm: any) => pm.status === 'CANCELLED').length,
    rescheduled: pms.filter((pm: any) => pm.status === 'RESCHEDULED').length,
  }), [pms, total]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      SCHEDULED: { label: 'Terjadwal', variant: 'bg-blue-500 text-white', icon: Calendar },
      IN_PROGRESS: { label: 'Dalam Proses', variant: 'bg-yellow-500 text-white', icon: Clock },
      COMPLETED: { label: 'Selesai', variant: 'bg-green-500 text-white', icon: CheckCircle2 },
      CANCELLED: { label: 'Dibatalkan', variant: 'bg-red-500 text-white', icon: XCircle },
      RESCHEDULED: { label: 'Dijadwalkan Ulang', variant: 'bg-sky-500 text-white', icon: RefreshCw },
    };
    return configs[status] || { label: status, variant: 'bg-gray-500 text-white', icon: FileText };
  };

  const handleTakePMTask = async (pmId: string) => {
    try {
      setTakingPMTask(pmId);
      await takePMTaskMutation.mutateAsync(pmId);
      // React Query akan otomatis update cache dan refetch
      toast({
        title: 'Berhasil',
        description: 'PM task berhasil di-assign ke Anda',
      });
    } catch (error: any) {
      console.error('Error taking PM task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal mengambil PM task',
        variant: 'destructive',
      });
    } finally {
      setTakingPMTask(null);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Memuat PM tasks...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Status Cards */}
      <div className={`grid grid-cols-2 ${isHitachi ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-3 mb-4 mt-6`}>
        {[
          { key: 'ALL', label: 'Total', count: statusSummary.total, color: 'slate', bgActive: 'bg-slate-800 dark:bg-slate-800', bgHover: 'hover:bg-slate-800/50 dark:hover:bg-slate-800/50', borderActive: 'border-slate-500 dark:border-slate-500', icon: CalendarCheck, iconColor: 'text-slate-400 dark:text-slate-400' },
          { key: 'SCHEDULED', label: 'Terjadwal', count: statusSummary.scheduled, color: 'blue', bgActive: 'bg-blue-900/30 dark:bg-blue-900/30', bgHover: 'hover:bg-blue-900/20 dark:hover:bg-blue-900/20', borderActive: 'border-blue-500 dark:border-blue-400', icon: Calendar, iconColor: 'text-blue-400 dark:text-blue-400' },
          { key: 'IN_PROGRESS', label: 'Dalam Proses', count: statusSummary.inProgress, color: 'yellow', bgActive: 'bg-yellow-900/30 dark:bg-yellow-900/30', bgHover: 'hover:bg-yellow-900/20 dark:hover:bg-yellow-900/20', borderActive: 'border-yellow-500 dark:border-yellow-400', icon: Clock, iconColor: 'text-yellow-400 dark:text-yellow-400' },
          { key: 'COMPLETED', label: 'Selesai', count: statusSummary.completed, color: 'green', bgActive: 'bg-green-900/30 dark:bg-green-900/30', bgHover: 'hover:bg-green-900/20 dark:hover:bg-green-900/20', borderActive: 'border-green-500 dark:border-green-400', icon: CheckCircle2, iconColor: 'text-green-400 dark:text-green-400' },
          { key: 'CANCELLED', label: 'Dibatalkan', count: statusSummary.cancelled, color: 'red', bgActive: 'bg-red-900/30 dark:bg-red-900/30', bgHover: 'hover:bg-red-900/20 dark:hover:bg-red-900/20', borderActive: 'border-red-500 dark:border-red-400', icon: XCircle, iconColor: 'text-red-400 dark:text-red-400' },
          ...(isHitachi ? [{ key: 'RESCHEDULED', label: 'Dijadwalkan Ulang', count: statusSummary.rescheduled, color: 'sky', bgActive: 'bg-sky-900/30 dark:bg-sky-900/30', bgHover: 'hover:bg-sky-900/20 dark:hover:bg-sky-900/20', borderActive: 'border-sky-500 dark:border-sky-400', icon: RefreshCw, iconColor: 'text-sky-400 dark:text-sky-400' }] : []),
        ].map(({ key, label, count, bgActive, bgHover, borderActive, icon: Icon, iconColor }) => (
          <button
            key={key}
            onClick={() => setSelectedStatus(selectedStatus === key ? 'ALL' : key)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${selectedStatus === key
              ? `${borderActive} ${bgActive} shadow-lg`
              : `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 ${bgHover}`
              }`}
          >
            <Icon className={`h-5 w-5 ${iconColor} mb-2`} />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{count}</p>
          </button>
        ))}
      </div>

      {/* Search and Date Filter */}
      <Card className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Cari PM number, kaset, engineer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Filter Tanggal" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="ALL" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Semua Tanggal</SelectItem>
                  <SelectItem value="TODAY" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Hari Ini</SelectItem>
                  <SelectItem value="YESTERDAY" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Kemarin</SelectItem>
                  <SelectItem value="THIS_WEEK" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Minggu Ini</SelectItem>
                  <SelectItem value="LAST_7_DAYS" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">7 Hari Terakhir</SelectItem>
                  <SelectItem value="THIS_MONTH" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Bulan Ini</SelectItem>
                  <SelectItem value="LAST_30_DAYS" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">30 Hari Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* PM Create Button - DISABLED */}
            {/* {(isHitachi || isPengelola) && (
              <Link href="/preventive-maintenance/create">
                <Button size="sm" className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  {isPengelola ? 'Request PM' : 'Buat PM'}
                </Button>
              </Link>
            )} */}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">PM Number</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  {isHitachi && (
                    <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Type</th>
                  )}
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Title</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cassette</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Engineer</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Jadwal</th>
                  {isHitachi && (
                    <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Completed At</th>
                  )}
                  {isHitachi && (
                    <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Requested By</th>
                  )}
                  <th className="text-center p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedPMs.length === 0 ? (
                  <tr>
                    <td colSpan={isHitachi ? 10 : 7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <CalendarCheck className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-lg">Tidak ada PM tasks</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                        {pms.length === 0
                          ? 'Belum ada PM tasks yang dibuat. Klik "Buat PM" untuk membuat PM task baru.'
                          : `Tidak ada PM tasks yang sesuai dengan filter "${selectedStatus !== 'ALL' ? getStatusBadge(selectedStatus).label : 'yang dipilih'}"`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedPMs.map((pm: any) => {
                    const statusBadge = getStatusBadge(pm.status);
                    const StatusIcon = statusBadge.icon;
                    const isAssigned = pm.engineer !== null;
                    const isAssignedToMe = pm.assignedEngineer === user?.id || pm.engineer?.id === user?.id;
                    const canTakeTask = !isAssigned && pm.status !== 'COMPLETED' && pm.status !== 'CANCELLED';
                    const cassetteCount = pm.cassetteDetails?.length || 0;

                    // Get type badge config
                    const getTypeBadge = (type: string) => {
                      const typeConfigs: Record<string, { label: string; variant: string }> = {
                        ROUTINE: { label: 'Rutin', variant: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
                        ON_DEMAND_PENGELOLA: { label: 'On-Demand Pengelola', variant: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
                        ON_DEMAND_HITACHI: { label: 'On-Demand Hitachi', variant: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700' },
                        EMERGENCY: { label: 'Darurat', variant: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' },
                        // Legacy support for old "ON_DEMAND" type (should be migrated to ON_DEMAND_PENGELOLA or ON_DEMAND_HITACHI)
                        ON_DEMAND: { label: 'On-Demand', variant: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700' },
                      };
                      return typeConfigs[type] || { label: type, variant: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700' };
                    };

                    const typeBadge = getTypeBadge(pm.type);
                    // Display actual name of requester, not just "Pengelola" or "Hitachi"
                    // Backend returns 'requesterPengelola' or 'requesterHitachi' with 'fullName' field
                    // For Pengelola, prefer company name if available
                    let requestedBy = 'N/A';
                    if ((pm as any).requesterPengelola) {
                      const requester = (pm as any).requesterPengelola;
                      // Prefer company name, then fullName, then fallback to 'Pengelola'
                      requestedBy = requester.pengelola?.companyName
                        || requester.fullName
                        || requester.name
                        || 'Pengelola';
                    } else if ((pm as any).requesterHitachi) {
                      const requester = (pm as any).requesterHitachi;
                      requestedBy = requester.fullName || requester.name || 'Hitachi';
                    } else if (pm.requestedByPengelola) {
                      requestedBy = pm.requestedByPengelola.fullName || pm.requestedByPengelola.name || 'Pengelola';
                    } else if (pm.requestedByHitachi) {
                      requestedBy = pm.requestedByHitachi.fullName || pm.requestedByHitachi.name || 'Hitachi';
                    }

                    return (
                      <tr key={pm.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-4">
                          <p className="font-mono font-extrabold text-sm text-teal-600 dark:text-teal-400">
                            {pm.pmNumber}
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge className={`${statusBadge.variant} text-xs px-2.5 py-1 gap-1 font-bold`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusBadge.label}
                          </Badge>
                        </td>
                        {isHitachi && (
                          <td className="p-4">
                            <Badge variant="outline" className={`${typeBadge.variant} text-xs px-2 py-0.5 font-medium border`}>
                              <Tag className="h-3 w-3 mr-1 inline" />
                              {typeBadge.label}
                            </Badge>
                          </td>
                        )}
                        <td className="p-4">
                          <p className="text-sm text-slate-900 dark:text-slate-200 font-medium truncate max-w-[200px]" title={pm.title}>
                            {pm.title || 'N/A'}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {pm.cassetteDetails?.slice(0, 2).map((d: any) => (
                              <Badge key={d.id} variant="outline" className="text-[10px] border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                {d.cassette?.serialNumber}
                              </Badge>
                            ))}
                            {cassetteCount > 2 && (
                              <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                +{cassetteCount - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {isAssigned ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                              <span className={isAssignedToMe ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                                {pm.engineer?.fullName || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400 italic font-medium">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            {pm.scheduledDate
                              ? new Date(pm.scheduledDate).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              })
                              : 'N/A'}
                          </div>
                        </td>
                        {isHitachi && (
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                              {pm.completedAt || pm.completedDate
                                ? new Date(pm.completedAt || pm.completedDate).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit'
                                })
                                : <span className="text-slate-400 dark:text-slate-500 italic">-</span>}
                            </div>
                          </td>
                        )}
                        {isHitachi && (
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                              <span className="font-medium">{requestedBy}</span>
                            </div>
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {pm.status !== 'COMPLETED' && pm.status !== 'CANCELLED' && (
                              <>
                                {canTakeTask && isHitachi ? (
                                  // Show Take button only if task is unassigned
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white border-0"
                                    onClick={() => handleTakePMTask(pm.id)}
                                    disabled={takingPMTask === pm.id}
                                  >
                                    {takingPMTask === pm.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <>
                                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                                        Take
                                      </>
                                    )}
                                  </Button>
                                ) : isAssignedToMe ? (
                                  // If assigned to me, show "Mine" badge (like in repairs)
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 font-bold flex items-center gap-1.5 cursor-default">
                                    <User className="h-3.5 w-3.5" />
                                    Mine
                                  </Badge>
                                ) : isAssigned ? (
                                  // If assigned to someone else, show "Assigned" badge
                                  <Badge className="bg-slate-600 text-white text-xs px-2.5 py-1.5 font-bold flex items-center gap-1.5 cursor-default" title={`Assigned to ${pm.engineer?.fullName || 'another engineer'}`}>
                                    <User className="h-3.5 w-3.5" />
                                    Assigned
                                  </Badge>
                                ) : null}
                              </>
                            )}
                            <Link href={`/preventive-maintenance/${pm.id}${currentPage > 1 ? `?page=${currentPage}` : ''}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs font-bold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                {pm.status === 'COMPLETED' ? 'View' : 'Manage'}
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
                Halaman {currentPage} dari {totalPages} • Total {total} PM
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}

export default function PreventiveMaintenancePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" /></div>}>
      <PreventiveMaintenanceContent />
    </Suspense>
  );
}
