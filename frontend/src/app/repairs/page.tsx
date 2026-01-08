'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
  Loader2,
  Search,
  Wrench,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  UserPlus,
  Calendar,
  Settings,
  Eye,
} from 'lucide-react';
// Dropdown menu removed in favor of direct action buttons for better clarity

function RepairsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL'); // Will exclude COMPLETED by default
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // Default to ALL to show all data
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [takingTicket, setTakingTicket] = useState<string | null>(null);
  const itemsPerPage = 50; // Increased from 15 to show more data per page

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
      router.replace(`/repairs?${params.toString()}`, { scroll: false });
    } else {
      // Remove page param if on page 1
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      const newUrl = params.toString() ? `/repairs?${params.toString()}` : '/repairs';
      router.replace(newUrl, { scroll: false });
    }
  }, [currentPage, router, searchParams]);

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
  }, [debouncedSearchTerm, selectedStatus, dateFilter, itemsPerPage]);

  const fetchRepairs = useCallback(async () => {
    if (!isAuthenticated || user?.userType !== 'HITACHI') {
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        params: {
          page: currentPage,
          limit: itemsPerPage,
        },
      };

      if (debouncedSearchTerm.trim()) {
        params.params.search = debouncedSearchTerm.trim();
      }

      // Always send status filter - backend will exclude COMPLETED when status is ALL
      params.params.status = selectedStatus || 'ALL';

      // Always send dateFilter (backend defaults to ALL if not provided)
      params.params.dateFilter = dateFilter || 'ALL';

      const repairsRes = await api.get('/repairs', params);

      // Handle both old format (array) and new format (object with data & pagination)
      if (Array.isArray(repairsRes.data)) {
        // Old format - backward compatibility
        setRepairs(repairsRes.data);
        setTotal(repairsRes.data.length);
        setTotalPages(Math.ceil(repairsRes.data.length / itemsPerPage));
      } else {
        // New format with pagination
        setRepairs(repairsRes.data?.data || []);
        setTotal(repairsRes.data?.pagination?.total || 0);
        setTotalPages(repairsRes.data?.pagination?.totalPages || 0);
      }
    } catch (error: any) {
      console.error('Error fetching repairs:', error);
      setRepairs([]);
      setTotal(0);
      setTotalPages(0);
      if (error.response?.status === 403) {
        alert('Access denied. You need RC_STAFF, RC_MANAGER, or SUPER_ADMIN role to view repairs.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, currentPage, itemsPerPage, debouncedSearchTerm, selectedStatus, dateFilter]);

  useEffect(() => {
    if (isAuthenticated && user?.userType === 'HITACHI') {
      fetchRepairs();
    }
  }, [isAuthenticated, user, fetchRepairs]);

  // Use server-side filtered and sorted data directly
  const paginatedRepairs = repairs; // Already filtered, sorted, and paginated from server

  // Status summary - Calculate from current page data (for display only)
  // Note: For accurate counts across all pages, backend should provide statusCounts
  const statusSummary = useMemo(() => ({
    total: total, // Use total from pagination
    received: repairs.filter(r => r.status === 'RECEIVED').length,
    diagnosing: repairs.filter(r => r.status === 'DIAGNOSING').length,
    onProgress: repairs.filter(r => r.status === 'ON_PROGRESS').length,
    completed: repairs.filter(r => r.status === 'COMPLETED').length,
    pending: repairs.filter(r => r.qcPassed === null).length,
  }), [repairs, total]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      RECEIVED: { label: 'Received', variant: 'bg-blue-500 text-white', icon: Package },
      DIAGNOSING: { label: 'Diagnosing', variant: 'bg-yellow-500 text-white', icon: AlertCircle },
      ON_PROGRESS: { label: 'On Progress', variant: 'bg-orange-500 text-white', icon: Wrench },
      COMPLETED: { label: 'Completed', variant: 'bg-green-500 text-white', icon: CheckCircle2 },
      PENDING: { label: 'Pending', variant: 'bg-gray-500 text-white', icon: Clock },
    };
    return configs[status] || { label: status, variant: 'bg-gray-500 text-white', icon: FileText };
  };

  const handleTakeTicket = async (repairId: string) => {
    try {
      setTakingTicket(repairId);
      await api.post(`/repairs/${repairId}/take`);

      // Refresh data after taking ticket
      fetchRepairs();
    } catch (error: any) {
      console.error('Error taking ticket:', error);
      alert(error.response?.data?.message || 'Failed to take ticket');
    } finally {
      setTakingTicket(null);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Memuat repair tickets...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.userType !== 'HITACHI') {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-200 font-bold text-lg mb-2">Akses Ditolak</p>
            <p className="text-slate-600 dark:text-slate-400">RC Staff only.</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-3">
              Your role: <span className="font-semibold">{user?.role || 'N/A'}</span> | User Type: <span className="font-semibold">{user?.userType || 'N/A'}</span>
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Check if user has required role
  const hasRequiredRole = user?.role === 'RC_STAFF' || user?.role === 'RC_MANAGER' || user?.role === 'SUPER_ADMIN';
  if (!hasRequiredRole) {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-200 font-bold text-lg mb-2">Akses Ditolak</p>
            <p className="text-slate-700 dark:text-slate-300 mb-3">You need RC_STAFF, RC_MANAGER, or SUPER_ADMIN role to view repairs.</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your current role: <span className="font-bold text-slate-800 dark:text-slate-300">{user?.role || 'N/A'}</span>
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 mt-6">
        {[
          { key: 'ALL', label: 'Total', count: statusSummary.total, color: 'slate', bgActive: 'bg-slate-100 dark:bg-slate-800', bgHover: 'hover:bg-slate-200 dark:hover:bg-slate-800/50', borderActive: 'border-slate-400 dark:border-slate-500', icon: Wrench, iconColor: 'text-slate-600 dark:text-slate-400' },
          { key: 'RECEIVED', label: 'Received', count: statusSummary.received, color: 'blue', bgActive: 'bg-blue-50 dark:bg-blue-900/30', bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-900/20', borderActive: 'border-blue-400 dark:border-blue-500', icon: Package, iconColor: 'text-blue-600 dark:text-blue-400' },
          { key: 'DIAGNOSING', label: 'Diagnosing', count: statusSummary.diagnosing, color: 'yellow', bgActive: 'bg-yellow-50 dark:bg-yellow-900/30', bgHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20', borderActive: 'border-yellow-400 dark:border-yellow-500', icon: AlertCircle, iconColor: 'text-yellow-600 dark:text-yellow-400' },
          { key: 'ON_PROGRESS', label: 'On Progress', count: statusSummary.onProgress, color: 'orange', bgActive: 'bg-orange-50 dark:bg-orange-900/30', bgHover: 'hover:bg-orange-100 dark:hover:bg-orange-900/20', borderActive: 'border-orange-400 dark:border-orange-500', icon: Wrench, iconColor: 'text-orange-600 dark:text-orange-400' },
          { key: 'COMPLETED', label: 'Completed', count: statusSummary.completed, color: 'green', bgActive: 'bg-green-50 dark:bg-green-900/30', bgHover: 'hover:bg-green-100 dark:hover:bg-green-900/20', borderActive: 'border-green-400 dark:border-green-500', icon: CheckCircle2, iconColor: 'text-green-600 dark:text-green-400' },
          { key: 'PENDING', label: 'Pending', count: statusSummary.pending, color: 'gray', bgActive: 'bg-gray-50 dark:bg-gray-900/30', bgHover: 'hover:bg-gray-100 dark:hover:bg-gray-900/20', borderActive: 'border-gray-400 dark:border-gray-500', icon: Clock, iconColor: 'text-gray-600 dark:text-gray-400' },
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="Cari cassette SN, issue, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
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
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SO ID</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cassette</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Issue</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bank</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Engineer</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Received</th>
                  <th className="text-left p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">QC</th>
                  <th className="text-center p-4 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-600 dark:text-slate-400">
                      <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-lg">Tidak ada repair tickets</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                        {repairs.length === 0
                          ? 'Belum ada repair tickets yang dibuat. Repair tickets dibuat dari Service Orders melalui tombol "Mulai Repair".'
                          : `Tidak ada repair tickets yang sesuai dengan filter "${getStatusBadge(selectedStatus).label}"`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRepairs.map((repair) => {
                    const statusBadge = getStatusBadge(repair.status);
                    const StatusIcon = statusBadge.icon;
                    const isAssigned = repair.repairer !== null;
                    const isAssignedToMe = repair.repairedBy === user?.id;
                    const canTakeTicket = !isAssigned; // Only show Take button if ticket is unassigned

                    return (
                      <tr
                        key={repair.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-transparent ${isAssigned
                          ? isAssignedToMe
                            ? 'bg-teal-50 dark:bg-slate-800/80 border-l-4 border-l-teal-500 dark:border-l-teal-500'
                            : 'bg-amber-50 dark:bg-slate-800/60 border-l-4 border-l-amber-400 dark:border-l-amber-500/50'
                          : ''
                          }`}
                      >
                        <td className="p-4">
                          {(() => {
                            // Prefer backend-derived SO ticket (repairs.service attaches `soTicket`)
                            const soTicket = (repair as any).soTicket
                              || repair.cassette?.deliveries?.[0]?.ticket
                              || repair.cassette?.ticketCassetteDetails?.[0]?.ticket;

                            if (soTicket?.ticketNumber) {
                              return (
                                <Link href={`/tickets/${soTicket.id}`}>
                                  <p className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 cursor-pointer underline">
                                    {soTicket.ticketNumber}
                                  </p>
                                </Link>
                              );
                            }
                            return <span className="text-xs text-slate-500 dark:text-slate-500 italic">-</span>;
                          })()}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {repair.cassette?.serialNumber || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                              {repair.cassette?.cassetteType?.typeCode || 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${statusBadge.variant} text-xs px-2.5 py-1 gap-1 font-bold`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]" title={repair.reportedIssue}>
                            {repair.reportedIssue || 'N/A'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[120px]">
                            {repair.cassette?.customerBank?.bankName || 'N/A'}
                          </p>
                        </td>
                        <td className="p-4">
                          {isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${isAssignedToMe
                                ? 'bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/30'
                                : 'bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30'
                                }`}>
                                <User className={`h-4 w-4 ${isAssignedToMe ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
                                  }`} />
                                <span className={`text-sm font-semibold ${isAssignedToMe
                                  ? 'text-teal-700 dark:text-teal-300'
                                  : 'text-amber-700 dark:text-amber-300'
                                  }`}>
                                  {repair.repairer?.fullName || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" />
                              <span className="text-sm text-slate-600 dark:text-slate-500 italic font-medium">Unassigned</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            {repair.receivedAtRc
                              ? new Date(repair.receivedAtRc).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              })
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-bold">
                            {repair.qcPassed === null
                              ? <span className="text-yellow-600 dark:text-yellow-400">⏳ Pending</span>
                              : repair.qcPassed
                                ? <span className="text-green-600 dark:text-green-400">✅ Pass</span>
                                : <span className="text-red-600 dark:text-red-400">❌ Fail</span>}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Take Ticket button (if unassigned and user can take) */}
                            {canTakeTicket && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTakeTicket(repair.id)}
                                disabled={takingTicket === repair.id}
                                className="h-8 px-3 text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                              >
                                {takingTicket === repair.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Taking...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Take
                                  </>
                                )}
                              </Button>
                            )}

                            {/* View / Manage button */}
                            <Link href={`/repairs/${repair.id}${currentPage > 1 ? `?page=${currentPage}` : ''}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                              >
                                {repair.status === 'COMPLETED' ? (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Detail
                                  </>
                                ) : (
                                  <>
                                    <Settings className="h-3 w-3 mr-1" />
                                    Manage
                                  </>
                                )}
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
                Halaman {currentPage} dari {totalPages} • Total {total} repairs
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

export default function RepairsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" /></div>}>
      <RepairsPageContent />
    </Suspense>
  );
}

