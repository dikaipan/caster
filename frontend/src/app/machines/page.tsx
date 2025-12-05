'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Monitor, 
  Disc, 
  X, 
  Loader2, 
  Package, 
  Plus, 
  Edit,
  RefreshCw,
  Download,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Wrench,
  Power,
  XCircle,
  Activity,
  Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import AddMachineDialog from '@/components/machines/AddMachineDialog';
import EditMachineDialog from '@/components/machines/EditMachineDialog';

export default function MachinesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('serialNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Cassettes Dialog State
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [cassettes, setCassettes] = useState<any[]>([]);
  const [cassetteDialogOpen, setCassetteDialogOpen] = useState(false);
  const [loadingCassettes, setLoadingCassettes] = useState(false);
  const [addMachineDialogOpen, setAddMachineDialogOpen] = useState(false);
  const [editMachineDialogOpen, setEditMachineDialogOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Reset to page 1 when search term, itemsPerPage, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, selectedStatus]);

  const fetchMachines = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        params: {
          page: currentPage,
          limit: itemsPerPage,
        },
      };
      
      if (searchTerm.trim()) {
        params.params.search = searchTerm.trim();
      }
      
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.params.status = selectedStatus;
      }
      
      if (sortField) {
        params.params.sortBy = sortField;
        params.params.sortOrder = sortDirection;
      }
      
      const response = await api.get('/machines', params);
      
      // Handle both old format (array) and new format (object with data & pagination)
      if (Array.isArray(response.data)) {
        // Old format - backward compatibility
        setMachines(response.data);
        setTotal(response.data.length);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      } else {
        // New format with pagination
        setMachines(response.data?.data || []);
        setTotal(response.data?.pagination?.total || 0);
        setTotalPages(response.data?.pagination?.totalPages || 0);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      setMachines([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedStatus, sortField, sortDirection]);

  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchMachines();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, searchTerm, currentPage, itemsPerPage, selectedStatus, fetchMachines]);

  // Fetch cassettes for selected machine
  const fetchCassettes = async (machine: any) => {
    console.log('🔍 Fetching cassettes for machine:', machine.serialNumberManufacturer, 'ID:', machine.id);
    setSelectedMachine(machine);
    setCassetteDialogOpen(true);
    setLoadingCassettes(true);
    
    try {
      // Fetch cassettes for this specific machine using dedicated endpoint
      const response = await api.get(`/cassettes/by-machine/${machine.id}`);
      
      console.log('📦 API Response:', response.data);
      
      // Backend returns { cassettes: [...], count: 10, machine: {...} }
      const cassetteData = response.data?.cassettes || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      
      console.log('📊 Cassette data:', cassetteData);
      console.log('📊 Total cassettes found:', cassetteData.length);
      
      // Sort cassettes: MAIN first, then BACKUP
      const sortedCassettes = cassetteData.sort((a: any, b: any) => {
        if (a.usageType === 'MAIN' && b.usageType === 'BACKUP') return -1;
        if (a.usageType === 'BACKUP' && b.usageType === 'MAIN') return 1;
        return 0;
      });
      
      console.log('✅ Sorted cassettes:', sortedCassettes);
      setCassettes(sortedCassettes);
    } catch (error) {
      console.error('❌ Error fetching cassettes:', error);
      setCassettes([]);
    } finally {
      setLoadingCassettes(false);
    }
  };

  const handleCloseCassetteDialog = () => {
    setCassetteDialogOpen(false);
    setSelectedMachine(null);
    setCassettes([]);
  };

  const handleDeleteMachine = async () => {
    if (!machineToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/machines/${machineToDelete.id}`);
      
      toast({
        title: 'Berhasil',
        description: `Mesin ${machineToDelete.machineCode || machineToDelete.serialNumberManufacturer} berhasil dihapus.`,
      });

      setDeleteDialogOpen(false);
      setMachineToDelete(null);
      fetchMachines();
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      
      // Extract error message from response
      let errorMessage = 'Gagal menghapus mesin. Silakan coba lagi.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error in toast
      toast({
        title: 'Error - Tidak Dapat Menghapus Mesin',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000, // Show longer for important errors
      });
      
      // Also show alert for critical errors
      if (error.response?.status === 400) {
        // Don't close dialog on validation error, let user see the message
        // Dialog will stay open so user can read the error
      } else {
        // Close dialog for other errors
        setDeleteDialogOpen(false);
        setMachineToDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading machines...</p>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Role-based permissions
  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canAddEdit = isHitachi && (isSuperAdmin || user?.role === 'RC_MANAGER');
  const canDelete = isHitachi && isSuperAdmin;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'MAINTENANCE':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'UNDER_REPAIR':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'DECOMMISSIONED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return <CheckCircle className="h-4 w-4" />;
      case 'MAINTENANCE':
        return <Wrench className="h-4 w-4" />;
      case 'UNDER_REPAIR':
        return <AlertCircle className="h-4 w-4" />;
      case 'DECOMMISSIONED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'OPERATIONAL': 'Operasional',
      'MAINTENANCE': 'Maintenance',
      'UNDER_REPAIR': 'Dalam Perbaikan',
      'DECOMMISSIONED': 'Tidak Aktif',
    };
    return labels[status] || status;
  };

  const exportToCSV = () => {
    const headers = ['Serial Number', 'Machine Code', 'Model', 'Bank', 'Pengelola', 'Branch', 'City', 'Location', 'Cassettes'];
    const csvData = machines.map(m => [
      m.serialNumberManufacturer || 'N/A',
      m.machineCode || 'N/A',
      m.modelName || 'N/A',
      m.customerBank?.bankName || 'N/A',
      m.pengelola?.companyName || 'N/A',
      m.branchCode || 'N/A',
      m.city || 'N/A',
      (m.physicalLocation || 'N/A').replace(/"/g, '""'),
      m.cassetteCount ?? m.cassettes?.length ?? 0
    ]);
    
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
    a.download = `machines-${userType}-${dateStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Sort machines
  const sortedMachines = [...machines].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortField) {
      case 'serialNumber':
        aVal = a.serialNumberManufacturer || '';
        bVal = b.serialNumberManufacturer || '';
        break;
      case 'machineCode':
        aVal = a.machineCode || '';
        bVal = b.machineCode || '';
        break;
      case 'model':
        aVal = a.modelName || '';
        bVal = b.modelName || '';
        break;
      case 'bank':
        aVal = a.customerBank?.bankName || '';
        bVal = b.customerBank?.bankName || '';
        break;
      default:
        aVal = a.serialNumberManufacturer || '';
        bVal = b.serialNumberManufacturer || '';
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Machines are already paginated from backend
  const paginatedMachines = sortedMachines;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, total);

  return (
    <PageLayout>
      {/* Header */}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari serial number, machine code, atau branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per halaman:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Active Filters */}
            {searchTerm && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filter aktif:</span>
                <Badge 
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200"
                  onClick={() => setSearchTerm('')}
                >
                  Pencarian: &quot;{searchTerm}&quot;
                  <XCircle className="h-3 w-3 ml-1" />
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="h-6 text-xs"
                >
                  Hapus filter
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
                <Monitor className="h-5 w-5 text-primary" />
                <span>Daftar Mesin</span>
                <Badge variant="secondary" className="ml-2">
                  {total} mesin
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
                onClick={fetchMachines}
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
                disabled={machines.length === 0}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              {canAddEdit && (
                <Button
                  size="sm"
                  onClick={() => setAddMachineDialogOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Machine</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Memuat data mesin...</p>
            </div>
          ) : paginatedMachines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Monitor className="h-16 w-16 text-gray-300 dark:text-slate-700" />
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {searchTerm ? 'Tidak ada mesin yang cocok' : 'Tidak ada data mesin'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Belum ada mesin yang terdaftar dalam sistem'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80 dark:bg-slate-700/50 dark:border-slate-700">
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('serialNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Serial Number
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('machineCode')}
                      >
                        <div className="flex items-center gap-2">
                          Machine Code
                          <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-slate-300"
                        onClick={() => handleSort('model')}
                      >
                        <div className="flex items-center gap-2">
                          Model
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
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">Pengelola</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">Branch</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">Location</th>
                      <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">Kaset</th>
                      {(canAddEdit || canDelete) && (
                        <th className="text-left p-4 font-semibold text-gray-700 dark:text-slate-300">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMachines.map((machine, index) => (
                      <tr
                        key={machine.id}
                        className={`border-b hover:bg-red-50/30 dark:hover:bg-slate-700/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="p-4">
                          <div 
                            className="font-mono font-medium text-[#2563EB] dark:text-teal-400 hover:text-[#1E40AF] dark:hover:text-teal-300 cursor-pointer hover:underline flex items-center gap-2 group"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchCassettes(machine);
                            }}
                            title="Klik untuk melihat kaset"
                          >
                            <Disc className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {machine.serialNumberManufacturer || 'N/A'}
                          </div>
                          {machine.currentWsid && (
                            <div className="text-xs text-muted-foreground mt-1">
                              WSID: <span className="font-mono">{machine.currentWsid}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm text-gray-900 dark:text-slate-100">{machine.machineCode || 'N/A'}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{machine.modelName || 'N/A'}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-gray-900 dark:text-slate-100">{machine.customerBank?.bankName || 'N/A'}</span>
                            {machine.customerBank?.bankCode && (
                              <span className="text-xs text-muted-foreground">
                                {machine.customerBank.bankCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900 dark:text-slate-100">{machine.pengelola?.companyName || 'N/A'}</span>
                            {machine.pengelola?.pengelolaCode && (
                              <span className="text-xs text-muted-foreground">
                                {machine.pengelola.pengelolaCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-gray-900 dark:text-slate-100">{machine.branchCode || '-'}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{machine.city || 'N/A'}</div>
                          {machine.physicalLocation && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={machine.physicalLocation}>
                              {machine.physicalLocation}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="secondary"
                            className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchCassettes(machine);
                            }}
                            title="Klik untuk melihat detail kaset"
                          >
                            <Disc className="h-3 w-3 mr-1" />
                            {machine.cassetteCount ?? machine.cassettes?.length ?? 0}
                          </Badge>
                        </td>
                        {(canAddEdit || canDelete) && (
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {canAddEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMachineToEdit(machine);
                                    setEditMachineDialogOpen(true);
                                  }}
                                  className="h-8 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#2563EB] dark:hover:text-teal-400 hover:border-blue-300 dark:hover:border-teal-600"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMachineToDelete(machine);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-8 px-3 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 gap-4">
                  <div className="text-sm text-muted-foreground order-2 sm:order-1">
                    Menampilkan <span className="font-medium text-gray-900 dark:text-slate-100">{startIndex + 1}</span> sampai{' '}
                    <span className="font-medium text-gray-900 dark:text-slate-100">{endIndex}</span> dari{' '}
                    <span className="font-medium text-gray-900 dark:text-slate-100">{total}</span> mesin
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
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
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

      {/* Cassettes Dialog */}
      <Dialog open={cassetteDialogOpen} onOpenChange={handleCloseCassetteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-primary dark:text-teal-400" />
              Cassettes for Machine
            </DialogTitle>
          </DialogHeader>

          {/* Machine Info - Outside DialogDescription to avoid nesting issues */}
          {selectedMachine && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-blue-200/50 dark:border-slate-700">
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Serial Number</p>
                <p className="font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {selectedMachine.serialNumberManufacturer}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Machine Code</p>
                <p className="font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {selectedMachine.machineCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Bank</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {selectedMachine.customerBank?.bankName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {selectedMachine.city || 'N/A'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6">
            {loadingCassettes ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-teal-400 mb-4" />
                <p className="text-gray-600 dark:text-slate-400">Loading cassettes...</p>
              </div>
            ) : cassettes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <Disc className="h-16 w-16 text-gray-300 dark:text-slate-700 mb-4" />
                <p className="text-gray-600 dark:text-slate-400 text-lg font-medium">No cassettes found</p>
                <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">This machine has no cassettes assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Total Cassettes: <span className="text-primary dark:text-teal-400">{cassettes.length}</span>
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400"></span>
                      MAIN: <strong className="text-gray-900 dark:text-slate-100">{cassettes.filter(c => c.usageType === 'MAIN').length}</strong>
                    </span>
                    <span className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-full bg-rose-500 dark:bg-rose-400"></span>
                      BACKUP: <strong className="text-gray-900 dark:text-slate-100">{cassettes.filter(c => c.usageType === 'BACKUP').length}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cassettes.map((cassette, index) => (
                    <div
                      key={cassette.id}
                      className={`relative p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg animate-fade-in ${
                        cassette.usageType === 'MAIN'
                          ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:border-green-400 dark:hover:border-green-700'
                          : 'border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 hover:border-rose-400 dark:hover:border-rose-700'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Badge */}
                      <div className="absolute -top-2 -right-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                            cassette.usageType === 'MAIN'
                              ? 'bg-green-500 dark:bg-green-600 text-white'
                              : 'bg-rose-500 dark:bg-rose-600 text-white'
                          }`}
                        >
                          #{index + 1} {cassette.usageType}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="space-y-2 mt-2">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Serial Number</p>
                          <p className="font-mono text-sm font-bold text-gray-900 dark:text-slate-100">
                            {cassette.serialNumber}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Type</p>
                            <span className="inline-block px-2 py-1 rounded-md bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                              {cassette.cassetteType?.typeCode || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Status</p>
                            <span
                              className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                                cassette.status === 'OK'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : cassette.status === 'BAD'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              }`}
                            >
                              {cassette.status}
                            </span>
                          </div>
                        </div>

                        {cassette.notes && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Notes</p>
                            <p className="text-xs text-gray-700 dark:text-slate-300 italic">{cassette.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleCloseCassetteDialog} variant="outline" className="min-w-[100px]">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Machine Dialog */}
      <AddMachineDialog
        open={addMachineDialogOpen}
        onOpenChange={setAddMachineDialogOpen}
        onSuccess={() => {
          // Reload machines list after successful creation
          window.location.reload();
        }}
      />

      {/* Edit Machine Dialog */}
      <EditMachineDialog
        open={editMachineDialogOpen}
        onOpenChange={setEditMachineDialogOpen}
        machine={machineToEdit}
        onSuccess={() => {
          // Reload machines list after successful update
          window.location.reload();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mesin?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Apakah Anda yakin ingin menghapus mesin{' '}
                  <strong>{machineToDelete?.machineCode || machineToDelete?.serialNumberManufacturer}</strong>?
                </p>
                <br />
                <p className="text-sm text-muted-foreground">
                  Tindakan ini tidak dapat dibatalkan. Mesin dan semua data terkait akan dihapus secara permanen.
                </p>
                {machineToDelete?.cassetteCount > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-red-700 dark:text-red-400 font-semibold text-sm">
                      ⚠️ Peringatan: Mesin ini memiliki {machineToDelete.cassetteCount} kaset yang terhubung.
                    </p>
                    <p className="text-red-600 dark:text-red-500 text-xs mt-1">
                      Mesin tidak dapat dihapus jika masih memiliki kaset aktif. Harap hapus atau scrap semua kaset terlebih dahulu.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMachine}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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

