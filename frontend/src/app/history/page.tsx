'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  History as HistoryIcon,
  Search,
  FileText,
  Calendar,
  User,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Monitor,
  AlertCircle,
  CalendarCheck,
  Wrench,
  Inbox,
} from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [pmTasks, setPmTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Explicitly request CLOSED tickets only (backend excludes CLOSED by default for active SO)
        const [ticketsRes, pmRes] = await Promise.all([
          api.get('/tickets', {
            params: {
              status: 'CLOSED',
              limit: 1000, // Get all closed tickets for history
            },
          }),
          api.get('/preventive-maintenance').catch(() => ({ data: [] })),
        ]);
        
        // Handle both old format (array) and new format (object with data & pagination)
        const ticketsData = Array.isArray(ticketsRes.data) 
          ? ticketsRes.data 
          : (ticketsRes.data?.data || []);
        
        // Sort by date descending (newest first)
        // Include both regular tickets and replacement requests (tickets with requestReplacement = true)
        const closedTickets = ticketsData
          .sort((a: any, b: any) => 
            new Date(b.closedAt || b.reportedAt).getTime() - new Date(a.closedAt || a.reportedAt).getTime()
        );
        setTickets(closedTickets);
        
        // Handle both old format (array) and new format (object with data & pagination)
        const pmData = Array.isArray(pmRes.data) 
          ? pmRes.data 
          : (pmRes.data?.data || []);
        
        // Filter only completed PM tasks and sort by date
        const completedPM = pmData
          .filter((pm: any) => pm.status === 'COMPLETED')
          .sort((a: any, b: any) => 
            new Date(b.actualEndDate || b.scheduledDate || b.createdAt).getTime() - 
            new Date(a.actualEndDate || a.scheduledDate || a.createdAt).getTime()
          );
        setPmTasks(completedPM);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Combine tickets and PM tasks
  const allItems = useMemo(() => {
    const ticketsWithType = tickets.map(t => ({ ...t, itemType: 'ticket' }));
    const pmWithType = pmTasks.map(pm => ({ ...pm, itemType: 'pm' }));
    return [...ticketsWithType, ...pmWithType];
  }, [tickets, pmTasks]);

  // Get unique months from all items
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allItems.forEach(item => {
      let date: Date;
      if (item.itemType === 'ticket') {
        date = new Date(item.reportedAt);
      } else if (item.itemType === 'pm') {
        date = new Date(item.actualEndDate || item.scheduledDate || item.createdAt);
      } else {
        return; // Skip unknown item types
      }
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [allItems]);

  // Filter all items (tickets + PM)
  const filteredItems = useMemo(() => {
    let filtered = [...allItems];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.itemType === 'ticket') {
          return (
            item.ticketNumber?.toLowerCase().includes(search) ||
            item.title?.toLowerCase().includes(search) ||
            item.cassette?.serialNumber?.toLowerCase().includes(search) ||
            item.machine?.serialNumberManufacturer?.toLowerCase().includes(search) ||
            item.reporter?.fullName?.toLowerCase().includes(search)
      );
        } else if (item.itemType === 'pm') {
          return (
            item.pmNumber?.toLowerCase().includes(search) ||
            item.title?.toLowerCase().includes(search) ||
            item.cassetteDetails?.some((d: any) => d.cassette?.serialNumber?.toLowerCase().includes(search))
          );
        }
        return false;
      });
    }

    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    if (selectedMonth !== 'ALL') {
      filtered = filtered.filter((item) => {
        let date: Date;
        if (item.itemType === 'ticket') {
          date = new Date(item.reportedAt);
        } else if (item.itemType === 'pm') {
          date = new Date(item.actualEndDate || item.scheduledDate || item.createdAt);
        } else {
          return false;
        }
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    }

    return filtered;
  }, [allItems, searchTerm, selectedStatus, selectedMonth]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const getStatusBadge = (status: string, itemType: string) => {
    if (itemType === 'pm') {
      const configs: Record<string, { label: string; className: string; icon: any }> = {
        COMPLETED: { label: 'Completed', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800', icon: CheckCircle2 },
      };
      return configs[status] || { label: status, className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700', icon: FileText };
    }
    
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      OPEN: { label: 'Open', className: 'bg-blue-100 dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: AlertCircle },
      IN_DELIVERY: { label: 'Dikirim ke RC', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Package },
      RECEIVED: { label: 'Diterima di RC', className: 'bg-[#C5000F]/20 dark:bg-[#C5000F]/30 text-[#C5000F] dark:text-red-400 border-[#C5000F]/30 dark:border-red-800', icon: Inbox },
      IN_PROGRESS: { label: 'Sedang Diperbaiki', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: Wrench },
      RESOLVED: { label: 'Siap Pickup', className: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 border-teal-200 dark:border-teal-800', icon: CheckCircle2 },
      CLOSED: { label: 'Selesai', className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700', icon: CheckCircle2 },
    };
    return configs[status] || configs.OPEN;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const exportToCSV = () => {
    const headers = ['Type', 'Number', 'Title/Issue', 'Cassette SN', 'Machine SN', 'Reporter/Engineer', 'Status', 'Created/Scheduled', 'Completed', 'Duration'];
    const csvData: any[] = [];
    
    filteredItems.forEach(item => {
      if (item.itemType === 'ticket') {
        const created = new Date(item.reportedAt);
        const closed = item.closedAt ? new Date(item.closedAt) : null;
      const duration = closed ? Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) : '-';
      
        // Get all cassettes (multi-cassette or single)
        const allCassettes = item.cassetteDetails && item.cassetteDetails.length > 0
          ? item.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
          : (item.cassette ? [item.cassette] : []);
        
        // If multi-cassette, create one row per cassette
        if (allCassettes.length > 1) {
          allCassettes.forEach((cassette: any, index: number) => {
            csvData.push([
              item.cassetteDetails?.some((d: any) => d.requestReplacement === true) ? 'Replacement Request' : 'Repair Order',
              item.ticketNumber,
              item.title,
              cassette.serialNumber || 'N/A',
              item.machine?.serialNumberManufacturer || 'N/A',
              item.reporter?.fullName || 'N/A',
              getStatusBadge(item.status, 'ticket').label,
              formatDateTime(item.reportedAt),
              closed ? formatDateTime(item.closedAt) : '-',
              duration !== '-' ? `${duration} hari` : '-',
            ]);
          });
        } else {
          // Single cassette
          csvData.push([
            item.cassetteDetails?.some((d: any) => d.requestReplacement === true) ? 'Replacement Request' : 'Repair Order',
            item.ticketNumber,
            item.title,
            allCassettes[0]?.serialNumber || item.cassette?.serialNumber || 'N/A',
            item.machine?.serialNumberManufacturer || 'N/A',
            item.reporter?.fullName || 'N/A',
            getStatusBadge(item.status, 'ticket').label,
            formatDateTime(item.reportedAt),
            closed ? formatDateTime(item.closedAt) : '-',
            duration !== '-' ? `${duration} hari` : '-',
          ]);
        }
      } else if (item.itemType === 'pm') {
        const scheduled = new Date(item.scheduledDate || item.createdAt);
        const completed = item.actualEndDate ? new Date(item.actualEndDate) : null;
        const duration = completed ? Math.round((completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)) : '-';
        const cassetteSNs = item.cassetteDetails?.map((d: any) => d.cassette?.serialNumber).join('; ') || 'N/A';
        
        csvData.push([
          'PM Task',
          item.pmNumber,
          item.title,
          cassetteSNs,
          'N/A',
          item.assignedEngineer?.fullName || 'N/A',
          getStatusBadge(item.status, 'pm').label,
          formatDateTime(item.scheduledDate || item.createdAt),
          completed ? formatDateTime(item.actualEndDate) : '-',
          duration !== '-' ? `${duration} hari` : '-',
        ]);
      }
    });
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `so-history-${dateStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="h-12 w-12 animate-spin text-[#2563EB]" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
              <Input
                placeholder="Cari RO number, kaset, mesin, reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="IN_DELIVERY">Dikirim ke RC</SelectItem>
                <SelectItem value="RECEIVED">Diterima di RC</SelectItem>
                <SelectItem value="IN_PROGRESS">Sedang Diperbaiki</SelectItem>
                <SelectItem value="RESOLVED">Siap Pickup</SelectItem>
                <SelectItem value="CLOSED">Selesai</SelectItem>
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Bulan</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonthYear(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedStatus !== 'ALL' || selectedMonth !== 'ALL') && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-sm text-muted-foreground">Filter aktif:</span>
              {searchTerm && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                  &quot;{searchTerm}&quot; <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {selectedStatus !== 'ALL' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedStatus('ALL')}>
                  {getStatusBadge(selectedStatus, 'ticket').label} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {selectedMonth !== 'ALL' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedMonth('ALL')}>
                  {formatMonthYear(selectedMonth)} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('ALL');
                  setSelectedMonth('ALL');
                }}
                className="h-6 text-xs"
              >
                Hapus semua
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end items-center gap-2 mt-4">
            <span className="text-sm text-gray-600 dark:text-slate-400 mr-1">
              {filteredItems.length} items ({filteredItems.filter(i => i.itemType === 'ticket').length} RO, {filteredItems.filter(i => i.itemType === 'pm').length} PM)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredItems.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Memuat riwayat...</p>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HistoryIcon className="h-16 w-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || selectedStatus !== 'ALL' || selectedMonth !== 'ALL'
                ? 'Tidak ada riwayat yang cocok'
                : 'Belum ada riwayat SO'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || selectedStatus !== 'ALL' || selectedMonth !== 'ALL'
                ? 'Coba ubah filter pencarian'
                : 'Repair orders akan muncul di sini setelah ditutup'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* SO History Table */}
          {paginatedItems.filter((item) => item.itemType === 'ticket').length > 0 && (
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-700 bg-slate-900">
                      <tr>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">SO Number</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Title</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Cassette</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Machine</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Reporter</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Created</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Closed</th>
                        <th className="text-left p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Duration</th>
                        <th className="text-center p-4 text-xs font-extrabold text-slate-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {paginatedItems.filter((item) => item.itemType === 'ticket').length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-12 text-center text-slate-400">
                            <FileText className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                            <p className="font-bold text-slate-300 mb-2 text-lg">Tidak ada Repair Order</p>
                            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                              {filteredItems.filter((i) => i.itemType === 'ticket').length === 0
                                ? 'Belum ada Repair Order yang ditutup.'
                                : 'Tidak ada Repair Order yang sesuai dengan filter.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedItems
                          .filter((item) => item.itemType === 'ticket')
                          .map((item) => {
              const statusBadge = getStatusBadge(item.status, item.itemType);
                          const StatusIcon = statusBadge.icon;
                const created = new Date(item.reportedAt);
                // Use closedAt, or fallback to cassetteReturn.receivedAtPengelola, or updatedAt for CLOSED tickets
                const closed = item.closedAt 
                  ? new Date(item.closedAt) 
                  : (item.status === 'CLOSED' && item.cassetteReturn?.receivedAtPengelola
                      ? new Date(item.cassetteReturn.receivedAtPengelola)
                      : (item.status === 'CLOSED' && item.updatedAt
                          ? new Date(item.updatedAt)
                          : null));
              const duration = closed 
                ? Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                : null;

                          // Get all cassettes
                          const allCassettes = item.cassetteDetails && item.cassetteDetails.length > 0
                            ? item.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
                            : (item.cassette ? [item.cassette] : []);
                          const cassetteCount = allCassettes.length;
                          const isMultiCassette = cassetteCount > 1;
                          
                          // Check if this ticket has replacement request
                          const hasReplacement = item.cassetteDetails?.some((d: any) => d.requestReplacement === true);
                          const replacementCassettes = hasReplacement 
                            ? item.cassetteDetails?.filter((d: any) => d.requestReplacement === true).map((d: any) => d.cassette).filter((c: any) => c !== null) || []
                            : [];

              return (
                            <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                              <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Link
                                  href={`/tickets/${item.id}?from=history`}
                                    className="font-mono font-extrabold text-sm text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                              >
                                  {item.ticketNumber}
                              </Link>
                            </div>
                              </td>
                              <td className="p-4">
                                <p className="text-sm text-slate-200 font-semibold truncate max-w-[200px]" title={item.title}>
                                  {item.title || 'N/A'}
                                </p>
                              </td>
                              <td className="p-4">
                                {isMultiCassette ? (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Package className="h-3.5 w-3.5 text-teal-400" />
                                      <span className="text-xs font-bold text-teal-400">{cassetteCount} Kaset</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      {allCassettes.slice(0, 2).map((cassette: any) => {
                                        const isReplacement = replacementCassettes.some((rc: any) => rc.id === cassette.id);
                                        return (
                                          <div key={cassette.id} className="flex items-center gap-1">
                                            <p className="font-mono text-xs text-slate-400 font-semibold truncate">
                                              {cassette.serialNumber}
                                            </p>
                                            {isReplacement && cassette.status === 'SCRAPPED' && (
                                              <Badge variant="destructive" className="text-[8px] px-1 py-0">
                                                SCRAPPED
                                              </Badge>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {cassetteCount > 2 && (
                                        <p className="text-xs text-slate-500 font-medium">+{cassetteCount - 2} lagi</p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <p className="font-mono font-extrabold text-sm text-slate-100">
                                      {allCassettes[0]?.serialNumber || item.cassette?.serialNumber || 'N/A'}
                                    </p>
                                  </div>
                                  {allCassettes[0]?.cassetteType && (
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                      {allCassettes[0].cassetteType.typeCode}
                                    </p>
                                  )}
                                  {hasReplacement && replacementCassettes.some((rc: any) => rc.id === (allCassettes[0]?.id || item.cassette?.id)) && (allCassettes[0] || item.cassette)?.status === 'SCRAPPED' && (
                                    <Badge variant="destructive" className="text-[9px] px-1 py-0 mt-0.5">
                                      SCRAPPED
                                    </Badge>
                                  )}
                                </div>
                                )}
                              </td>
                              <td className="p-4">
                                <p className="text-sm text-slate-200 font-semibold truncate max-w-[120px]">
                                  {item.machine?.serialNumberManufacturer || 'N/A'}
                              </p>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-slate-300 font-medium truncate max-w-[100px]">
                                    {item.reporter?.fullName || 'N/A'}
                            </span>
                          </div>
                              </td>
                              <td className="p-4">
                                <Badge className={`${statusBadge.className} text-xs px-2.5 py-1 gap-1 font-bold border`}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {statusBadge.label}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  {formatDateTime(item.reportedAt).split(',')[0]}
                                </div>
                              </td>
                              <td className="p-4">
                                {closed ? (
                                  <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                    {formatDateTime(closed.toISOString()).split(',')[0]}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                {duration !== null ? (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Clock className="h-3.5 w-3.5 text-green-400" />
                                    <span className="text-green-400 font-bold">{duration} hari</span>
                      </div>
                                ) : (
                                  <span className="text-sm text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                          <Link href={`/tickets/${item.id}?from=history`}>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 px-3 text-xs font-bold border-slate-600 text-slate-300 hover:bg-slate-700"
                                  >
                                    View
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
                    </CardContent>
                  </Card>
          )}

          {/* PM Tasks - Keep as Cards */}
          {paginatedItems.filter((item) => item.itemType === 'pm').length > 0 && (
            <div className="space-y-4">
              {paginatedItems
                .filter((item) => item.itemType === 'pm')
                .map((item) => {
                  const statusBadge = getStatusBadge(item.status, item.itemType);
                  
                  if (item.itemType === 'pm') {
                // PM Task
                const scheduled = new Date(item.scheduledDate || item.createdAt);
                const completed = item.actualEndDate ? new Date(item.actualEndDate) : null;
                const duration = completed 
                  ? Math.round((completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const cassetteCount = item.cassetteDetails?.length || 0;

                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Timeline Indicator */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <div className="w-0.5 h-full bg-gray-200 dark:bg-slate-700 mt-2" />
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <Link
                                href={`/preventive-maintenance/${item.id}`}
                                className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                              >
                                {item.pmNumber}
                              </Link>
                              <Badge className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                <CalendarCheck className="h-3 w-3 mr-1" />
                                PM Task
                              </Badge>
                              {cassetteCount > 0 && (
                                <Badge className="ml-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                                  {cassetteCount} Kaset
                                </Badge>
                              )}
                            </div>
                            <Badge className={`${statusBadge.className} border`}>
                              {statusBadge.label}
                            </Badge>
                          </div>

                          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{item.title}</h3>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-slate-400">Kaset</p>
                                <p className="font-mono font-medium truncate text-gray-900 dark:text-slate-100">
                                  {cassetteCount > 0
                                    ? `${cassetteCount} items`
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-slate-400">Engineer</p>
                                <p className="font-medium truncate text-gray-900 dark:text-slate-100">
                                  {item.assignedEngineer?.fullName || 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-600 dark:text-slate-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-slate-400">Scheduled</p>
                                <p className="font-medium truncate text-gray-900 dark:text-slate-100">
                                  {formatDateTime(item.scheduledDate || item.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-slate-400">Completed</p>
                                <p className="font-medium truncate text-gray-900 dark:text-slate-100">
                                  {completed ? formatDateTime(item.actualEndDate) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Duration if completed */}
                          {completed && duration !== null && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-gray-600 dark:text-slate-400">
                                Selesai dalam <strong className="text-gray-900 dark:text-slate-100">{duration} hari</strong>
                                {' '}• Completed: <span className="text-gray-900 dark:text-slate-100">{formatDateTime(item.actualEndDate)}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right: Action */}
                        <div className="flex-shrink-0">
                          <Link href={`/preventive-maintenance/${item.id}`}>
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-2" />
                              Detail
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                  }
                  return null;
                })}
                            </div>
                          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-sm text-slate-300 font-semibold">
                Halaman {currentPage} dari {totalPages} • Total {filteredItems.length} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-300 font-semibold px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

