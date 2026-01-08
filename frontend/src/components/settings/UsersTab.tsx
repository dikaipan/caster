'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  isHitachiUser,
  isSuperAdmin,
  isPengelolaAdmin,
  canManageHitachiUsers,
  canManagePengelolaUsers
} from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  Building2,
  Truck,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Info,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function UsersTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Permission checks - using centralized permission utilities
  const isHitachi = isHitachiUser(user);
  const isSuperAdminUser = isSuperAdmin(user);
  const isPengelolaAdminUser = isPengelolaAdmin(user);
  const canManageHitachi = canManageHitachiUsers(user);
  const canManagePengelola = canManagePengelolaUsers(user);

  // Set default tab based on user type
  const getDefaultTab = useCallback(() => {
    if (canManageHitachi) return 'hitachi';
    if (canManagePengelola) return 'pengelola';
    return 'bank';
  }, [canManageHitachi, canManagePengelola]);

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [hitachiUsers, setHitachiUsers] = useState<any[]>([]);
  const [pengelola, setPengelola] = useState<any[]>([]);
  const [selectedPengelola, setSelectedPengelola] = useState<string>('');
  const [pengelolaUsers, setPengelolaUsers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [bankUsers, setBankUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: '',
    department: '',
    pengelolaId: '',
    customerBankId: '',
    phone: '',
    whatsappNumber: '',
    employeeId: '',
    canCreateTickets: true,
    canCloseTickets: false,
    canManageMachines: false,
    assignedBranches: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'hitachi') {
        // Only fetch if user has permission
        if (canManageHitachi) {
          try {
            const response = await api.get('/auth/hitachi-users');
            setHitachiUsers(response.data || []);
          } catch (error: any) {
            // If 403, user doesn't have permission - don't show error toast
            if (error.response?.status === 403) {
              console.log('User does not have permission to view Hitachi users');
              setHitachiUsers([]);
              return;
            }
            throw error;
          }
        } else {
          setHitachiUsers([]);
        }
      } else if (activeTab === 'pengelola') {
        // Only fetch if user has permission
        if (canManagePengelola) {
          try {
            const pengelolaResponse = await api.get('/pengelola');
            setPengelola(pengelolaResponse.data || []);
            if (pengelolaResponse.data && pengelolaResponse.data.length > 0 && !selectedPengelola) {
              setSelectedPengelola(pengelolaResponse.data[0].id);
            }
          } catch (error: any) {
            // If 403, user doesn't have permission - don't show error toast
            if (error.response?.status === 403) {
              console.log('User does not have permission to view Pengelola users');
              setPengelola([]);
              return;
            }
            throw error;
          }
        } else {
          setPengelola([]);
        }
      } else if (activeTab === 'bank') {
        // Bank users - check if user has permission (SUPER_ADMIN only)
        if (isSuperAdminUser) {
          try {
            const banksResponse = await api.get('/banks');
            const banksData = Array.isArray(banksResponse.data)
              ? banksResponse.data
              : (banksResponse.data?.data || banksResponse.data?.banks || []);
            setBanks(banksData);
            if (banksData.length > 0 && !selectedBank) {
              setSelectedBank(banksData[0].id);
            }
          } catch (error: any) {
            // If 403, user doesn't have permission - don't show error toast
            if (error.response?.status === 403) {
              console.log('User does not have permission to view Bank users');
              setBanks([]);
              return;
            }
            throw error;
          }
        } else {
          setBanks([]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // Only show toast for unexpected errors (not 403)
      if (error.response?.status !== 403) {
        toast({
          title: 'Error',
          description: 'Gagal memuat data pengguna',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedPengelola, selectedBank, toast, canManageHitachi, canManagePengelola, isSuperAdminUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ensure active tab is valid for current user permissions
  useEffect(() => {
    if (activeTab === 'hitachi' && !canManageHitachi) {
      setActiveTab(getDefaultTab());
    } else if (activeTab === 'pengelola' && !canManagePengelola) {
      setActiveTab(getDefaultTab());
    } else if (activeTab === 'bank' && !isSuperAdminUser) {
      setActiveTab(getDefaultTab());
    }
  }, [activeTab, canManageHitachi, canManagePengelola, isSuperAdminUser, getDefaultTab]);

  useEffect(() => {
    if (activeTab === 'pengelola' && selectedPengelola) {
      const fetchPengelolaUsers = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/pengelola/${selectedPengelola}/users`);
          setPengelolaUsers(response.data || []);
        } catch (error: any) {
          console.error('Error fetching pengelola users:', error);
          toast({
            title: 'Error',
            description: 'Gagal memuat data pengguna pengelola',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchPengelolaUsers();
    } else if (activeTab === 'bank' && selectedBank) {
      const fetchBankUsers = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/auth/bank-users?bankId=${selectedBank}`);
          setBankUsers(response.data || []);
        } catch (error: any) {
          console.error('Error fetching bank users:', error);
          toast({
            title: 'Error',
            description: 'Gagal memuat data pengguna bank',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchBankUsers();
    }
  }, [activeTab, selectedPengelola, selectedBank, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        if (activeTab === 'hitachi') {
          const updateData: any = {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            role: formData.role,
            department: formData.department,
          };
          if (formData.password) {
            updateData.password = formData.password;
          }
          await api.patch(`/auth/hitachi-users/${editingUser.id}`, updateData);
        } else if (activeTab === 'pengelola') {
          // Use selectedPengelola if formData.pengelolaId is empty
          const pengelolaId = formData.pengelolaId || selectedPengelola;
          if (!pengelolaId) {
            toast({
              title: 'Error',
              description: 'Pengelola ID tidak ditemukan. Silakan pilih pengelola terlebih dahulu.',
              variant: 'destructive',
            });
            setSubmitting(false);
            return;
          }
          const updateData: any = {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            role: formData.role,
            phone: formData.phone,
            whatsappNumber: formData.whatsappNumber,
            employeeId: formData.employeeId,
            canCreateTickets: formData.canCreateTickets,
            canCloseTickets: formData.canCloseTickets,
            canManageMachines: formData.canManageMachines,
            assignedBranches: formData.assignedBranches && formData.assignedBranches.trim() !== ''
              ? formData.assignedBranches.split(',').map((b: string) => b.trim()).filter((b: string) => b !== '')
              : undefined,
          };
          // Only include password if it's not empty
          if (formData.password && formData.password.trim() !== '') {
            updateData.password = formData.password;
          }
          await api.patch(`/pengelola/${pengelolaId}/users/${editingUser.id}`, updateData);
        } else if (activeTab === 'bank') {
          const updateData: any = {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            role: formData.role,
            phone: formData.phone,
          };
          // Only include password if it's not empty
          if (formData.password && formData.password.trim() !== '') {
            updateData.password = formData.password;
          }
          await api.patch(`/auth/bank-users/${editingUser.id}`, updateData);
        }
        toast({
          title: 'Berhasil',
          description: 'Pengguna berhasil diperbarui',
        });
      } else {
        // Create user
        if (activeTab === 'hitachi') {
          await api.post('/auth/hitachi-users', {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            role: formData.role,
            department: formData.department,
          });
        } else if (activeTab === 'pengelola') {
          if (!formData.pengelolaId) {
            toast({
              title: 'Error',
              description: 'Pilih pengelola terlebih dahulu',
              variant: 'destructive',
            });
            return;
          }
          await api.post(`/pengelola/${formData.pengelolaId}/users`, {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone,
            whatsappNumber: formData.whatsappNumber,
            employeeId: formData.employeeId,
            role: formData.role,
            canCreateTickets: formData.canCreateTickets,
            canCloseTickets: formData.canCloseTickets,
            canManageMachines: formData.canManageMachines,
            assignedBranches: formData.assignedBranches
              ? formData.assignedBranches.split(',').map((b: string) => b.trim())
              : undefined,
          });
        } else if (activeTab === 'bank') {
          if (!formData.customerBankId) {
            toast({
              title: 'Error',
              description: 'Pilih bank terlebih dahulu',
              variant: 'destructive',
            });
            return;
          }
          await api.post('/auth/bank-users', {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone,
            customerBankId: formData.customerBankId,
            role: formData.role || 'VIEWER',
          });
        }
        toast({
          title: 'Berhasil',
          description: 'Pengguna berhasil dibuat',
        });
      }

      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: '',
        department: '',
        pengelolaId: '',
        customerBankId: '',
        phone: '',
        whatsappNumber: '',
        employeeId: '',
        canCreateTickets: true,
        canCloseTickets: false,
        canManageMachines: false,
        assignedBranches: '',
      });
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal menyimpan pengguna',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      if (activeTab === 'hitachi') {
        await api.delete(`/auth/hitachi-users/${deletingUser.id}`);
      } else if (activeTab === 'pengelola') {
        // Use deletingUser.pengelolaId if available, otherwise use selectedPengelola
        const pengelolaId = deletingUser.pengelolaId || selectedPengelola;
        if (!pengelolaId) {
          toast({
            title: 'Error',
            description: 'Pengelola ID tidak ditemukan',
            variant: 'destructive',
          });
          return;
        }
        await api.delete(`/pengelola/${pengelolaId}/users/${deletingUser.id}`);
      } else if (activeTab === 'bank') {
        await api.delete(`/auth/bank-users/${deletingUser.id}`);
      }
      toast({
        title: 'Berhasil',
        description: 'Pengguna berhasil dihapus',
      });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal menghapus pengguna',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (userData: any) => {
    setEditingUser(userData);
    setFormData({
      username: userData.username || '',
      email: userData.email || '',
      password: '',
      fullName: userData.fullName || '',
      role: userData.role || '',
      department: userData.department || '',
      pengelolaId: activeTab === 'pengelola' ? selectedPengelola : (userData.pengelolaId || ''),
      customerBankId: activeTab === 'bank' ? (selectedBank || userData.customerBankId || '') : '',
      phone: userData.phone || '',
      whatsappNumber: userData.whatsappNumber || '',
      employeeId: userData.employeeId || '',
      canCreateTickets: userData.canCreateTickets ?? true,
      canCloseTickets: userData.canCloseTickets ?? false,
      canManageMachines: userData.canManageMachines ?? false,
      assignedBranches: Array.isArray(userData.assignedBranches)
        ? userData.assignedBranches.join(', ')
        : userData.assignedBranches || '',
    });
    setIsEditDialogOpen(true);
  };

  if (loading && (
    (activeTab === 'hitachi' && hitachiUsers.length === 0) ||
    (activeTab === 'pengelola' && pengelolaUsers.length === 0) ||
    (activeTab === 'bank' && bankUsers.length === 0)
  )) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate number of visible tabs for grid layout
  const visibleTabs = [
    canManageHitachi && 'hitachi',
    canManagePengelola && 'pengelola',
    isSuperAdminUser && 'bank'
  ].filter(Boolean).length;

  // Get grid class based on number of visible tabs
  const gridClass = visibleTabs === 1 ? 'grid-cols-1' : visibleTabs === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${gridClass}`}>
          {canManageHitachi && (
            <TabsTrigger value="hitachi" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Hitachi Users
            </TabsTrigger>
          )}
          {canManagePengelola && (
            <TabsTrigger value="pengelola" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Pengelola Users
            </TabsTrigger>
          )}
          {isSuperAdminUser && (
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Users
            </TabsTrigger>
          )}
        </TabsList>

        {/* Hitachi Users Tab */}
        {canManageHitachi && (
          <TabsContent value="hitachi" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Hitachi Users
                    </CardTitle>
                    <CardDescription>
                      Kelola pengguna internal Hitachi (RC Staff, RC Manager, Super Admin)
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingUser(null);
                        setFormData({
                          username: '',
                          email: '',
                          password: '',
                          fullName: '',
                          role: '',
                          department: '',
                          pengelolaId: '',
                          customerBankId: '',
                          phone: '',
                          whatsappNumber: '',
                          employeeId: '',
                          canCreateTickets: true,
                          canCloseTickets: false,
                          canManageMachines: false,
                          assignedBranches: '',
                        });
                      }}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      <DialogHeader>
                        <DialogTitle>Add Hitachi User</DialogTitle>
                        <DialogDescription>
                          Buat pengguna baru untuk tim Hitachi
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="username">Username *</Label>
                            <Input
                              id="username"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="password">Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="role">Role *</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({ ...formData, role: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                <SelectItem value="RC_MANAGER">RC Manager</SelectItem>
                                <SelectItem value="RC_STAFF">RC Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="department">Department *</Label>
                            <Select
                              value={formData.department}
                              onValueChange={(value) => setFormData({ ...formData, department: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="REPAIR_CENTER">Repair Center</SelectItem>
                                <SelectItem value="MANAGEMENT">Management</SelectItem>
                                <SelectItem value="LOGISTICS">Logistics</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {hitachiUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada pengguna Hitachi
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hitachiUsers.map((user) => (
                      <Card key={user.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {user.role} • {user.department}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Pengelola Users Tab */}
        {canManagePengelola && (
          <TabsContent value="pengelola" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Pengelola Users
                    </CardTitle>
                    <CardDescription>
                      Kelola pengguna dari vendor/pengelola
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingUser(null);
                        setFormData({
                          username: '',
                          email: '',
                          password: '',
                          fullName: '',
                          role: '',
                          department: '',
                          pengelolaId: selectedPengelola || '',
                          customerBankId: '',
                          phone: '',
                          whatsappNumber: '',
                          employeeId: '',
                          canCreateTickets: true,
                          canCloseTickets: false,
                          canManageMachines: false,
                          assignedBranches: '',
                        });
                      }} disabled={!selectedPengelola}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      <DialogHeader>
                        <DialogTitle>Add Pengelola User</DialogTitle>
                        <DialogDescription>
                          Buat pengguna baru untuk vendor/pengelola
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="pengelolaId">Pengelola *</Label>
                          <Select
                            value={formData.pengelolaId}
                            onValueChange={(value) => setFormData({ ...formData, pengelolaId: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select pengelola" />
                            </SelectTrigger>
                            <SelectContent>
                              {pengelola.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="username">Username *</Label>
                            <Input
                              id="username"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="password">Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="role">Role *</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({ ...formData, role: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Select Pengelola</Label>
                  <Select value={selectedPengelola} onValueChange={setSelectedPengelola}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pengelola" />
                    </SelectTrigger>
                    <SelectContent>
                      {pengelola.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selectedPengelola ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Pilih pengelola untuk melihat pengguna
                  </div>
                ) : pengelolaUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada pengguna untuk pengelola ini
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pengelolaUsers.map((user) => (
                      <Card key={user.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {user.role}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Bank Users Tab */}
        {isSuperAdminUser && (
          <TabsContent value="bank" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Bank Users
                    </CardTitle>
                    <CardDescription>
                      Kelola pengguna bank (read-only access)
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingUser(null);
                        setFormData({
                          username: '',
                          email: '',
                          password: '',
                          fullName: '',
                          role: 'VIEWER',
                          department: '',
                          pengelolaId: '',
                          customerBankId: selectedBank || '',
                          phone: '',
                          whatsappNumber: '',
                          employeeId: '',
                          canCreateTickets: true,
                          canCloseTickets: false,
                          canManageMachines: false,
                          assignedBranches: '',
                        });
                      }} disabled={!selectedBank}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      <DialogHeader>
                        <DialogTitle>Add Bank User</DialogTitle>
                        <DialogDescription>
                          Buat pengguna baru untuk bank (read-only access)
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="customerBankId">Bank *</Label>
                          <Select
                            value={formData.customerBankId}
                            onValueChange={(value) => setFormData({ ...formData, customerBankId: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank" />
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="username">Username *</Label>
                            <Input
                              id="username"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="password">Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="role">Role *</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({ ...formData, role: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Select Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
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
                {selectedBank && (
                  <div className="space-y-4">
                    {bankUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No bank users found for this bank
                      </div>
                    ) : (
                      bankUsers.map((user) => (
                        <Card key={user.id}>
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">{user.fullName}</span>
                                <Badge variant="outline">{user.role}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>Username: {user.username}</div>
                                <div>Email: {user.email}</div>
                                {user.phone && <div>Phone: {user.phone}</div>}
                                {user.customerBank && (
                                  <div>Bank: {user.customerBank.bankName}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeletingUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          <DialogHeader>
            <DialogTitle>Edit {activeTab === 'hitachi' ? 'Hitachi' : activeTab === 'pengelola' ? 'Pengelola' : 'Bank'} User</DialogTitle>
            <DialogDescription>
              Perbarui informasi pengguna
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'pengelola' && (
              <div>
                <Label htmlFor="edit-pengelolaId">Pengelola *</Label>
                <Select
                  value={formData.pengelolaId}
                  onValueChange={(value) => setFormData({ ...formData, pengelolaId: value })}
                  required
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pengelola" />
                  </SelectTrigger>
                  <SelectContent>
                    {pengelola.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === 'bank' && (
              <div>
                <Label htmlFor="edit-customerBankId">Bank *</Label>
                <Select
                  value={formData.customerBankId}
                  onValueChange={(value) => setFormData({ ...formData, customerBankId: value })}
                  required
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
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
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-password">Password (kosongkan jika tidak diubah)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-fullName">Full Name *</Label>
                <Input
                  id="edit-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            </div>
            {activeTab === 'hitachi' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="RC_MANAGER">RC Manager</SelectItem>
                      <SelectItem value="RC_STAFF">RC Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPAIR_CENTER">Repair Center</SelectItem>
                      <SelectItem value="MANAGEMENT">Management</SelectItem>
                      <SelectItem value="LOGISTICS">Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : activeTab === 'bank' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="edit-whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-employeeId">Employee ID</Label>
                  <Input
                    id="edit-employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna {deletingUser?.fullName}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

