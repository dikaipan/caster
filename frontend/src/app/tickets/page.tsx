'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  FileText,
  Wrench,
  Package,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Truck as TruckIcon,
  Plus,
  Clock,
  User,
  Monitor,
  RefreshCw,
  CalendarCheck,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { ErrorWithRetry } from '@/components/ui/error-with-retry';
import { markTicketsAsViewed, isTicketViewed, markTicketAsViewed } from '@/lib/viewed-tickets';

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  // PM Tasks - DISABLED TEMPORARILY
  // const [pmTasks, setPmTasks] = useState<any[]>([]);
  // const [loadingPM, setLoadingPM] = useState(false);
  // const [takingPMTask, setTakingPMTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('tickets');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const itemsPerPage = 15;

  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';

  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['tickets', 'replacement'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus, selectedPriority, itemsPerPage]);

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);
      const params: any = {
        params: {
          page: currentPage,
          limit: itemsPerPage,
        },
      };

      if (debouncedSearchTerm.trim()) {
        params.params.search = debouncedSearchTerm.trim();
      }

      if (selectedStatus && selectedStatus !== 'ALL') {
        params.params.status = selectedStatus;
      }

      if (selectedPriority && selectedPriority !== 'ALL') {
        params.params.priority = selectedPriority;
      }

      const response = await api.get('/tickets', params);
      
      // Handle both old format (array) and new format (object with data & pagination)
      if (Array.isArray(response.data)) {
        // Old format - backward compatibility
        setTickets(response.data);
        setTotal(response.data.length);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      } else {
        // New format with pagination
        const ticketsData = response.data?.data || [];
        setTickets(ticketsData);
        setTotal(response.data?.pagination?.total || 0);
        setTotalPages(response.data?.pagination?.totalPages || 0);
        
        // Don't auto-mark as viewed - let users see the badge first
        // Tickets will be marked as viewed when user clicks on them
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      let errorMessage = 'Terjadi kesalahan saat memuat data tickets.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          router.push('/login');
          return;
        } else if (status >= 500) {
          errorMessage = 'Server mengalami masalah. Silakan coba lagi nanti.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Tidak dapat terhubung ke server. Pastikan backend server berjalan.';
      }
      
      setFetchError(errorMessage);
      setTickets([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage, itemsPerPage, debouncedSearchTerm, selectedStatus, selectedPriority, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, fetchTickets]);

  // PM Tasks - DISABLED TEMPORARILY
  // useEffect(() => {
  //   const fetchPM = async () => {
  //     if (!isAuthenticated) return;
  //     if (!isHitachi) {
  //       setPmTasks([]);
  //       return;
  //     }
  //     try {
  //       setLoadingPM(true);
  //       const response = await api.get('/preventive-maintenance');
  //       if (Array.isArray(response.data)) {
  //         setPmTasks(response.data);
  //       } else {
  //         setPmTasks(response.data?.data || []);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching PM tasks:', error);
  //       setPmTasks([]);
  //     } finally {
  //       setLoadingPM(false);
  //     }
  //   };
  //   fetchPM();
  // }, [isAuthenticated, isHitachi]);

  // Filter replacement requests (still client-side for now, as they're a subset)
  // CLOSED tickets are excluded (they should only appear in history)
  const replacementRequests = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) {
      return [];
    }
    return tickets.filter((ticket) => {
      // Exclude CLOSED tickets from active replacement requests
      if (ticket.status === 'CLOSED') {
        return false;
      }
      // Check if ticket has any cassette detail with requestReplacement = true
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        return ticket.cassetteDetails.some((detail: any) => detail.requestReplacement === true);
      }
      // Also check ticket.requestReplacement for single cassette tickets
      return ticket.requestReplacement === true;
    });
  }, [tickets]);

  // Filter repair orders (exclude replacement requests)
  const repairOrders = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) {
      return [];
    }
    return tickets.filter((ticket) => {
      // Exclude tickets with requestReplacement = true
      if (ticket.requestReplacement === true) {
        return false;
      }
      // Exclude tickets with any cassette detail with requestReplacement = true
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        return !ticket.cassetteDetails.some((detail: any) => detail.requestReplacement === true);
      }
      return true;
    });
  }, [tickets]);

  // Use filtered repair orders (already filtered, sorted, and paginated from server)
  const paginatedTickets = repairOrders; // Filter out replacement requests

  // Filter replacement requests by search term and status
  const filteredReplacementRequests = useMemo(() => {
    let filtered = replacementRequests;

    // Filter by search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((ticket) => {
        const roNumber = ticket.roNumber?.toLowerCase() || '';
        const cassetteSN = ticket.cassetteDetails?.some((detail: any) =>
          detail.cassette?.serialNumber?.toLowerCase().includes(searchLower)
        );
        const machineSN = ticket.cassetteDetails?.some((detail: any) =>
          detail.cassette?.machine?.machineId?.toLowerCase().includes(searchLower)
        );
        return roNumber.includes(searchLower) || cassetteSN || machineSN;
      });
    }

    // Filter by status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter((ticket) => ticket.status === selectedStatus);
    }

    return filtered;
  }, [replacementRequests, debouncedSearchTerm, selectedStatus]);

  // For replacement requests, we still need client-side pagination since they're filtered from main tickets
  const paginatedReplacementRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReplacementRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReplacementRequests, currentPage]);

  const totalPagesReplacement = Math.ceil(filteredReplacementRequests.length / itemsPerPage);

  // Status summary - Calculate from filtered repair orders (exclude replacement requests)
  // Note: For accurate counts across all pages, backend should provide statusCounts
  // CLOSED tickets are excluded from active SO view (they should only appear in history)
  const statusSummary = useMemo(() => ({
    total: repairOrders.length, // Use filtered repair orders count
    inDelivery: repairOrders.filter(t => t.status === 'IN_DELIVERY').length,
    received: repairOrders.filter(t => t.status === 'RECEIVED').length,
    inProgress: repairOrders.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: repairOrders.filter(t => t.status === 'RESOLVED').length,
    returnShipped: repairOrders.filter(t => t.status === 'RETURN_SHIPPED').length,
    // closed: repairOrders.filter(t => t.status === 'CLOSED').length, // Removed - CLOSED only in history
  }), [repairOrders]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      OPEN: { label: 'Open', variant: 'bg-[#2563EB] text-white', icon: AlertCircle },
      IN_DELIVERY: { label: 'Kirim RC', variant: 'bg-amber-500 text-white', icon: Package },
      RECEIVED: { label: 'Terima RC', variant: 'bg-[#C5000F] text-white', icon: Inbox },
      IN_PROGRESS: { label: 'Repair', variant: 'bg-yellow-500 text-white', icon: Wrench },
      RESOLVED: { label: 'Selesai', variant: 'bg-green-500 text-white', icon: CheckCircle2 },
      RETURN_SHIPPED: { label: 'Kirim Pengelola', variant: 'bg-purple-500 text-white', icon: TruckIcon },
      CLOSED: { label: 'Tutup', variant: 'bg-gray-500 text-white', icon: XCircle },
    };
    return configs[status] || configs.OPEN;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'text-[#DC2626]',
      HIGH: 'text-orange-600',
      MEDIUM: 'text-yellow-600',
      LOW: 'text-green-600',
    };
    return colors[priority] || colors.MEDIUM;
  };

  // PM Tasks - DISABLED TEMPORARILY
  // const filteredPM = useMemo(() => {
  //   if (!Array.isArray(pmTasks)) {
  //     return [];
  //   }
  //   let filtered = [...pmTasks];
  //   if (searchTerm) {
  //     const search = searchTerm.toLowerCase();
  //     filtered = filtered.filter(
  //       (pm) =>
  //         pm.pmNumber?.toLowerCase().includes(search) ||
  //         pm.title?.toLowerCase().includes(search) ||
  //         pm.cassetteDetails?.some((d: any) => d.cassette?.serialNumber?.toLowerCase().includes(search))
  //     );
  //   }
  //   if (selectedStatus !== 'ALL') {
  //     filtered = filtered.filter((pm) => pm.status === selectedStatus);
  //   }
  //   return filtered.sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime());
  // }, [pmTasks, searchTerm, selectedStatus]);
  // const paginatedPM = useMemo(() => {
  //   const startIndex = (currentPage - 1) * itemsPerPage;
  //   return filteredPM.slice(startIndex, startIndex + itemsPerPage);
  // }, [filteredPM, currentPage]);
  // const totalPagesPM = Math.ceil(filteredPM.length / itemsPerPage);
  // const pmStatusSummary = useMemo(() => ({
  //   total: pmTasks.length,
  //   scheduled: pmTasks.filter(pm => pm.status === 'SCHEDULED').length,
  //   inProgress: pmTasks.filter(pm => pm.status === 'IN_PROGRESS').length,
  //   completed: pmTasks.filter(pm => pm.status === 'COMPLETED').length,
  //   cancelled: pmTasks.filter(pm => pm.status === 'CANCELLED').length,
  // }), [pmTasks]);

  // Replacement Request Status summary
  // CLOSED tickets are excluded from active SO view (they should only appear in history)
  const replacementStatusSummary = useMemo(() => ({
    total: replacementRequests.length,
    inDelivery: replacementRequests.filter(t => t.status === 'IN_DELIVERY').length,
    received: replacementRequests.filter(t => t.status === 'RECEIVED').length,
    inProgress: replacementRequests.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: replacementRequests.filter(t => t.status === 'RESOLVED').length,
    // closed: replacementRequests.filter(t => t.status === 'CLOSED').length, // Removed - CLOSED only in history
  }), [replacementRequests]);

  // PM Tasks - DISABLED TEMPORARILY
  // const getPMStatusBadge = (status: string) => {
  //   const configs: Record<string, { label: string; variant: string; icon: any }> = {
  //     SCHEDULED: { label: 'Scheduled', variant: 'bg-blue-500 text-white', icon: CalendarCheck },
  //     IN_PROGRESS: { label: 'In Progress', variant: 'bg-orange-500 text-white', icon: Wrench },
  //     COMPLETED: { label: 'Completed', variant: 'bg-green-500 text-white', icon: CheckCircle2 },
  //     CANCELLED: { label: 'Cancelled', variant: 'bg-gray-500 text-white', icon: XCircle },
  //     RESCHEDULED: { label: 'Rescheduled', variant: 'bg-yellow-500 text-white', icon: Clock },
  //   };
  //   return configs[status] || { label: status, variant: 'bg-gray-500 text-white', icon: FileText };
  // };
  // const handleTakePMTask = async (pmId: string) => {
  //   try {
  //     setTakingPMTask(pmId);
  //     const response = await api.post(`/preventive-maintenance/${pmId}/take`);
  //     setPmTasks(prevPMTasks => 
  //       prevPMTasks.map(pm => {
  //         if (pm.id === pmId) {
  //           const updatedPM = {
  //             ...pm,
  //             ...response.data,
  //             assignedEngineer: response.data.assignedEngineer || response.data.engineer?.id || user?.id,
  //             engineer: response.data.engineer || (response.data.assignedEngineer ? {
  //               id: response.data.assignedEngineer || user?.id,
  //               fullName: response.data.engineer?.fullName || user?.fullName,
  //             } : null),
  //           };
  //           return updatedPM;
  //         }
  //         return pm;
  //       })
  //     );
  //     alert('PM task berhasil di-assign ke Anda!');
  //   } catch (error: any) {
  //     console.error('Error taking PM task:', error);
  //     alert(error.response?.data?.message || 'Failed to take PM task');
  //   } finally {
  //     setTakingPMTask(null);
  //   }
  // };

  // Early returns
  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-[#2563EB]" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageLayout>
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        setSelectedStatus('ALL');
        setSearchTerm('');
        setCurrentPage(1);
      }}>
        <TabsList className="mb-6">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Repair Orders ({repairOrders.length})
          </TabsTrigger>
          {/* PM Tasks - DISABLED TEMPORARILY */}
          {/* {isHitachi && (
            <TabsTrigger value="pm" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              PM Tasks (0)
            </TabsTrigger>
          )} */}
          <TabsTrigger value="replacement" className="flex items-center gap-2 relative">
            <AlertTriangle className="h-4 w-4" />
            Replacement Requested ({replacementRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-0">
          {/* Compact Status Cards */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4">
            {[
              { key: 'ALL', label: 'Total', count: statusSummary.total, color: 'gray', icon: FileText },
          { key: 'IN_DELIVERY', label: 'Kirim', count: statusSummary.inDelivery, color: 'cyan', icon: Package },
          { key: 'RECEIVED', label: 'Terima', count: statusSummary.received, color: 'blue', icon: Inbox },
          { key: 'IN_PROGRESS', label: 'Repair', count: statusSummary.inProgress, color: 'yellow', icon: Wrench },
          { key: 'RESOLVED', label: 'Selesai', count: statusSummary.resolved, color: 'green', icon: CheckCircle2 },
          { key: 'RETURN_SHIPPED', label: 'Kembali', count: statusSummary.returnShipped, color: 'purple', icon: TruckIcon },
          // CLOSED tickets removed from active SO view - they should only appear in history
        ].map(({ key, label, count, color, icon: Icon }) => {
          const isSelected = selectedStatus === key;
          const colorClasses = {
            gray: isSelected ? 'border-gray-500 dark:border-gray-400 bg-gray-50 dark:bg-gray-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600',
            cyan: isSelected ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-800',
            blue: isSelected ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800',
            yellow: isSelected ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-yellow-300 dark:hover:border-yellow-800',
            green: isSelected ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-800',
            purple: isSelected ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800',
          };
          const textColorClasses = {
            gray: 'text-gray-700 dark:text-gray-300',
            cyan: 'text-cyan-700 dark:text-cyan-300',
            blue: 'text-blue-700 dark:text-blue-300',
            yellow: 'text-yellow-700 dark:text-yellow-300',
            green: 'text-green-700 dark:text-green-300',
            purple: 'text-purple-700 dark:text-purple-300',
          };
          const iconColorClasses = {
            gray: 'text-gray-500 dark:text-gray-400',
            cyan: 'text-cyan-500 dark:text-cyan-400',
            blue: 'text-blue-500 dark:text-blue-400',
            yellow: 'text-yellow-500 dark:text-yellow-400',
            green: 'text-green-500 dark:text-green-400',
            purple: 'text-purple-500 dark:text-purple-400',
          };
          return (
            <button
              key={key}
              onClick={() => setSelectedStatus(selectedStatus === key ? 'ALL' : key)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${colorClasses[color as keyof typeof colorClasses]} shadow-md`
                  : `${colorClasses[color as keyof typeof colorClasses]} bg-white dark:bg-slate-800`
              }`}
            >
              <Icon className={`h-4 w-4 ${iconColorClasses[color as keyof typeof iconColorClasses]} mb-1`} />
              <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">{label}</p>
              <p className={`text-lg font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>{count}</p>
            </button>
          );
        })}
          </div>

          {/* Search & Filter */}
          <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Cari RO number, cassette SN, machine SN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-slate-400 mr-1">
                {total} RO
              </span>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="CRITICAL">Kritis</SelectItem>
                  <SelectItem value="HIGH">Tinggi</SelectItem>
                  <SelectItem value="MEDIUM">Sedang</SelectItem>
                  <SelectItem value="LOW">Rendah</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('ALL');
                  setSelectedPriority('ALL');
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              {isHitachi && (
                <Link href="/repairs">
                  <Button variant="outline">
                    <Wrench className="h-4 w-4 mr-2" />
                    Repairs
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
          </Card>

          {/* Compact Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">Memuat data...</p>
                </div>
              ) : fetchError ? (
                <div className="p-8">
                  <ErrorWithRetry
                    title="Gagal Memuat Data Tickets"
                    description={fetchError}
                    onRetry={() => {
                      setFetchError(null);
                      // Trigger re-fetch
                      const fetchTickets = async () => {
                        try {
                          setLoading(true);
                          const response = await api.get('/tickets');
                          setTickets(response.data);
                          setFetchError(null);
                        } catch (error: any) {
                          let errorMessage = 'Terjadi kesalahan saat memuat data tickets.';
                          if (error.response?.status >= 500) {
                            errorMessage = 'Server mengalami masalah. Silakan coba lagi nanti.';
                          } else if (error.request) {
                            errorMessage = 'Tidak dapat terhubung ke server. Pastikan backend server berjalan.';
                          }
                          setFetchError(errorMessage);
                        } finally {
                          setLoading(false);
                        }
                      };
                      fetchTickets();
                    }}
                    retryLabel="Coba Lagi"
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50 dark:bg-slate-700/50 dark:border-slate-700">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">RO NUMBER</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">STATUS</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">KASET</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">MESIN</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">REPORTER</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">TANGGAL</th>
                        <th className="text-center p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {paginatedTickets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-slate-400">
                            <FileText className="h-12 w-12 text-gray-300 dark:text-slate-700 mx-auto mb-2" />
                            <p>Tidak ada repair order</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedTickets.map((ticket) => {
                          const statusBadge = getStatusBadge(ticket.status);
                          const StatusIcon = statusBadge.icon;
                          const isNew = !isTicketViewed(ticket.id);
                          return (
                            <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-start gap-2">
                                  {isNew && (
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="SO Baru"></div>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-mono font-bold text-base text-teal-600 dark:text-teal-400">{ticket.ticketNumber}</p>
                                      {isNew && (
                                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 flex items-center gap-1">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          Baru
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-[200px]" title={ticket.title}>
                                      {ticket.title}
                                    </p>
                                    <span className={`text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                                      {ticket.priority === 'CRITICAL' ? '🔴' : 
                                       ticket.priority === 'HIGH' ? '🟠' : 
                                       ticket.priority === 'MEDIUM' ? '🟡' : '🟢'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge className={`${statusBadge.variant} text-[10px] px-2 py-0.5 gap-1`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusBadge.label}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                                      {ticket.cassette?.serialNumber || 'N/A'}
                                    </p>
                                    {ticket.cassette?.cassetteType && (
                                      <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                                        {ticket.cassette.cassetteType.typeCode}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-3 w-3 text-[#2563EB] dark:text-teal-400 flex-shrink-0" />
                                  <p className="font-mono text-xs font-medium text-gray-900 dark:text-slate-100 truncate max-w-[120px]">
                                    {ticket.machine?.serialNumberManufacturer || 'N/A'}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                  <p className="text-xs text-gray-900 dark:text-slate-100 truncate max-w-[120px]">
                                    {ticket.reporter?.fullName || 'N/A'}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {new Date(ticket.reportedAt).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <Link 
                                  href={`/tickets/${ticket.id}`}
                                  onClick={() => markTicketAsViewed(ticket.id)}
                                >
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                                    Detail
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Halaman <span className="font-medium text-gray-900 dark:text-slate-100">{currentPage}</span> dari <span className="font-medium text-gray-900 dark:text-slate-100">{totalPages}</span> • Total <span className="font-medium text-gray-900 dark:text-slate-100">{total}</span> RO
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PM Tasks Tab - DISABLED TEMPORARILY */}
        {/* PM Tasks Tab - DISABLED TEMPORARILY */}

        <TabsContent value="replacement" className="mt-0">
          {/* Replacement Request Status Cards */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-4">
            {[
              { key: 'ALL', label: 'Total', count: replacementStatusSummary.total, color: 'gray', icon: AlertTriangle },
              { key: 'IN_DELIVERY', label: 'Kirim', count: replacementStatusSummary.inDelivery, color: 'cyan', icon: Package },
              { key: 'RECEIVED', label: 'Terima', count: replacementStatusSummary.received, color: 'blue', icon: Inbox },
              { key: 'IN_PROGRESS', label: 'Repair', count: replacementStatusSummary.inProgress, color: 'yellow', icon: Wrench },
              { key: 'RESOLVED', label: 'Selesai', count: replacementStatusSummary.resolved, color: 'green', icon: CheckCircle2 },
              // CLOSED tickets removed from active replacement requests view - they should only appear in history
            ].map(({ key, label, count, color, icon: Icon }) => {
              const isSelected = selectedStatus === key;
              const colorClasses = {
                gray: isSelected ? 'border-gray-500 dark:border-gray-400 bg-gray-50 dark:bg-gray-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600',
                cyan: isSelected ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-800',
                blue: isSelected ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800',
                yellow: isSelected ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-yellow-300 dark:hover:border-yellow-800',
                green: isSelected ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-800',
              };
              const textColorClasses = {
                gray: 'text-gray-700 dark:text-gray-300',
                cyan: 'text-cyan-700 dark:text-cyan-300',
                blue: 'text-blue-700 dark:text-blue-300',
                yellow: 'text-yellow-700 dark:text-yellow-300',
                green: 'text-green-700 dark:text-green-300',
              };
              const iconColorClasses = {
                gray: 'text-gray-500 dark:text-gray-400',
                cyan: 'text-cyan-500 dark:text-cyan-400',
                blue: 'text-blue-500 dark:text-blue-400',
                yellow: 'text-yellow-500 dark:text-yellow-400',
                green: 'text-green-500 dark:text-green-400',
              };
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(selectedStatus === key ? 'ALL' : key)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `${colorClasses[color as keyof typeof colorClasses]} shadow-md`
                      : `${colorClasses[color as keyof typeof colorClasses]} bg-white dark:bg-slate-800`
                  }`}
                >
                  <Icon className={`h-4 w-4 ${iconColorClasses[color as keyof typeof iconColorClasses]} mb-1`} />
                  <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">{label}</p>
                  <p className={`text-lg font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>{count}</p>
                </button>
              );
            })}
          </div>

          {/* Search & Filter for Replacement */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 w-full sm:max-w-md relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <Input
                    placeholder="Cari RO number, cassette SN, machine SN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400 mr-1">
                    {filteredReplacementRequests.length} Replacement
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedStatus('ALL');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  {isHitachi && (
                    <Link href="/cassettes/replacement/create">
                      <Button variant="outline" className="bg-orange-600 hover:bg-orange-700 text-white">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Daftar Kaset Baru
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replacement Request Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">Memuat data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50 dark:bg-slate-700/50 dark:border-slate-700">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">RO NUMBER</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">STATUS</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">KASET (REPLACEMENT)</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">MESIN</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">ALASAN</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">REPORTER</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">TANGGAL</th>
                        <th className="text-center p-3 text-xs font-semibold text-gray-700 dark:text-slate-300">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {paginatedReplacementRequests.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-slate-400">
                            <AlertTriangle className="h-12 w-12 text-gray-300 dark:text-slate-700 mx-auto mb-2" />
                            <p>Tidak ada replacement request</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedReplacementRequests.map((ticket) => {
                          const statusBadge = getStatusBadge(ticket.status);
                          const StatusIcon = statusBadge.icon;
                          const isNew = !isTicketViewed(ticket.id);
                          // Get cassettes with replacement request
                          const replacementCassettes = ticket.cassetteDetails?.filter((d: any) => d.requestReplacement === true) || [];
                          
                          return (
                            <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-start gap-2">
                                  {isNew && (
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="SO Baru"></div>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-mono font-bold text-base text-orange-600 dark:text-orange-400">{ticket.ticketNumber}</p>
                                      {isNew && (
                                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 flex items-center gap-1">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          Baru
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-[200px]" title={ticket.title}>
                                      {ticket.title}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge className={`${statusBadge.variant} text-[10px] px-2 py-0.5 gap-1`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusBadge.label}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {replacementCassettes.map((detail: any) => (
                                    <div key={detail.id} className="flex items-center gap-2">
                                      <Package className="h-3 w-3 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-mono text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                                          {detail.cassette?.serialNumber || 'N/A'}
                                        </p>
                                        {detail.cassette?.status === 'SCRAPPED' && (
                                          <Badge variant="destructive" className="text-[9px] px-1 py-0 mt-0.5">
                                            SCRAPPED
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-3 w-3 text-[#2563EB] dark:text-teal-400 flex-shrink-0" />
                                  <p className="font-mono text-xs font-medium text-gray-900 dark:text-slate-100 truncate max-w-[120px]">
                                    {ticket.machine?.serialNumberManufacturer || 'N/A'}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="max-w-[200px]">
                                  {replacementCassettes[0]?.replacementReason ? (
                                    <p className="text-xs text-gray-700 dark:text-slate-300 truncate" title={replacementCassettes[0].replacementReason}>
                                      {replacementCassettes[0].replacementReason}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400 dark:text-slate-500 italic">Tidak ada alasan</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                  <p className="text-xs text-gray-900 dark:text-slate-100 truncate max-w-[120px]">
                                    {ticket.reporter?.fullName || 'N/A'}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {new Date(ticket.reportedAt).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <Link 
                                  href={`/tickets/${ticket.id}`}
                                  onClick={() => markTicketAsViewed(ticket.id)}
                                >
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                                    Detail
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPagesReplacement > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Halaman <span className="font-medium text-gray-900 dark:text-slate-100">{currentPage}</span> dari <span className="font-medium text-gray-900 dark:text-slate-100">{totalPagesReplacement}</span> • Total <span className="font-medium text-gray-900 dark:text-slate-100">{filteredReplacementRequests.length}</span> Replacement
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPagesReplacement, p + 1))}
                      disabled={currentPage === totalPagesReplacement}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

