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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Package,
  Search,
  Info,
} from 'lucide-react';

export default function CreateReplacementCassettePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Search replacement tickets
  const [searchTicketNumber, setSearchTicketNumber] = useState('');
  const [searchingTicket, setSearchingTicket] = useState(false);
  const [replacementTickets, setReplacementTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [scrappedCassettes, setScrappedCassettes] = useState<any[]>([]);
  const [selectedCassette, setSelectedCassette] = useState<any>(null);
  
  // Form data
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // Auto-filled data (from selected cassette)
  const [cassetteTypeId, setCassetteTypeId] = useState('');
  const [customerBankId, setCustomerBankId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [usageType, setUsageType] = useState('');
  
  // Dropdown options
  const [cassetteTypes, setCassetteTypes] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);

  const isHitachi = user?.userType === 'HITACHI';

  const fetchDropdownData = useCallback(async () => {
    try {
      const [typesRes, banksRes] = await Promise.all([
        api.get('/cassettes/types'),
        api.get('/banks'),
      ]);
      setCassetteTypes(typesRes.data);
      setBanks(banksRes.data);
    } catch (err: any) {
      console.error('Error fetching dropdown data:', err);
    }
  }, []);

  const fetchReplacementTickets = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch tickets with requestReplacement = true and status RESOLVED
      const response = await api.get('/tickets', {
        params: {
          status: 'RESOLVED',
        },
      });
      
      // Handle both old format (array) and new format (object with data & pagination)
      const ticketsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      
      // Filter tickets that have requestReplacement = true
      const tickets = ticketsData.filter((ticket: any) => {
        if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
          return ticket.cassetteDetails.some((detail: any) => detail.requestReplacement === true);
        }
        return false;
      });
      
      setReplacementTickets(tickets);
    } catch (err: any) {
      console.error('Error fetching replacement tickets:', err);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar ticket replacement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isLoading && !isHitachi) {
      toast({
        title: 'Akses Ditolak',
        description: 'Hanya Hitachi admin yang dapat mengakses halaman ini',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated && isHitachi) {
      fetchDropdownData();
      fetchReplacementTickets();
    }
  }, [isAuthenticated, isLoading, isHitachi, router, toast, fetchReplacementTickets, fetchDropdownData]);

  const handleSearchTicket = async () => {
    if (!searchTicketNumber.trim()) {
      return;
    }

    try {
      setSearchingTicket(true);
      const response = await api.get(`/tickets/search?ticketNumber=${encodeURIComponent(searchTicketNumber.trim())}`);
      const ticket = response.data;
      
      if (ticket) {
        // Check if ticket has requestReplacement
        const hasReplacement = ticket.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);
        if (hasReplacement) {
          setSelectedTicket(ticket);
          loadScrappedCassettes(ticket);
        } else {
          toast({
            title: 'Ticket Tidak Valid',
            description: 'Ticket ini bukan ticket replacement',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Ticket Tidak Ditemukan',
          description: 'Ticket dengan nomor tersebut tidak ditemukan',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Error searching ticket:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Gagal mencari ticket',
        variant: 'destructive',
      });
    } finally {
      setSearchingTicket(false);
    }
  };

  const loadScrappedCassettes = (ticket: any) => {
    // Get all cassettes from ticket that are SCRAPPED and have requestReplacement = true
    const cassettes: any[] = [];
    
    if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
      ticket.cassetteDetails.forEach((detail: any) => {
        if (detail.requestReplacement === true && detail.cassette && detail.cassette.status === 'SCRAPPED') {
          cassettes.push(detail.cassette);
        }
      });
    }
    
    setScrappedCassettes(cassettes);
    
    // Auto-select first cassette if available
    if (cassettes.length === 1) {
      handleSelectCassette(cassettes[0], ticket);
    }
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setSelectedCassette(null);
    setSerialNumber('');
    setNotes('');
    loadScrappedCassettes(ticket);
  };

  const handleSelectCassette = (cassette: any, ticket?: any) => {
    setSelectedCassette(cassette);
    setCassetteTypeId(cassette.cassetteTypeId);
    setCustomerBankId(cassette.customerBankId);
    setMachineId(cassette.machineId || '');
    setUsageType(cassette.usageType || 'MAIN');
    setNotes(`Replacement for ${cassette.serialNumber} - Ticket ${(ticket || selectedTicket)?.ticketNumber || 'N/A'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCassette) {
      toast({
        title: 'Validasi Gagal',
        description: 'Pilih kaset yang akan diganti terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    if (!serialNumber.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Serial number kaset baru wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const response = await api.post('/cassettes', {
        serialNumber: serialNumber.trim(),
        cassetteTypeId,
        customerBankId,
        machineId: machineId || undefined,
        usageType: usageType || 'MAIN',
        status: 'OK',
        notes: notes.trim() || `Replacement for ${selectedCassette.serialNumber} - Ticket ${selectedTicket?.ticketNumber || 'N/A'}`,
        replacedCassetteId: selectedCassette.id,
        replacementTicketId: selectedTicket?.id,
      });

      toast({
        title: 'Berhasil!',
        description: `Kaset baru ${serialNumber} berhasil didaftarkan sebagai replacement untuk ${selectedCassette.serialNumber}`,
        variant: 'default',
      });

      // Reset form
      setSelectedTicket(null);
      setSelectedCassette(null);
      setScrappedCassettes([]);
      setSerialNumber('');
      setNotes('');
      setCassetteTypeId('');
      setCustomerBankId('');
      setMachineId('');
      setUsageType('');

      // Refresh tickets
      fetchReplacementTickets();

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/cassettes');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating replacement cassette:', err);
      toast({
        title: 'Gagal',
        description: err.response?.data?.message || 'Gagal mendaftarkan kaset baru',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || !isHitachi) {
    return null;
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 overflow-x-hidden">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/cassettes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Kaset
          </Button>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">
            Daftar Kaset Replacement
          </h1>
          <p className="text-lg text-muted-foreground">
            Daftarkan kaset baru sebagai pengganti kaset yang tidak layak pakai
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Informasi</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Pilih ticket replacement yang sudah selesai (RESOLVED) dan kaset yang sudah ditandai SCRAPPED. 
                  Data kaset baru akan otomatis diisi dari kaset lama (Machine, Type, Bank, Usage Type).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Replacement Ticket */}
          <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle>Pilih Ticket Replacement</CardTitle>
                  <CardDescription>
                    Cari ticket replacement yang sudah selesai (RESOLVED)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Ticket */}
              <div className="space-y-2">
                <Label htmlFor="searchTicket">Cari Ticket Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="searchTicket"
                    placeholder="Contoh: SO-2024-001234"
                    value={searchTicketNumber}
                    onChange={(e) => setSearchTicketNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchTicket();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchTicket}
                    disabled={searchingTicket || !searchTicketNumber.trim()}
                  >
                    {searchingTicket ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Or Select from List */}
              <div className="space-y-2">
                <Label>Atau Pilih dari Daftar</Label>
                <Select
                  value={selectedTicket?.id || ''}
                  onValueChange={(value) => {
                    const ticket = replacementTickets.find(t => t.id === value);
                    if (ticket) handleSelectTicket(ticket);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ticket replacement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {replacementTickets.length === 0 ? (
                      <SelectItem value="no-tickets" disabled>
                        Tidak ada ticket replacement yang tersedia
                      </SelectItem>
                    ) : (
                      replacementTickets.map((ticket) => (
                        <SelectItem key={ticket.id} value={ticket.id}>
                          {ticket.ticketNumber} - {ticket.title} ({ticket.cassetteDetails?.filter((d: any) => d.requestReplacement).length || 0} kaset)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Ticket Info */}
              {selectedTicket && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Ticket: {selectedTicket.ticketNumber}
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {selectedTicket.title}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Cassette to Replace */}
          {selectedTicket && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Pilih Kaset yang Diganti</CardTitle>
                    <CardDescription>
                      Pilih kaset yang sudah ditandai SCRAPPED dari ticket ini
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {scrappedCassettes.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                          Tidak ada kaset SCRAPPED
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Ticket ini belum memiliki kaset yang ditandai SCRAPPED. Pastikan repair ticket sudah selesai dengan status SCRAPPED.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Kaset yang Akan Diganti</Label>
                    <Select
                      value={selectedCassette?.id || ''}
                      onValueChange={(value) => {
                        const cassette = scrappedCassettes.find(c => c.id === value);
                        if (cassette) handleSelectCassette(cassette);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kaset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {scrappedCassettes.map((cassette) => (
                          <SelectItem key={cassette.id} value={cassette.id}>
                            {cassette.serialNumber} - {cassette.cassetteType?.typeCode || 'N/A'} ({cassette.usageType || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected Cassette Info */}
                {selectedCassette && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Informasi Kaset Lama:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Serial Number:</span>
                        <p className="font-mono font-semibold text-gray-900 dark:text-slate-100">{selectedCassette.serialNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Type:</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{selectedCassette.cassetteType?.typeCode || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Bank:</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{selectedCassette.customerBank?.bankName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Usage Type:</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{selectedCassette.usageType || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Machine:</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{selectedCassette.machine?.serialNumberManufacturer || selectedCassette.machine?.machineCode || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-400">Status:</span>
                        <p className="font-semibold text-red-600 dark:text-red-400">{selectedCassette.status}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Enter New Cassette Info */}
          {selectedCassette && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Informasi Kaset Baru</CardTitle>
                    <CardDescription>
                      Masukkan data kaset baru (data lain sudah otomatis diisi)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">
                    Serial Number Kaset Baru <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                  </Label>
                  <Input
                    id="serialNumber"
                    placeholder="Contoh: RB-BNI-0001"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    required
                    className="font-mono text-lg h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cassetteType">Cassette Type</Label>
                    <Select value={cassetteTypeId} onValueChange={setCassetteTypeId} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cassetteTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.typeCode} - {type.description || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Otomatis dari kaset lama</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerBank">Customer Bank</Label>
                    <Select value={customerBankId} onValueChange={setCustomerBankId} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bankName} ({bank.bankCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Otomatis dari kaset lama</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageType">Usage Type</Label>
                    <Select value={usageType} onValueChange={setUsageType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIN">MAIN</SelectItem>
                        <SelectItem value="BACKUP">BACKUP</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Otomatis dari kaset lama (dapat diubah)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Opsional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={3}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/cassettes')}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={!serialNumber.trim() || submitting}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Daftarkan Kaset Baru
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Daftar Kaset Replacement</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin mendaftarkan kaset baru <strong>{serialNumber}</strong> sebagai replacement untuk kaset <strong>{selectedCassette?.serialNumber}</strong>?
                <br /><br />
                Kaset baru akan langsung di-assign ke mesin yang sama dan siap digunakan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSubmit}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Ya, Daftarkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
}

