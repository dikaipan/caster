'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Copy, Check, Loader2, ChevronLeft, ChevronRight, XCircle, Store } from 'lucide-react';

interface Pengelola {
  id: string;
  pengelolaCode: string;
  companyName: string;
  companyAbbreviation?: string;
  status: string;
  city?: string;
  _count?: {
    users: number;
    machines: number;
  };
  bankAssignments?: any[];
}

export default function VendorsTab() {
  const { user, isAuthenticated, loadUser } = useAuthStore();
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPengelola, setSelectedPengelola] = useState<Pengelola | null>(null);
  const [formData, setFormData] = useState({
    pengelolaCode: '',
    companyName: '',
    companyAbbreviation: '',
    status: 'ACTIVE',
    city: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPengelola = useCallback(async () => {
    try {
      const response = await api.get('/pengelola');
      setPengelola(response.data);
    } catch (error) {
      console.error('Error fetching pengelola:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
      fetchPengelola();
    }
  }, [isAuthenticated, user, fetchPengelola]);

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
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and paginate
  const filteredPengelola = useMemo(() => {
    if (!searchTerm) return pengelola;
    const search = searchTerm.toLowerCase();
    return pengelola.filter(
      (p) =>
        p.companyName?.toLowerCase().includes(search) ||
        p.pengelolaCode?.toLowerCase().includes(search) ||
        p.companyAbbreviation?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search)
    );
  }, [pengelola, searchTerm]);

  const paginatedPengelola = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPengelola.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPengelola, currentPage]);

  const totalPages = Math.ceil(filteredPengelola.length / itemsPerPage);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await api.post('/pengelola', formData);
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPengelola();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create pengelola');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPengelola) return;
    setSubmitting(true);
    try {
      await api.patch(`/pengelola/${selectedPengelola.id}`, formData);
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedPengelola(null);
      fetchPengelola();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update pengelola');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPengelola) return;
    setSubmitting(true);
    try {
      await api.delete(`/pengelola/${selectedPengelola.id}`);
      setIsDeleteDialogOpen(false);
      setSelectedPengelola(null);
      fetchPengelola();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete pengelola');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      pengelolaCode: '',
      companyName: '',
      companyAbbreviation: '',
      status: 'ACTIVE',
      city: '',
    });
  };

  const openEditDialog = (p: Pengelola) => {
    setSelectedPengelola(p);
    setFormData({
      pengelolaCode: p.pengelolaCode,
      companyName: p.companyName,
      companyAbbreviation: p.companyAbbreviation || '',
      status: p.status,
      city: p.city || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (p: Pengelola) => {
    setSelectedPengelola(p);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'SUSPENDED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-teal-400" />
        <p className="text-muted-foreground">Loading pengelola...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Cari pengelola name, code, city... (Tekan / untuk fokus)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700" onClick={() => setSearchTerm('')}>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span>Daftar Pengelola</span>
              <Badge variant="secondary" className="ml-2">
                {filteredPengelola.length} pengelola
              </Badge>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pengelola
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Pengelola</DialogTitle>
                  <DialogDescription>
                    Add a new pengelola to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pengelolaCode">Pengelola Code *</Label>
                      <Input
                        id="pengelolaCode"
                        value={formData.pengelolaCode}
                        onChange={(e) => setFormData({ ...formData, pengelolaCode: e.target.value })}
                        placeholder="e.g., PGL001"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g., PT Pengelola Indonesia"
                      maxLength={255}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyAbbreviation">Company Abbreviation</Label>
                      <Input
                        id="companyAbbreviation"
                        value={formData.companyAbbreviation}
                        onChange={(e) => setFormData({ ...formData, companyAbbreviation: e.target.value })}
                        placeholder="e.g., VND"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g., Jakarta"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPengelola.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Store className="h-16 w-16 text-gray-300 dark:text-slate-700 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm ? 'Tidak ada pengelola yang ditemukan' : 'Belum ada pengelola'}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 text-center max-w-md">
                {searchTerm
                  ? `Coba ubah kata kunci pencarian atau hapus filter untuk melihat semua pengelola.`
                  : 'Mulai dengan menambahkan pengelola pertama Anda.'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Pengelola
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-gray-50/95 dark:bg-slate-700/95 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Pengelola Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Abbreviation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Machines
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Banks
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedPengelola.map((p, index) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 group">
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {p.companyName}
                            </span>
                            <button
                              onClick={() => copyToClipboard(p.companyName, `name-${p.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                              title="Copy company name"
                            >
                              {copiedId === `name-${p.id}` ? (
                                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 group">
                            <span className="text-sm font-mono text-gray-900 dark:text-slate-100">
                              {p.pengelolaCode}
                            </span>
                            <button
                              onClick={() => copyToClipboard(p.pengelolaCode, `code-${p.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                              title="Copy pengelola code"
                            >
                              {copiedId === `code-${p.id}` ? (
                                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {p.companyAbbreviation || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={`${getStatusColor(p.status)} border`}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {p.city || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {p._count?.users || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {p._count?.machines || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {p.bankAssignments?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(p)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-teal-400"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(p)}
                              className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  <div className="text-sm text-gray-700 dark:text-slate-300">
                    Menampilkan{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    sampai{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredPengelola.length)}
                    </span>{' '}
                    dari <span className="font-medium">{filteredPengelola.length}</span> pengelola
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 min-w-[32px] ${
                              currentPage === pageNum
                                ? 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white'
                                : ''
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pengelola</DialogTitle>
            <DialogDescription>
              Update pengelola information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pengelolaCode">Pengelola Code *</Label>
                <Input
                  id="edit-pengelolaCode"
                  value={formData.pengelolaCode}
                  onChange={(e) => setFormData({ ...formData, pengelolaCode: e.target.value })}
                  placeholder="e.g., PGL001"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-companyName">Company Name *</Label>
              <Input
                id="edit-companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g., PT Pengelola Indonesia"
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-companyAbbreviation">Company Abbreviation</Label>
                <Input
                  id="edit-companyAbbreviation"
                  value={formData.companyAbbreviation}
                  onChange={(e) => setFormData({ ...formData, companyAbbreviation: e.target.value })}
                  placeholder="e.g., VND"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Jakarta"
                  maxLength={100}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pengelola &quot;{selectedPengelola?.companyName}&quot;. 
              This action cannot be undone. Make sure there are no associated users or machines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

