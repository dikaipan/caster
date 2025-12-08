'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Disc,
  RefreshCw,
  Download,
  Filter,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Truck,
  Wrench,
  Package,
  Trash2,
  ArrowUpDown,
  Copy,
  Check,
  Plus,
  Edit,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton, StatsCardSkeleton } from '@/components/ui/loading';
import { CassetteTableSkeleton } from '@/components/ui/cassette-table-skeleton';
import { ErrorWithRetry } from '@/components/ui/error-with-retry';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

export default function CassettesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [cassettes, setCassettes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInputValue, setSearchInputValue] = useState(''); // Local state for input (immediate update)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Changed from 25 to 50 for better performance
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('serialNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  
  // CRUD Dialog States
  const [addCassetteDialogOpen, setAddCassetteDialogOpen] = useState(false);
  const [editCassetteDialogOpen, setEditCassetteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cassetteToEdit, setCassetteToEdit] = useState<any>(null);
  const [cassetteToDelete, setCassetteToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    serialNumber: '',
    cassetteTypeId: '',
    customerBankId: '',
    machineId: '',
    usageType: 'MAIN' as 'MAIN' | 'BACKUP',
    status: 'OK' as string,
    notes: '',
  });
  
  // Dropdown Data
  const [banks, setBanks] = useState<any[]>([]);
  const [cassetteTypes, setCassetteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchCassettes = useCallback(async () => {
      try {
        setLoading(true);
        
        // Build query params with server-side filtering and sorting
        const params: any = {
          page: currentPage,
          limit: itemsPerPage,
        };
        
        if (searchTerm.trim()) {
          params.keyword = searchTerm.trim();
        }
        
        // Server-side status filter
        if (selectedStatus && selectedStatus !== 'all') {
          params.status = selectedStatus;
        }
        
        // ADD: Filter by bank
        if (selectedBankId) {
          params.customerBankId = selectedBankId;
        }
        
        // Server-side sorting
        if (sortField) {
          params.sortBy = sortField;
          params.sortOrder = sortDirection;
        }
        
        const response = await api.get('/cassettes', { params }).catch((error) => {
          console.error('❌ Error fetching cassettes:', error);
          if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
          } else if (error.request) {
            console.error('No response received. Backend server mungkin tidak berjalan.');
            throw new Error('Backend server tidak dapat diakses. Pastikan server berjalan di port 3001.');
          }
          throw error;
        });
        
        let cassettesData: any[] = [];
        let total = 0;
        let totalPagesCount = 1;
        
        // Handle both old format (array) and new format (object with data and pagination)
        if (Array.isArray(response.data)) {
          // Old format - direct array (backward compatibility)
          cassettesData = response.data;
          total = response.data.length;
          totalPagesCount = Math.ceil(total / itemsPerPage);
        } else if (response.data.data) {
          // New format with pagination
          cassettesData = response.data.data;
          total = response.data.pagination?.total || 0;
          totalPagesCount = response.data.pagination?.totalPages || 1;
          
          // Use statistics from backend if available
          if (response.data.statistics?.statusCounts) {
            setStatusCounts(response.data.statistics.statusCounts);
          }
        } else {
          cassettesData = [];
        }
        
        setCassettes(cassettesData);
        setTotalItems(total);
        setTotalPages(totalPagesCount);
      } catch (error: any) {
        // User-friendly error messages
        let errorTitle = 'Gagal Memuat Data';
        let errorDescription = 'Terjadi kesalahan saat memuat data kaset.';
        
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 404) {
            errorTitle = 'Endpoint Tidak Ditemukan';
            errorDescription = 'Pastikan backend server berjalan dan endpoint terdaftar.';
          } else if (status === 401) {
            errorTitle = 'Tidak Terautentikasi';
            errorDescription = 'Sesi Anda telah berakhir. Silakan login kembali.';
            router.push('/login');
          } else if (status === 403) {
            errorTitle = 'Akses Ditolak';
            errorDescription = 'Anda tidak memiliki izin untuk mengakses data ini.';
          } else if (status >= 500) {
            errorTitle = 'Kesalahan Server';
            errorDescription = 'Server mengalami masalah. Silakan coba lagi nanti.';
          } else if (data?.message) {
            errorDescription = data.message;
          }
        } else if (error.request) {
          errorTitle = 'Tidak Ada Koneksi';
          errorDescription = 'Tidak dapat terhubung ke server. Pastikan backend server berjalan di http://localhost:3001';
        } else if (error.message) {
          errorDescription = error.message;
        }
        
        // Show toast notification
        toast({
          variant: 'destructive',
          title: errorTitle,
          description: errorDescription,
        });
        
        // Set empty array instead of leaving it undefined
        setCassettes([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
  }, [user?.userType, user?.role, user?.pengelolaId, currentPage, itemsPerPage, searchTerm, selectedStatus, sortField, sortDirection, selectedBankId, router, toast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCassettes();
    }
  }, [isAuthenticated, fetchCassettes, currentPage, itemsPerPage]);

  // Debounced search handler - triggers API call after user stops typing
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to page 1 when search changes
    },
    500 // 500ms delay
  );

  // Handle search input change (immediate UI update, debounced API call)
  const handleSearchChange = (value: string) => {
    setSearchInputValue(value); // Update input immediately for better UX
    debouncedSearch(value); // Debounced API call
  };

  // Sync searchInputValue with searchTerm when cleared externally
  useEffect(() => {
    if (searchTerm === '') {
      setSearchInputValue('');
    }
  }, [searchTerm]);

  // Reset to page 1 when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, sortField, sortDirection, selectedBankId]);

  // Copy to clipboard function
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with "/" key
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      // Close modals with Escape
      if (e.key === 'Escape') {
        // This will be handled by individual modals
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show skeleton loading instead of simple spinner
  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          
          {/* Search Card Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 h-10 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse" />
                  <div className="w-32 h-10 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Table Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton rows={10} cols={8} />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700';
      case 'BAD':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'IN_TRANSIT_TO_RC':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700';
      case 'IN_REPAIR':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-700';
      case 'READY_FOR_PICKUP':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 border-teal-300 dark:border-teal-700';
      case 'IN_TRANSIT_TO_PENGELOLA':
        return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-700';
      case 'SCRAPPED':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4" />;
      case 'BAD':
        return <XCircle className="h-4 w-4" />;
      case 'IN_TRANSIT_TO_RC':
        return <Truck className="h-4 w-4" />;
      case 'IN_REPAIR':
        return <Wrench className="h-4 w-4" />;
      case 'READY_FOR_PICKUP':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'IN_TRANSIT_TO_PENGELOLA':
        return <Package className="h-4 w-4" />;
      case 'SCRAPPED':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Disc className="h-4 w-4" />;
    }
  };

  // Define role checks early
  const isPengelola = user?.userType === 'PENGELOLA';
  const isPengelolaAdmin = user?.role === 'ADMIN';
  const isPengelolaSupervisor = user?.role === 'SUPERVISOR';

  const formatStatusLabel = (status: string) => {
    // Role-aware status labels
    if (status === 'IN_TRANSIT_TO_PENGELOLA') {
      return isPengelola ? 'Kembali dari RC' : 'Kirim ke Pengelola';
    }
    if (status === 'IN_TRANSIT_TO_RC') {
      return isPengelola ? 'Dikirim ke RC' : 'Dalam Perjalanan ke RC';
    }
    
    // Default: capitalize and replace underscores
    const labels: Record<string, string> = {
      'OK': 'OK',
      'BAD': 'Rusak',
      'IN_REPAIR': 'Dalam Perbaikan',
      'SCRAPPED': 'Tidak Layak Pakai',
    };
    
    return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // CRUD Handler Functions
  const resetForm = () => {
    setFormData({
      serialNumber: '',
      cassetteTypeId: '',
      customerBankId: '',
      machineId: '',
      usageType: 'MAIN',
      status: 'OK',
      notes: '',
    });
  };
  
  const loadDropdownData = async (bankId?: string) => {
    try {
      setLoadingDropdowns(true);
      const [banksRes, typesRes] = await Promise.all([
        api.get('/bank-customers'),
        api.get('/cassettes/types'),
      ]);
      setBanks(banksRes.data || []);
      setCassetteTypes(typesRes.data || []);
      if (bankId) {
        await loadMachinesForBank(bankId);
      }
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data dropdown',
        variant: 'destructive',
      });
    } finally {
      setLoadingDropdowns(false);
    }
  };
  
  const loadMachinesForBank = async (bankId: string) => {
    if (!bankId) {
      setMachines([]);
      return;
    }
    try {
      const response = await api.get('/machines', {
        params: { limit: 1000 },
      });
      const machinesData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      // Filter machines by bank
      const filteredMachines = machinesData.filter(
        (m: any) => m.customerBankId === bankId
      );
      setMachines(filteredMachines);
    } catch (error) {
      console.error('Error loading machines:', error);
      setMachines([]);
    }
  };
  
  const handleCreateCassette = async () => {
    if (!formData.serialNumber || !formData.cassetteTypeId || !formData.customerBankId) {
      toast({
        title: 'Error',
        description: 'Serial Number, Cassette Type, dan Bank wajib diisi',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSaving(true);
      const payload = {
        serialNumber: formData.serialNumber,
        cassetteTypeId: formData.cassetteTypeId,
        customerBankId: formData.customerBankId,
        machineId: formData.machineId || undefined,
        usageType: formData.usageType,
        status: formData.status,
        notes: formData.notes || undefined,
      };
      await api.post('/cassettes', payload);
      toast({
        title: 'Berhasil',
        description: 'Kaset berhasil dibuat',
      });
      setAddCassetteDialogOpen(false);
      resetForm();
      fetchCassettes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal membuat kaset',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateCassette = async () => {
    if (!cassetteToEdit) return;
    
    try {
      setSaving(true);
      const payload = {
        machineId: formData.machineId || null,
        usageType: formData.usageType,
        status: formData.status,
        notes: formData.notes || undefined,
      };
      await api.patch(`/cassettes/${cassetteToEdit.id}`, payload);
      toast({
        title: 'Berhasil',
        description: 'Kaset berhasil diupdate',
      });
      setEditCassetteDialogOpen(false);
      setCassetteToEdit(null);
      resetForm();
      fetchCassettes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal mengupdate kaset',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteCassette = async () => {
    if (!cassetteToDelete) return;
    
    try {
      setDeleting(true);
      await api.delete(`/cassettes/${cassetteToDelete.id}`);
      toast({
        title: 'Berhasil',
        description: 'Kaset berhasil dihapus',
      });
      setDeleteDialogOpen(false);
      setCassetteToDelete(null);
      fetchCassettes();
    } catch (error: any) {
      console.error('Error deleting cassette:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Gagal menghapus kaset. Silakan coba lagi.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000, // Show longer for important errors
      });
    } finally {
      setDeleting(false);
    }
  };

  // Additional role-based permissions
  const isHitachi = user?.userType === 'HITACHI';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isRCManager = user?.role === 'RC_MANAGER';
  const isRCStaff = user?.role === 'RC_STAFF';
  const isTechnician = user?.role === 'TECHNICIAN';
  const canManageCassettes = isHitachi && isSuperAdmin;
  
  // Status counts are now provided by backend in response.statistics.statusCounts
  // This gives accurate counts for all matching records, not just current page

  // Gunakan data dari server apa adanya
  const effectiveTotalItems = totalItems;
  const paginatedCassettes = cassettes;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + paginatedCassettes.length, effectiveTotalItems);

  const exportToCSV = () => {
    const headers = ['Serial Number', 'Cassette Type', 'Machine Type', 'Bank', 'Status', 'Usage Type', 'Cycle Problem (SO)', 'Repair Count', 'Notes'];
    // Note: Export only current page data. For full export, use server-side export endpoint
    const csvData = paginatedCassettes.map(c => {
      const singleCassetteCount = c._count?.problemTickets || 0;
      const multiCassetteCount = c._count?.ticketCassetteDetails || 0;
      const problemCount = singleCassetteCount + multiCassetteCount;
      const repairCount = c._count?.repairTickets || 0;
      return [
        c.serialNumber,
        c.cassetteType?.typeCode || 'N/A',
        c.cassetteType?.machineType || '-',
        c.customerBank?.bankName || 'N/A',
        formatStatusLabel(c.status),
        c.usageType === 'MAIN' ? 'Utama' : c.usageType === 'BACKUP' ? 'Cadangan' : '-',
        problemCount,
        repairCount,
        (c.notes || '-').replace(/"/g, '""') // Escape quotes in notes
      ];
    });
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const userType = isHitachi ? 'hitachi' : 'pengelola';
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `cassettes-${userType}-${dateStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <PageLayout>

      {/* Role-based info banner */}
      {isPengelola && (
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Package className="h-5 w-5 text-[#2563EB] dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#2563EB] dark:text-blue-400">Mode Pengelola</h3>
                <p className="text-sm text-[#1E40AF] dark:text-blue-300 mt-1">
                  Anda melihat kaset dari <strong>bank-bank yang di-assign</strong> ke pengelola Anda.
                  {isTechnician 
                    ? ' Mode tampilan saja (read-only).'
                    : ''}
                </p>
                {paginatedCassettes.length === 0 && totalItems === 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <strong>⚠️ Tidak ada data kaset</strong>
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Kemungkinan: Pengelola Anda belum memiliki bank assignment, atau belum ada kaset untuk bank yang di-assign.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      Hubungi administrator untuk mengatur bank assignment.
                    </p>
                  </div>
                )}
                {user?.pengelolaId && (
                  <p className="text-xs text-[#2563EB] dark:text-blue-400 mt-2">
                    Pengelola ID: {user.pengelolaId}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Kaset</p>
              </div>
              <Disc className="h-8 w-8 text-[#2563EB] dark:text-teal-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    const okCount = statusCounts.OK || 0;
                    const total = totalItems;
                    if (total === 0) return '0%';
                    // Calculate percentage with 1 decimal place for accuracy
                    const percentage = (okCount / total) * 100;
                    // Round to 1 decimal, but show as integer if whole number
                    return percentage % 1 === 0 ? `${Math.round(percentage)}%` : `${percentage.toFixed(1)}%`;
                  })()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Kondisi Baik
                  {totalItems > 0 && (
                    <span className="text-xs text-muted-foreground/70 ml-1">
                      ({statusCounts.OK || 0} dari {totalItems})
                    </span>
                  )}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500 dark:text-emerald-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusCounts.IN_REPAIR || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Dalam Perbaikan</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.BAD || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Rusak</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 dark:text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { key: 'OK', label: 'OK', count: statusCounts.OK || 0, color: 'emerald', icon: CheckCircle },
          { key: 'BAD', label: 'Rusak', count: statusCounts.BAD || 0, color: 'red', icon: XCircle },
          { key: 'IN_TRANSIT_TO_RC', label: isPengelola ? 'Dikirim ke RC' : 'Dalam Perjalanan', count: statusCounts.IN_TRANSIT_TO_RC || 0, color: 'amber', icon: Truck },
          { key: 'IN_REPAIR', label: isPengelola ? 'Sedang Diperbaiki' : 'Dalam Perbaikan', count: statusCounts.IN_REPAIR || 0, color: 'orange', icon: Wrench },
          { key: 'READY_FOR_PICKUP', label: isPengelola ? 'Siap Di-pickup' : 'Siap Di-pickup', count: statusCounts.READY_FOR_PICKUP || 0, color: 'teal', icon: CheckCircle2, title: 'Kaset sudah selesai diperbaiki dan siap di-pickup di RC' },
          { key: 'SCRAPPED', label: 'Tidak Layak Pakai', count: statusCounts.SCRAPPED || 0, color: 'gray', icon: Trash2, title: 'Kaset yang sudah tidak layak pakai dan dibuang secara fisik' },
        ].map(({ key, label, count, color, icon: Icon, title }) => {
          const isSelected = selectedStatus === key;
          
          // Color classes when selected vs not selected (like Repairs page)
          const colorClasses = {
            emerald: isSelected 
              ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-800 bg-white dark:bg-slate-800',
            red: isSelected 
              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-800 bg-white dark:bg-slate-800',
            amber: isSelected 
              ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-800 bg-white dark:bg-slate-800',
            orange: isSelected 
              ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-800 bg-white dark:bg-slate-800',
            sky: isSelected 
              ? 'border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-800 bg-white dark:bg-slate-800',
            gray: isSelected 
              ? 'border-gray-500 dark:border-gray-400 bg-gray-50 dark:bg-gray-900/20' 
              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-slate-800',
          };
          
          // Text color always visible
          const textColorClasses = {
            emerald: 'text-emerald-700 dark:text-emerald-300',
            red: 'text-red-700 dark:text-red-300',
            amber: 'text-amber-700 dark:text-amber-300',
            orange: 'text-orange-700 dark:text-orange-300',
            sky: 'text-sky-700 dark:text-sky-300',
            gray: 'text-gray-700 dark:text-gray-300',
          };
          
          // Icon color always visible
          const iconColorClasses = {
            emerald: 'text-emerald-500 dark:text-emerald-400',
            red: 'text-red-500 dark:text-red-400',
            amber: 'text-amber-500 dark:text-amber-400',
            orange: 'text-orange-500 dark:text-orange-400',
            sky: 'text-sky-500 dark:text-sky-400',
            gray: 'text-gray-500 dark:text-gray-400',
          };

          return (
            <button
              key={key}
              onClick={() => setSelectedStatus(selectedStatus === key ? null : key)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${colorClasses[color as keyof typeof colorClasses]} shadow-md`
                  : `${colorClasses[color as keyof typeof colorClasses]}`
              }`}
              title={title || ''}
            >
              <Icon className={`h-5 w-5 ${iconColorClasses[color as keyof typeof iconColorClasses]} mb-2`} />
              <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">{label}</p>
              <p className={`text-xl font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-2 w-full sm:max-w-2xl">
              <Select 
                value={selectedBankId || 'all'} 
                onValueChange={(value) => setSelectedBankId(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <Input
                    ref={searchInputRef}
                    placeholder="Cari nomor serial, tipe kaset, tipe mesin (VS/SR), bank, atau status... (Tekan / untuk fokus)"
                  value={searchInputValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                  className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            </div>
            
            {/* Active Filters */}
            {(selectedStatus || searchInputValue || selectedBankId) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filter aktif:</span>
                {selectedBankId && (
                  <Badge 
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => setSelectedBankId(null)}
                  >
                    Bank: {banks.find(b => b.id === selectedBankId)?.bankName || selectedBankId}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {searchInputValue && (
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      setSearchInputValue('');
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                  >
                    Pencarian: &quot;{searchInputValue}&quot;
                  </Badge>
                )}
                {selectedStatus && (
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      setSelectedStatus(null);
                      setCurrentPage(1);
                    }}
                  >
                    Status: {formatStatusLabel(selectedStatus)}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus(null);
                    setSearchInputValue('');
                    setSearchTerm('');
                    setSelectedBankId(null);
                    setCurrentPage(1);
                  }}
                  className="h-6 text-xs"
                >
                  Hapus semua filter
                </Button>
              </div>
            )}
          </div>
          </CardContent>
        </Card>

      {/* Modern Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Disc className="h-5 w-5 text-primary" />
                <span>Daftar Kaset</span>
                <Badge variant="secondary" className="ml-2">
                  {effectiveTotalItems.toLocaleString()} kaset
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                Klik header kolom untuk mengurutkan data
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCassettes}
                disabled={loading}
                className="flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={paginatedCassettes.length === 0}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              {canManageCassettes && (
                <Button
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setAddCassetteDialogOpen(true);
                    loadDropdownData();
                  }}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Cassette</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Skeleton loading for better UX
            <CassetteTableSkeleton rows={itemsPerPage} />
          ) : fetchError ? (
            // Error with retry button
            <ErrorWithRetry
              title="Gagal Memuat Data Kaset"
              description={fetchError}
              onRetry={() => {
                setFetchError(null);
                fetchCassettes();
              }}
              retryLabel="Coba Lagi"
            />
          ) : paginatedCassettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Disc className="h-16 w-16 text-gray-300 dark:text-slate-700" />
              <div className="text-center max-w-md">
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {searchInputValue || selectedStatus ? 'Tidak ada kaset yang cocok' : 'Tidak ada data kaset'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchInputValue || selectedStatus 
                    ? 'Coba ubah filter atau kata kunci pencarian' 
                    : isPengelola 
                    ? 'Tidak ada kaset dari bank yang di-assign ke pengelola Anda.'
                    : 'Belum ada kaset yang terdaftar dalam sistem.'}
                </p>
                {(searchInputValue || selectedStatus) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchInputValue('');
                      setSearchTerm('');
                      setSelectedStatus(null);
                      setCurrentPage(1);
                    }}
                    className="mt-2"
                  >
                    Hapus Filter
                  </Button>
                )}
                {isPengelola && !searchTerm && !selectedStatus && (
                  <div className="text-xs text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 mt-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Kemungkinan Penyebab:</p>
                    <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 space-y-1">
                      <li>Pengelola Anda belum memiliki bank assignment</li>
                      <li>Bank yang di-assign belum memiliki kaset</li>
                      <li>Data belum dimuat dari server</li>
                    </ul>
                    <p className="text-amber-600 dark:text-amber-500 mt-2">
                      💡 Hubungi administrator sistem untuk bantuan.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-gray-50/95 dark:bg-slate-700/95 backdrop-blur-sm shadow-sm">
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95"
                        onClick={() => handleSort('serialNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Nomor Serial
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center gap-2">
                          Tipe Kaset
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('machineType')}
                      >
                        <div className="flex items-center gap-2">
                          Tipe Mesin
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('bank')}
                      >
                        <div className="flex items-center gap-2">
                          Bank
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95">Jenis Penggunaan</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95">Cycle Problem</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95">Replacement Info</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95">Catatan</th>
                      {canManageCassettes && (
                        <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300 bg-gray-50/95 dark:bg-slate-700/95">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCassettes.map((cassette, index) => {
                      // Cycle Problem = berapa kali kaset bermasalah (Service Orders)
                      // Include both single cassette SOs and multi-cassette SOs
                      const problemCount = cassette.problemCount ?? ((cassette._count?.problemTickets || 0) + (cassette._count?.ticketCassetteDetails || 0));
                      const singleCassetteCount = cassette._count?.problemTickets || 0;
                      const multiCassetteCount = cassette._count?.ticketCassetteDetails || 0;
                      const repairCount = cassette.repairCount ?? (cassette._count?.repairTickets || 0);
                      return (
                        <tr
                          key={cassette.id}
                          className={`border-b hover:bg-red-50/30 dark:hover:bg-slate-700/30 transition-colors ${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                          }`}
                        >
                        <td className="p-4">
                          <div className="flex items-center gap-2 group">
                            <Disc className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                            <span className="font-mono font-medium text-gray-900 dark:text-slate-100">{cassette.serialNumber}</span>
                            <button
                              onClick={() => copyToClipboard(cassette.serialNumber, cassette.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                              title="Copy serial number"
                            >
                              {copiedId === cassette.id ? (
                                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <Badge variant="outline" className="w-fit">
                              {cassette.cassetteType?.typeCode || 'N/A'}
                            </Badge>
                            {cassette.cassetteType?.description && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {cassette.cassetteType.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {cassette.cassetteType?.machineType ? (
                            <Badge 
                              variant="secondary"
                              className={`font-semibold ${
                                cassette.cassetteType.machineType === 'VS' 
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                              }`}
                            >
                              {cassette.cassetteType.machineType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-gray-900 dark:text-slate-100">{cassette.customerBank?.bankName || 'N/A'}</span>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={`inline-flex items-center gap-1.5 px-3 py-1 border ${getStatusColor(
                              cassette.status,
                            )}`}
                          >
                            {getStatusIcon(cassette.status)}
                            {formatStatusLabel(cassette.status)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {cassette.usageType ? (
                            <Badge variant="secondary">
                              {cassette.usageType === 'MAIN' ? 'Utama' : 'Cadangan'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`font-semibold ${
                                problemCount === 0 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                  : problemCount <= 2
                                  ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                              }`}
                              title={`Total ${problemCount} SO (${singleCassetteCount} single + ${multiCassetteCount} multi-cassette), ${repairCount} repair${repairCount !== 1 ? 's' : ''}`}
                            >
                              {problemCount}x
                            </Badge>
                            {(problemCount > 0 || repairCount > 0) && (
                              <span className="text-xs text-muted-foreground">
                                ({problemCount} SO, {repairCount} repair)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {cassette.replacedCassette && (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Replaces: {cassette.replacedCassette.serialNumber}
                                </Badge>
                              </div>
                            )}
                            {cassette.replacementFor && cassette.replacementFor.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                                  <Package className="h-3 w-3 mr-1" />
                                  Replaced by: {cassette.replacementFor.map((r: any) => r.serialNumber).join(', ')}
                                </Badge>
                              </div>
                            )}
                            {!cassette.replacedCassette && (!cassette.replacementFor || cassette.replacementFor.length === 0) && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground text-xs max-w-xs truncate block" title={cassette.notes || ''}>
                            {cassette.notes || '-'}
                          </span>
                        </td>
                        {canManageCassettes && (
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCassetteToEdit(cassette);
                                  setFormData({
                                    serialNumber: cassette.serialNumber,
                                    cassetteTypeId: cassette.cassetteTypeId,
                                    customerBankId: cassette.customerBankId,
                                    machineId: cassette.machineId || '',
                                    usageType: cassette.usageType || 'MAIN',
                                    status: cassette.status,
                                    notes: cassette.notes || '',
                                  });
                                  setEditCassetteDialogOpen(true);
                                  loadDropdownData(cassette.customerBankId);
                                }}
                                className="h-8 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#2563EB] dark:hover:text-teal-400 hover:border-blue-300 dark:hover:border-teal-600"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCassetteToDelete(cassette);
                                  setDeleteDialogOpen(true);
                                }}
                                className="h-8 px-3 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 gap-4">
                  <div className="text-sm text-muted-foreground order-2 sm:order-1">
                    Menampilkan <span className="font-medium text-gray-900 dark:text-slate-100">{startIndex + 1}</span> sampai{' '}
                    <span className="font-medium text-gray-900 dark:text-slate-100">{endIndex}</span> dari{' '}
                    <span className="font-medium text-gray-900 dark:text-slate-100">{effectiveTotalItems}</span> kaset
                  </div>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:flex"
                    >
                      Awal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Sebelumnya</span>
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{currentPage}</span>
                      <span className="text-sm text-muted-foreground">/</span>
                      <span className="text-sm text-muted-foreground">{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <span className="hidden sm:inline mr-1">Selanjutnya</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="hidden sm:flex"
                    >
                      Akhir
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Cassette Dialog */}
      <Dialog open={addCassetteDialogOpen} onOpenChange={setAddCassetteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Add New Cassette
            </DialogTitle>
            <DialogDescription>
              Create a new cassette. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="e.g., RB-BNI-0001"
              />
            </div>
            <div>
              <Label htmlFor="cassetteTypeId">Cassette Type *</Label>
              <Select
                value={formData.cassetteTypeId}
                onValueChange={(value) => setFormData({ ...formData, cassetteTypeId: value })}
                disabled={loadingDropdowns}
              >
                <SelectTrigger id="cassetteTypeId">
                  <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select cassette type"} />
                </SelectTrigger>
                <SelectContent>
                  {cassetteTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.typeCode} - {type.description || type.machineType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customerBankId">Bank *</Label>
              <Select
                value={formData.customerBankId}
                onValueChange={(value) => {
                  const selectedBank = banks.find(b => b.id === value);
                  const bankUsesMachines = selectedBank?.useMachines !== false;
                  setFormData({ 
                    ...formData, 
                    customerBankId: value, 
                    machineId: bankUsesMachines ? formData.machineId : '' // Clear machine jika bank tidak menggunakan machines
                  });
                  if (bankUsesMachines) {
                    loadMachinesForBank(value);
                  }
                }}
                disabled={loadingDropdowns}
              >
                <SelectTrigger id="customerBankId">
                  <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select bank"} />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Machine field - hanya tampil jika bank menggunakan mesin */}
            {(() => {
              const selectedBank = banks.find(b => b.id === formData.customerBankId);
              const bankUsesMachines = selectedBank?.useMachines !== false; // Default true untuk backward compatibility
              
              if (!bankUsesMachines) return null;
              
              return (
                <div>
                  <Label htmlFor="machineId">Machine (Optional)</Label>
                  <Select
                    value={formData.machineId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, machineId: value === 'NONE' ? '' : value })}
                    disabled={!formData.customerBankId}
                  >
                    <SelectTrigger id="machineId">
                  <SelectValue placeholder={formData.customerBankId ? "Select machine (optional)" : "Select bank first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machineCode} - {machine.serialNumberManufacturer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageType">Usage Type</Label>
                <Select
                  value={formData.usageType}
                  onValueChange={(value: 'MAIN' | 'BACKUP') => setFormData({ ...formData, usageType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAIN">MAIN</SelectItem>
                    <SelectItem value="BACKUP">BACKUP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="BAD">BAD</SelectItem>
                    <SelectItem value="IN_TRANSIT_TO_RC">IN_TRANSIT_TO_RC</SelectItem>
                    <SelectItem value="IN_REPAIR">IN_REPAIR</SelectItem>
                    <SelectItem value="IN_TRANSIT_TO_PENGELOLA">IN_TRANSIT_TO_PENGELOLA</SelectItem>
                    <SelectItem value="SCRAPPED">SCRAPPED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCassetteDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCassette}
              disabled={saving || !formData.serialNumber || !formData.cassetteTypeId || !formData.customerBankId}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cassette Dialog */}
      <Dialog open={editCassetteDialogOpen} onOpenChange={setEditCassetteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Cassette
            </DialogTitle>
            <DialogDescription>
              Update cassette information. Serial Number cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Serial Number</Label>
              <Input value={formData.serialNumber} disabled />
            </div>
            {/* Machine field - hanya tampil jika bank menggunakan mesin */}
            {(() => {
              const selectedBank = banks.find(b => b.id === formData.customerBankId);
              const bankUsesMachines = selectedBank?.useMachines !== false; // Default true untuk backward compatibility
              
              if (!bankUsesMachines) return null;
              
              return (
                <div>
                  <Label htmlFor="edit-machineId">Machine (Optional)</Label>
                  <Select
                    value={formData.machineId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, machineId: value === 'NONE' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select machine (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.machineCode} - {machine.serialNumberManufacturer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-usageType">Usage Type</Label>
                <Select
                  value={formData.usageType}
                  onValueChange={(value: 'MAIN' | 'BACKUP') => setFormData({ ...formData, usageType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAIN">MAIN</SelectItem>
                    <SelectItem value="BACKUP">BACKUP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="BAD">BAD</SelectItem>
                    <SelectItem value="IN_TRANSIT_TO_RC">IN_TRANSIT_TO_RC</SelectItem>
                    <SelectItem value="IN_REPAIR">IN_REPAIR</SelectItem>
                    <SelectItem value="IN_TRANSIT_TO_PENGELOLA">IN_TRANSIT_TO_PENGELOLA</SelectItem>
                    <SelectItem value="SCRAPPED">SCRAPPED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCassetteDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCassette} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kaset?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-2">
                  Apakah Anda yakin ingin menghapus kaset ini?
                </p>
                {cassetteToDelete && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                    <p className="text-sm font-medium">Serial Number: {cassetteToDelete.serialNumber}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bank: {cassetteToDelete.customerBank?.bankName || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {cassetteToDelete.status}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Peringatan: Kaset hanya dapat dihapus jika status SCRAPPED dan tidak memiliki active tickets.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCassette}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}

