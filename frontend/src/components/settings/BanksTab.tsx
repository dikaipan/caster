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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Building2, Search, Copy, Check, Loader2, ChevronLeft, ChevronRight, XCircle, Shield } from 'lucide-react';

interface BankCustomer {
  id: string;
  bankCode: string;
  bankName: string;
  status: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  warrantyStatus?: string;
  activeWarrantyTypes?: string[];
  _count?: {
    machines: number;
    cassettes: number;
  };
  pengelolaAssignments?: any[];
}

export default function BanksTab() {
  const { user, isAuthenticated, loadUser } = useAuthStore();
  const [banks, setBanks] = useState<BankCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWarrantyDialogOpen, setIsWarrantyDialogOpen] = useState(false);
  const [selectedBankCustomer, setSelectedBankCustomer] = useState<BankCustomer | null>(null);
  const [warrantyConfigs, setWarrantyConfigs] = useState<any[]>([]);
  const [loadingWarranty, setLoadingWarranty] = useState(false);
  const [formData, setFormData] = useState({
    bankCode: '',
    bankName: '',
    status: 'ACTIVE',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  });
  const [warrantyFormData, setWarrantyFormData] = useState<Record<string, any>>({
    MA: { isActive: false, warrantyPeriodDays: 90, maxWarrantyClaims: 2, unlimitedClaims: false, warrantyExtensionDays: 30, requiresApproval: false, autoApproveFirstClaim: true, freeRepairOnWarranty: true, notes: '' },
    MS: { isActive: false, warrantyPeriodDays: 60, maxWarrantyClaims: 1, unlimitedClaims: false, warrantyExtensionDays: 15, requiresApproval: true, autoApproveFirstClaim: true, freeRepairOnWarranty: false, notes: '' },
    IN_WARRANTY: { isActive: false, warrantyPeriodDays: 30, maxWarrantyClaims: 1, unlimitedClaims: false, warrantyExtensionDays: 0, requiresApproval: false, autoApproveFirstClaim: true, freeRepairOnWarranty: true, notes: '' },
    OUT_WARRANTY: { isActive: false, warrantyPeriodDays: 0, maxWarrantyClaims: 0, unlimitedClaims: false, warrantyExtensionDays: 0, requiresApproval: false, autoApproveFirstClaim: false, freeRepairOnWarranty: false, notes: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/bank-customers');
      setBanks(response.data);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
      fetchBanks();
    }
  }, [isAuthenticated, user]);

  // Copy to clipboard function
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Filter banks based on search term
  const filteredBanks = useMemo(() => {
    if (!searchTerm.trim()) return banks;
    const search = searchTerm.toLowerCase();
    return banks.filter(
      (bank) =>
        bank.bankName.toLowerCase().includes(search) ||
        bank.bankCode.toLowerCase().includes(search) ||
        bank.primaryContactName?.toLowerCase().includes(search) ||
        bank.primaryContactEmail?.toLowerCase().includes(search)
    );
  }, [banks, searchTerm]);

  const totalPages = Math.ceil(filteredBanks.length / itemsPerPage);
  const paginatedBanks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBanks.slice(start, start + itemsPerPage);
  }, [filteredBanks, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      // Create bank customer first
      const response = await api.post('/bank-customers', formData);
      const newBankId = response.data.id;

      // Create warranty configurations if any are active
      const warrantyPromises = Object.entries(warrantyFormData)
        .filter(([_, config]) => config.isActive)
        .map(([warrantyType, config]) => {
          // Validate maxWarrantyClaims
          if (config.maxWarrantyClaims > 10) {
            throw new Error(`maxWarrantyClaims untuk ${warrantyType} tidak boleh lebih dari 10`);
          }
          
          // Prepare payload without isActive (backend will set it to true automatically)
          const { isActive, ...warrantyPayload } = config;
          return api.post(`/warranty/config/${newBankId}`, {
            warrantyType,
            ...warrantyPayload,
            isActive: true, // Always set to true when creating
          });
        });

      if (warrantyPromises.length > 0) {
        await Promise.all(warrantyPromises);
      }

      setIsCreateDialogOpen(false);
      resetForm();
      fetchBanks();
      alert('✅ Bank customer created successfully with warranty configurations!');
    } catch (error: any) {
      console.error('Error creating bank customer:', error);
      alert(error.response?.data?.message || 'Failed to create bank customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBankCustomer) return;
    setSubmitting(true);
    try {
      await api.patch(`/bank-customers/${selectedBankCustomer.id}`, formData);
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedBankCustomer(null);
      fetchBanks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update bank customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBankCustomer) return;
    setSubmitting(true);
    try {
      await api.delete(`/bank-customers/${selectedBankCustomer.id}`);
      setIsDeleteDialogOpen(false);
      setSelectedBankCustomer(null);
      fetchBanks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete bank customer');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bankCode: '',
      bankName: '',
      status: 'ACTIVE',
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactPhone: '',
    });
    setWarrantyFormData({
      MA: { isActive: false, warrantyPeriodDays: 90, maxWarrantyClaims: 2, unlimitedClaims: false, warrantyExtensionDays: 30, requiresApproval: false, autoApproveFirstClaim: true, freeRepairOnWarranty: true, notes: '' },
      MS: { isActive: false, warrantyPeriodDays: 60, maxWarrantyClaims: 1, unlimitedClaims: false, warrantyExtensionDays: 15, requiresApproval: true, autoApproveFirstClaim: true, freeRepairOnWarranty: false, notes: '' },
      IN_WARRANTY: { isActive: false, warrantyPeriodDays: 30, maxWarrantyClaims: 1, unlimitedClaims: false, warrantyExtensionDays: 0, requiresApproval: false, autoApproveFirstClaim: true, freeRepairOnWarranty: true, notes: '' },
      OUT_WARRANTY: { isActive: false, warrantyPeriodDays: 0, maxWarrantyClaims: 0, unlimitedClaims: false, warrantyExtensionDays: 0, requiresApproval: false, autoApproveFirstClaim: false, freeRepairOnWarranty: false, notes: '' },
    });
  };

  const fetchWarrantyConfigs = async (customerBankId: string) => {
    setLoadingWarranty(true);
    try {
      const response = await api.get(`/warranty/config/${customerBankId}`);
      setWarrantyConfigs(response.data);
    } catch (error) {
      console.error('Error fetching warranty configs:', error);
      setWarrantyConfigs([]);
    } finally {
      setLoadingWarranty(false);
    }
  };

  const handleSaveWarrantyConfig = async (warrantyType: string, config: any) => {
    if (!selectedBankCustomer) return;
    
    // Validate maxWarrantyClaims
    if (config.maxWarrantyClaims > 10) {
      alert('❌ Max Warranty Claims tidak boleh lebih dari 10');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post(`/warranty/config/${selectedBankCustomer.id}`, {
        warrantyType,
        ...config,
      });
      // Refresh warranty configs after save to show updated values
      await fetchWarrantyConfigs(selectedBankCustomer.id);
      // Refresh banks list to update warranty status in table
      await fetchBanks();
      alert(`✅ Warranty configuration for ${warrantyType} saved successfully!`);
    } catch (error: any) {
      console.error('Error saving warranty config:', error);
      alert(`❌ ${error.response?.data?.message || 'Failed to save warranty configuration'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (bankCustomer: BankCustomer) => {
    setSelectedBankCustomer(bankCustomer);
    setFormData({
      bankCode: bankCustomer.bankCode,
      bankName: bankCustomer.bankName,
      status: bankCustomer.status,
      primaryContactName: bankCustomer.primaryContactName || '',
      primaryContactEmail: bankCustomer.primaryContactEmail || '',
      primaryContactPhone: bankCustomer.primaryContactPhone || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (bankCustomer: BankCustomer) => {
    setSelectedBankCustomer(bankCustomer);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-teal-400" />
        <p className="text-muted-foreground">Loading banks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by bank name, code, contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-96"
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
              <Building2 className="h-5 w-5 text-primary" />
              <span>Daftar Banks</span>
              <Badge variant="secondary" className="ml-2">
                {filteredBanks.length} banks
              </Badge>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <DialogHeader>
                  <DialogTitle>Create Bank Customer</DialogTitle>
                  <DialogDescription>
                    Add a new bank customer to the system
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="bank-info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bank-info">Bank Information</TabsTrigger>
                    <TabsTrigger value="warranty">Warranty Configuration</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bank-info" className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankCode">Bank Code *</Label>
                          <Input
                            id="bankCode"
                            value={formData.bankCode}
                            onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                            placeholder="e.g., BNI"
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
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input
                          id="bankName"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="e.g., PT Bank Negara Indonesia (Persero) Tbk"
                          maxLength={255}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactName">Contact Name</Label>
                          <Input
                            id="primaryContactName"
                            value={formData.primaryContactName}
                            onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                            placeholder="John Doe"
                            maxLength={255}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactEmail">Contact Email</Label>
                          <Input
                            id="primaryContactEmail"
                            type="email"
                            value={formData.primaryContactEmail}
                            onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                            placeholder="contact@bank.co.id"
                            maxLength={255}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactPhone">Contact Phone</Label>
                          <Input
                            id="primaryContactPhone"
                            value={formData.primaryContactPhone}
                            onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                            placeholder="+6281234567890"
                            maxLength={50}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="warranty" className="space-y-4">
                    <div className="py-4 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                        Configure warranty settings for this bank. Only active configurations will be created.
                      </p>
                      {(['MA', 'MS', 'IN_WARRANTY'] as const).map((warrantyType) => (
                        <WarrantyConfigFormCard
                          key={warrantyType}
                          warrantyType={warrantyType}
                          formData={warrantyFormData[warrantyType]}
                          onChange={(data) => setWarrantyFormData({ ...warrantyFormData, [warrantyType]: data })}
                        />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
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
          {filteredBanks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Building2 className="h-16 w-16 text-gray-300 dark:text-slate-700 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm ? 'Tidak ada bank yang ditemukan' : 'Belum ada bank customer'}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 text-center max-w-md">
                {searchTerm
                  ? `Coba ubah kata kunci pencarian atau hapus filter untuk melihat semua bank.`
                  : 'Mulai dengan menambahkan bank customer pertama Anda.'}
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
                  Add First Bank Customer
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
                        Bank Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Bank Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Warranty Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Machines
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Cassettes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Pengelola
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedBanks.map((bank, index) => (
                      <tr
                        key={bank.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 group">
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {bank.bankName}
                            </span>
                            <button
                              onClick={() => copyToClipboard(bank.bankName, `name-${bank.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                              title="Copy bank name"
                            >
                              {copiedId === `name-${bank.id}` ? (
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
                              {bank.bankCode}
                            </span>
                            <button
                              onClick={() => copyToClipboard(bank.bankCode, `code-${bank.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                              title="Copy bank code"
                            >
                              {copiedId === `code-${bank.id}` ? (
                                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            variant={bank.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={
                              bank.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : bank.status === 'SUSPENDED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }
                          >
                            {bank.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {bank.warrantyStatus && bank.warrantyStatus !== 'No Warranty' ? (
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                              >
                                {bank.warrantyStatus}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-slate-500">No Warranty</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          {bank._count?.machines || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          {bank._count?.cassettes || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                          {bank.pengelolaAssignments && bank.pengelolaAssignments.length > 0
                            ? `${bank.pengelolaAssignments.length} pengelola`
                            : 'No pengelola'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-slate-100">
                            {bank.primaryContactName && (
                              <div className="font-medium">{bank.primaryContactName}</div>
                            )}
                            {bank.primaryContactEmail && (
                              <div className="text-xs text-gray-500 dark:text-slate-400">{bank.primaryContactEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBankCustomer(bank);
                                setIsWarrantyDialogOpen(true);
                                fetchWarrantyConfigs(bank.id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400"
                              title="Manage Warranty"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(bank)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-teal-400"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(bank)}
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
                      {Math.min(currentPage * itemsPerPage, filteredBanks.length)}
                    </span>{' '}
                    dari <span className="font-medium">{filteredBanks.length}</span> bank
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          <DialogHeader>
            <DialogTitle>Edit Bank Customer</DialogTitle>
            <DialogDescription>
              Update bank customer information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bankCode">Bank Code *</Label>
                <Input
                  id="edit-bankCode"
                  value={formData.bankCode}
                  onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                  placeholder="e.g., BNI"
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
              <Label htmlFor="edit-bankName">Bank Name *</Label>
              <Input
                id="edit-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g., PT Bank Negara Indonesia (Persero) Tbk"
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-primaryContactName">Contact Name</Label>
                <Input
                  id="edit-primaryContactName"
                  value={formData.primaryContactName}
                  onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                  placeholder="John Doe"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-primaryContactEmail">Contact Email</Label>
                <Input
                  id="edit-primaryContactEmail"
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                  placeholder="contact@bank.co.id"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-primaryContactPhone">Contact Phone</Label>
                <Input
                  id="edit-primaryContactPhone"
                  value={formData.primaryContactPhone}
                  onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                  placeholder="+6281234567890"
                  maxLength={50}
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

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete bank customer &quot;{selectedBankCustomer?.bankName}&quot;. This action cannot be undone.
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

      {/* Warranty Configuration Dialog */}
      <Dialog open={isWarrantyDialogOpen} onOpenChange={setIsWarrantyDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Warranty Configuration</DialogTitle>
            <DialogDescription>
              Configure warranty settings for {selectedBankCustomer?.bankName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {loadingWarranty ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : warrantyConfigs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-gray-400 dark:text-slate-600 mb-4" />
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No warranty configurations found. Click on a warranty type below to configure.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {warrantyConfigs.map((config) => (
                  <WarrantyConfigCard
                    key={config.warrantyType}
                    config={config}
                    onSave={(data) => handleSaveWarrantyConfig(config.warrantyType, data)}
                    submitting={submitting}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsWarrantyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Warranty Config Card Component
function WarrantyConfigCard({ config, onSave, submitting }: { 
  config: any; 
  onSave: (data: any) => void;
  submitting: boolean;
}) {
  // Helper function to get default values
  const getDefaultValues = () => ({
    warrantyPeriodDays: config.warrantyPeriodDays ?? (config.warrantyType === 'MA' ? 90 : config.warrantyType === 'MS' ? 60 : config.warrantyType === 'IN_WARRANTY' ? 30 : 0),
    maxWarrantyClaims: config.maxWarrantyClaims ?? 1,
    unlimitedClaims: config.unlimitedClaims ?? false,
    warrantyExtensionDays: config.warrantyExtensionDays ?? 0,
    requiresApproval: config.requiresApproval ?? false,
    autoApproveFirstClaim: config.autoApproveFirstClaim ?? true,
    freeRepairOnWarranty: config.freeRepairOnWarranty ?? (config.warrantyType !== 'MS' && config.warrantyType !== 'OUT_WARRANTY'),
    notes: config.notes || '',
    isActive: config.isActive ?? (config.id !== null), // Active if config exists in DB
  });

  const [formData, setFormData] = useState(getDefaultValues());

  // Update form data when config changes (e.g., after save or when dialog reopens)
  useEffect(() => {
    setFormData(getDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.warrantyPeriodDays, config.maxWarrantyClaims, config.unlimitedClaims, config.warrantyExtensionDays, config.requiresApproval, config.autoApproveFirstClaim, config.freeRepairOnWarranty, config.notes, config.isActive, config.id]);

  const warrantyTypeLabels: Record<string, string> = {
    MA: 'Maintenance Agreement',
    MS: 'Manage Service',
    IN_WARRANTY: 'In Warranty',
    OUT_WARRANTY: 'Out Warranty',
  };

  const warrantyTypeColors: Record<string, string> = {
    MA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    MS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    IN_WARRANTY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    OUT_WARRANTY: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={warrantyTypeColors[config.warrantyType]}>
              {config.warrantyType}
            </Badge>
            <CardTitle className="text-lg">{warrantyTypeLabels[config.warrantyType]}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Active</Label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`period-${config.warrantyType}`}>Warranty Period (Days)</Label>
            <Input
              id={`period-${config.warrantyType}`}
              type="number"
              min="0"
              max="365"
              value={formData.warrantyPeriodDays}
              onChange={(e) => setFormData({ ...formData, warrantyPeriodDays: parseInt(e.target.value) || 0 })}
              disabled={config.warrantyType === 'OUT_WARRANTY'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`max-claims-${config.warrantyType}`}>
              Max Claims {formData.unlimitedClaims && '(Unlimited)'}
            </Label>
            <Input
              id={`max-claims-${config.warrantyType}`}
              type="number"
              min="0"
              max="10"
              value={formData.maxWarrantyClaims}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                const clampedValue = Math.min(Math.max(0, value), 10); // Clamp between 0 and 10
                setFormData({ ...formData, maxWarrantyClaims: clampedValue });
              }}
              disabled={config.warrantyType === 'OUT_WARRANTY' || formData.unlimitedClaims}
              placeholder={formData.unlimitedClaims ? 'Unlimited' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`extension-${config.warrantyType}`}>Extension Days (per claim)</Label>
            <Input
              id={`extension-${config.warrantyType}`}
              type="number"
              min="0"
              max="365"
              value={formData.warrantyExtensionDays}
              onChange={(e) => setFormData({ ...formData, warrantyExtensionDays: parseInt(e.target.value) || 0 })}
              disabled={config.warrantyType === 'OUT_WARRANTY'}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id={`unlimited-claims-${config.warrantyType}`}
            checked={formData.unlimitedClaims}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                unlimitedClaims: e.target.checked,
                maxWarrantyClaims: e.target.checked ? 0 : formData.maxWarrantyClaims || 1
              });
            }}
            className="h-4 w-4 rounded border-gray-300"
            disabled={config.warrantyType === 'OUT_WARRANTY'}
          />
          <Label htmlFor={`unlimited-claims-${config.warrantyType}`} className="cursor-pointer font-medium">
            Unlimited Claims (selama warranty aktif)
          </Label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`requires-approval-${config.warrantyType}`}
              checked={formData.requiresApproval}
              onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={config.warrantyType === 'OUT_WARRANTY'}
            />
            <Label htmlFor={`requires-approval-${config.warrantyType}`} className="cursor-pointer">
              Requires Approval
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`auto-approve-${config.warrantyType}`}
              checked={formData.autoApproveFirstClaim}
              onChange={(e) => setFormData({ ...formData, autoApproveFirstClaim: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={config.warrantyType === 'OUT_WARRANTY'}
            />
            <Label htmlFor={`auto-approve-${config.warrantyType}`} className="cursor-pointer">
              Auto Approve First Claim
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`free-repair-${config.warrantyType}`}
              checked={formData.freeRepairOnWarranty}
              onChange={(e) => setFormData({ ...formData, freeRepairOnWarranty: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={config.warrantyType === 'OUT_WARRANTY'}
            />
            <Label htmlFor={`free-repair-${config.warrantyType}`} className="cursor-pointer">
              Free Repair on Warranty
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${config.warrantyType}`}>Notes</Label>
          <Input
            id={`notes-${config.warrantyType}`}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
          />
        </div>

        <Button
          onClick={() => onSave(formData)}
          disabled={submitting || config.warrantyType === 'OUT_WARRANTY'}
          className="w-full"
        >
          {submitting ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Warranty Config Form Card for Create Dialog
function WarrantyConfigFormCard({ 
  warrantyType, 
  formData, 
  onChange 
}: { 
  warrantyType: 'MA' | 'MS' | 'IN_WARRANTY';
  formData: any;
  onChange: (data: any) => void;
}) {
  const warrantyTypeLabels: Record<string, string> = {
    MA: 'Maintenance Agreement',
    MS: 'Manage Service',
    IN_WARRANTY: 'In Warranty',
  };

  const warrantyTypeColors: Record<string, string> = {
    MA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    MS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    IN_WARRANTY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={warrantyTypeColors[warrantyType]}>
              {warrantyType}
            </Badge>
            <CardTitle className="text-base">{warrantyTypeLabels[warrantyType]}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enable</Label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
        </div>
      </CardHeader>
      {formData.isActive && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`create-period-${warrantyType}`}>Warranty Period (Days)</Label>
              <Input
                id={`create-period-${warrantyType}`}
                type="number"
                min="0"
                max="365"
                value={formData.warrantyPeriodDays}
                onChange={(e) => onChange({ ...formData, warrantyPeriodDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`create-max-claims-${warrantyType}`}>
                Max Claims {formData.unlimitedClaims && '(Unlimited)'}
              </Label>
              <Input
                id={`create-max-claims-${warrantyType}`}
                type="number"
                min="0"
                max="10"
                value={formData.maxWarrantyClaims}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const clampedValue = Math.min(Math.max(0, value), 10); // Clamp between 0 and 10
                  onChange({ ...formData, maxWarrantyClaims: clampedValue });
                }}
                disabled={formData.unlimitedClaims}
                placeholder={formData.unlimitedClaims ? 'Unlimited' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`create-extension-${warrantyType}`}>Extension Days (per claim)</Label>
              <Input
                id={`create-extension-${warrantyType}`}
                type="number"
                min="0"
                max="365"
                value={formData.warrantyExtensionDays}
                onChange={(e) => onChange({ ...formData, warrantyExtensionDays: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id={`create-unlimited-claims-${warrantyType}`}
              checked={formData.unlimitedClaims || false}
              onChange={(e) => {
                onChange({ 
                  ...formData, 
                  unlimitedClaims: e.target.checked,
                  maxWarrantyClaims: e.target.checked ? 0 : (formData.maxWarrantyClaims || 1)
                });
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={`create-unlimited-claims-${warrantyType}`} className="cursor-pointer font-medium">
              Unlimited Claims (selama warranty aktif)
            </Label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`create-requires-approval-${warrantyType}`}
                checked={formData.requiresApproval}
                onChange={(e) => onChange({ ...formData, requiresApproval: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`create-requires-approval-${warrantyType}`} className="cursor-pointer text-sm">
                Requires Approval
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`create-auto-approve-${warrantyType}`}
                checked={formData.autoApproveFirstClaim}
                onChange={(e) => onChange({ ...formData, autoApproveFirstClaim: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`create-auto-approve-${warrantyType}`} className="cursor-pointer text-sm">
                Auto Approve First Claim
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`create-free-repair-${warrantyType}`}
                checked={formData.freeRepairOnWarranty}
                onChange={(e) => onChange({ ...formData, freeRepairOnWarranty: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`create-free-repair-${warrantyType}`} className="cursor-pointer text-sm">
                Free Repair on Warranty
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`create-notes-${warrantyType}`}>Notes</Label>
            <Input
              id={`create-notes-${warrantyType}`}
              value={formData.notes}
              onChange={(e) => onChange({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
