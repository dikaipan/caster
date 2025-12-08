'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
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

export default function UsersTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('hitachi');
  const [hitachiUsers, setHitachiUsers] = useState<any[]>([]);
  const [pengelola, setPengelola] = useState<any[]>([]);
  const [selectedPengelola, setSelectedPengelola] = useState<string>('');
  const [pengelolaUsers, setPengelolaUsers] = useState<any[]>([]);
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
        const response = await api.get('/auth/hitachi-users');
        setHitachiUsers(response.data || []);
      } else if (activeTab === 'pengelola') {
        const pengelolaResponse = await api.get('/pengelola');
        setPengelola(pengelolaResponse.data || []);
        if (pengelolaResponse.data && pengelolaResponse.data.length > 0 && !selectedPengelola) {
          setSelectedPengelola(pengelolaResponse.data[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedPengelola, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    }
  }, [activeTab, selectedPengelola, toast]);

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
        } else {
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
            assignedBranches: formData.assignedBranches
              ? formData.assignedBranches.split(',').map((b: string) => b.trim())
              : undefined,
          };
          if (formData.password) {
            updateData.password = formData.password;
          }
          await api.patch(`/pengelola/${formData.pengelolaId}/users/${editingUser.id}`, updateData);
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
        } else {
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
      } else {
        await api.delete(`/pengelola/${deletingUser.pengelolaId}/users/${deletingUser.id}`);
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
      pengelolaId: userData.pengelolaId || '',
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

  if (loading && (activeTab === 'hitachi' ? hitachiUsers.length === 0 : pengelolaUsers.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hitachi" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Hitachi Users
          </TabsTrigger>
          <TabsTrigger value="pengelola" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Pengelola Users
          </TabsTrigger>
        </TabsList>

        {/* Hitachi Users Tab */}
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        {/* Pengelola Users Tab */}
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                              <SelectItem value="TECHNICIAN">Technician</SelectItem>
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
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {activeTab === 'hitachi' ? 'Hitachi' : 'Pengelola'} User</DialogTitle>
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
                        <SelectItem value="TECHNICIAN">Technician</SelectItem>
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

