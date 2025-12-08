'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Truck,
  ArrowRight,
  Building2,
  Monitor,
  Eye,
  Download,
  Trash2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';

export default function TicketReplacementPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [oldCassettes, setOldCassettes] = useState<any[]>([]);
  const [newCassettes, setNewCassettes] = useState<Record<string, any>>({});
  const [replacementDetails, setReplacementDetails] = useState<any[]>([]);
  
  // Form fields - track which cassette is being replaced
  // Use object to store form data per cassette ID
  const [formData, setFormData] = useState<Record<string, { newSerialNumber: string; notes: string }>>({});
  const [selectedOldCassetteId, setSelectedOldCassetteId] = useState<string | null>(null);

  // Pickup confirmation states
  const [showPickupDialog, setShowPickupDialog] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState(new Date().toTimeString().slice(0, 5));
  const [pickupCondition, setPickupCondition] = useState<string>('GOOD');
  const [pickupSignature, setPickupSignature] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [pickupRecipientName, setPickupRecipientName] = useState('');
  const [pickupRecipientPhone, setPickupRecipientPhone] = useState('');
  const [confirmingPickup, setConfirmingPickup] = useState(false);

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
      if (!isAuthenticated || !ticketId) return;

      try {
        setLoading(true);
        
        // Fetch ticket
        const ticketResponse = await api.get(`/tickets/${ticketId}`);
        const ticketData = ticketResponse.data;
        setTicket(ticketData);

        // Find ALL cassettes with requestReplacement = true
        const allReplacementDetails = ticketData.cassetteDetails?.filter((detail: any) => 
          detail.requestReplacement === true
        ) || [];

        if (allReplacementDetails.length === 0) {
          toast({
            title: 'Error',
            description: 'Ticket ini tidak memiliki replacement request',
            variant: 'destructive',
          });
          router.push(`/tickets/${ticketId}`);
          return;
        }

        setReplacementDetails(allReplacementDetails);

        // Fetch full cassette data for all replacement requests
        const oldCassettesData: any[] = [];
        const newCassettesMap: Record<string, any> = {};

        for (const replacementDetail of allReplacementDetails) {
          const cassetteToReplace = replacementDetail.cassette;
          
        if (cassetteToReplace?.id) {
          try {
                // Add cache-busting timestamp to ensure fresh data
                const cassetteResponse = await api.get(`/cassettes/${cassetteToReplace.id}`, {
                  params: { _t: Date.now() },
                });
            const fullCassetteData = cassetteResponse.data;
                oldCassettesData.push(fullCassetteData);

            // Check if cassette has been replaced
              // Priority: 1) replacementFor from API response
              if (fullCassetteData.replacementFor && fullCassetteData.replacementFor.length > 0) {
              // Cassette sudah di-replace, ambil kaset baru
                const replacementCassette = fullCassetteData.replacementFor[0];
                newCassettesMap[fullCassetteData.id] = replacementCassette;
                console.log(`✅ Found replacement for ${fullCassetteData.serialNumber}: ${replacementCassette.serialNumber}`);
              } else {
                // Try to find new cassette by searching for cassettes with replacedCassetteId matching this old cassette
                try {
                  const allCassettesResponse = await api.get('/cassettes', {
                    params: {
                      limit: 1000, // Get enough cassettes to search
                    },
                  });
                  const allCassettes = Array.isArray(allCassettesResponse.data) 
                    ? allCassettesResponse.data 
                    : (allCassettesResponse.data?.data || []);
                  
                  const foundNewCassette = allCassettes.find((c: any) => 
                    c.replacedCassetteId === fullCassetteData.id || 
                    (c.replacementTicketId === ticketData.id && c.status === 'READY_FOR_PICKUP')
                  );
                  
                  if (foundNewCassette) {
                    newCassettesMap[fullCassetteData.id] = foundNewCassette;
                    console.log(`✅ Found new cassette via search for ${fullCassetteData.serialNumber}: ${foundNewCassette.serialNumber}`);
                  } else {
                    console.log(`⚠️ No replacement found for ${fullCassetteData.serialNumber}`);
                  }
                } catch (searchErr) {
                  console.warn('Could not search for replacement cassette:', searchErr);
                }
            }
          } catch (err) {
            console.warn('Could not fetch full cassette data:', err);
              oldCassettesData.push(cassetteToReplace);
          }
        } else {
            oldCassettesData.push(cassetteToReplace);
        }
        }

        setOldCassettes(oldCassettesData);
        setNewCassettes(newCassettesMap);
      } catch (error: any) {
        console.error('Error fetching ticket:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load ticket data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && ticketId) {
      fetchData();
    }
  }, [isAuthenticated, ticketId, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedOldCassetteId || !ticket?.id) {
      toast({
        title: 'Error',
        description: 'Pilih kaset yang akan diganti',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const selectedCassette = oldCassettes.find(c => c.id === selectedOldCassetteId);
    if (!selectedCassette) {
      toast({
        title: 'Error',
        description: 'Kaset yang dipilih tidak ditemukan',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Get form data for this specific cassette
    const currentFormData = formData[selectedOldCassetteId] || { newSerialNumber: '', notes: '' };
    
    if (!currentFormData.newSerialNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Serial Number baru wajib diisi',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/cassettes/replace', {
        oldCassetteId: selectedCassette.id,
        newSerialNumber: currentFormData.newSerialNumber.trim(),
        replacementTicketId: ticket.id,
        notes: currentFormData.notes.trim() || undefined,
      });

      const replacementData = response.data || {};
      
      toast({
        title: 'Success',
        description: `Kaset ${selectedCassette.serialNumber} berhasil diganti dengan ${currentFormData.newSerialNumber.trim()}`,
      });

      // Refresh data to show replacement info
      const fetchData = async () => {
        try {
          const ticketResponse = await api.get(`/tickets/${ticketId}`);
          const ticketData = ticketResponse.data;
          setTicket(ticketData);
          
          const allReplacementDetails = ticketData.cassetteDetails?.filter((detail: any) => 
            detail.requestReplacement === true
          ) || [];

          setReplacementDetails(allReplacementDetails);

          // Refresh all cassettes
          const oldCassettesData: any[] = [];
          const newCassettesMap: Record<string, any> = {};

          for (const replacementDetail of allReplacementDetails) {
            const cassetteToReplace = replacementDetail.cassette;
            
            if (cassetteToReplace?.id) {
              try {
                // Add cache-busting timestamp to ensure fresh data
                const cassetteResponse = await api.get(`/cassettes/${cassetteToReplace.id}`, {
                  params: { _t: Date.now() },
                });
            const fullCassetteData = cassetteResponse.data;
                oldCassettesData.push(fullCassetteData);

                // Check if this cassette has been replaced
                // Priority: 1) replacementFor from API response, 2) newCassette from replacement response
            if (fullCassetteData.replacementFor && fullCassetteData.replacementFor.length > 0) {
                  // Cassette sudah di-replace, ambil kaset baru dari replacementFor
                  const replacementCassette = fullCassetteData.replacementFor[0];
                  newCassettesMap[fullCassetteData.id] = replacementCassette;
                  console.log(`✅ Found replacement for ${fullCassetteData.serialNumber}: ${replacementCassette.serialNumber}`);
                } else if (replacementData.newCassette && replacementData.newCassette.id && replacementData.newCassette.replacedCassetteId === fullCassetteData.id) {
                  // Fallback: use newCassette from replacement response if it matches this old cassette
                  newCassettesMap[fullCassetteData.id] = replacementData.newCassette;
                  console.log(`✅ Using replacementData.newCassette for ${fullCassetteData.serialNumber}: ${replacementData.newCassette.serialNumber}`);
                } else {
                  // Try to find new cassette by searching for cassettes with replacedCassetteId matching this old cassette
                  try {
                    const allCassettesResponse = await api.get('/cassettes', {
                      params: {
                        limit: 1000, // Get enough cassettes to search
                      },
                    });
                    const allCassettes = Array.isArray(allCassettesResponse.data) 
                      ? allCassettesResponse.data 
                      : (allCassettesResponse.data?.data || []);
                    
                    const foundNewCassette = allCassettes.find((c: any) => 
                      c.replacedCassetteId === fullCassetteData.id || 
                      (c.replacementTicketId === ticket.id && c.status === 'READY_FOR_PICKUP')
                    );
                    
                    if (foundNewCassette) {
                      newCassettesMap[fullCassetteData.id] = foundNewCassette;
                      console.log(`✅ Found new cassette via search for ${fullCassetteData.serialNumber}: ${foundNewCassette.serialNumber}`);
                    } else {
                      console.log(`⚠️ No replacement found for ${fullCassetteData.serialNumber}`, {
                        hasReplacementFor: !!fullCassetteData.replacementFor,
                        replacementForLength: fullCassetteData.replacementFor?.length || 0,
                        hasReplacementData: !!replacementData.newCassette,
                        oldCassetteId: fullCassetteData.id,
                      });
                    }
                  } catch (searchErr) {
                    console.warn('Could not search for replacement cassette:', searchErr);
                  }
                }
              } catch (err) {
                console.warn('Could not fetch full cassette data:', err);
                oldCassettesData.push(cassetteToReplace);
              }
            } else {
              oldCassettesData.push(cassetteToReplace);
            }
          }

          setOldCassettes(oldCassettesData);
          setNewCassettes(newCassettesMap);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };

      await fetchData();
      
      // Clear form data for this cassette
      setFormData(prev => {
        const updated = { ...prev };
        delete updated[selectedOldCassetteId];
        return updated;
      });
      setSelectedOldCassetteId(null);
    } catch (error: any) {
      console.error('Error replacing cassette:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Gagal mengganti kaset';
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage,
      });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    // In replacement flow, we only have pickup confirmation (no disposal)
    // SCRAPPED cassettes are replaced with new ones, so we only confirm pickup of new cassettes

    if (!pickupConfirmed) {
      toast({
        title: 'Konfirmasi Diperlukan',
        description: 'Silakan centang kotak konfirmasi terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    // Require signature, name, and phone for pickup
    if (!pickupRecipientName.trim() || !pickupRecipientPhone.trim()) {
      toast({
        title: 'Data Pengambil Diperlukan',
        description: 'Silakan isi nama pengambil dan nomor HP.',
        variant: 'destructive',
      });
      return;
    }

    if (!pickupSignature) {
      toast({
        title: 'Tanda Tangan Diperlukan',
        description: 'Silakan berikan tanda tangan digital.',
        variant: 'destructive',
      });
      return;
    }

    setConfirmingPickup(true);
    try {
      // Pickup notes for replacement flow
      const pickupDateTime = `${pickupDate}T${pickupTime}:00`;
      const notes = [
        `Tanggal/Waktu Pickup: ${new Date(pickupDateTime).toLocaleString('id-ID')}`,
        `Kondisi Kaset: ${pickupCondition === 'GOOD' ? 'Baik' : pickupCondition === 'MINOR_DAMAGE' ? 'Ada kerusakan minor' : 'Ada kerusakan'}`,
        `Nama Pengambil: ${pickupRecipientName.trim()}`,
        `No. HP Pengambil: ${pickupRecipientPhone.trim()}`,
        `Dikonfirmasi oleh: ${user?.fullName || user?.username || 'N/A'}`,
        pickupNotes.trim() ? `Catatan: ${pickupNotes.trim()}` : null,
        `Tanda Tangan: [Digital Signature Attached]`,
      ].filter(Boolean).join('\n');

      // Send signature (RC staff confirms pickup on behalf of Pengelola)
      const payload: any = {
        ticketId: ticketId,
        notes: notes || undefined,
        rcSignature: pickupSignature || undefined,
        signature: pickupSignature || undefined, // For backward compatibility
      };

      await api.post('/tickets/return', payload);
      
      // Refresh ticket data to get updated return record
      const ticketResponse = await api.get(`/tickets/${ticketId}`);
      const updatedTicket = ticketResponse.data;
      
      toast({
        title: 'Berhasil',
        description: 'Konfirmasi pickup berhasil. Ticket menjadi CLOSED.',
      });
      
      setTicket(updatedTicket);
      
      setShowPickupDialog(false);
      setPickupNotes('');
      setPickupDate(new Date().toISOString().split('T')[0]);
      setPickupTime(new Date().toTimeString().slice(0, 5));
      setPickupCondition('GOOD');
      setPickupSignature(null);
      setPickupConfirmed(false);
      setPickupRecipientName('');
      setPickupRecipientPhone('');
      
      // Redirect to ticket detail page (don't refresh again, already done above)
      router.push(`/tickets/${ticketId}`);
    } catch (error: any) {
      console.error('Error confirming pickup:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal mengonfirmasi pickup',
        variant: 'destructive',
      });
    } finally {
      setConfirmingPickup(false);
    }
  };

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

  if (!ticket || oldCassettes.length === 0) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg">Ticket atau cassette tidak ditemukan</p>
            <Button onClick={() => router.push(`/tickets/${ticketId}`)} className="mt-4">
              Kembali ke Ticket Detail
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Check which cassettes are already replaced
  const replacedCassetteIds = new Set(Object.keys(newCassettes));

  // Check if all cassettes are replaced (pickup flow only - no disposal in replacement)
  const allReplaced = Object.keys(newCassettes).length > 0 && Object.keys(newCassettes).length === oldCassettes.length;

  return (
    <PageLayout>
      <div className="space-y-5">
        {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/tickets/${ticketId}`)}
            className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
            <ArrowLeft className="h-4 w-4" />
            </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
            <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Replacement Cassette
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {ticket.ticketNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-medium text-muted-foreground">{ticket.status}</span>
            </div>
          </div>
        </div>
              </div>
              </div>

        {/* List of All Replacement Requests */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader className="pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Kaset yang Perlu Di-replace
              </CardTitle>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                {oldCassettes.length} kaset
              </span>
            </div>
            </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {oldCassettes.map((oldCassette, index) => {
              const isReplaced = replacedCassetteIds.has(oldCassette.id);
              const newCassette = newCassettes[oldCassette.id];
              const replacementDetail = replacementDetails.find((detail: any) => 
                detail.cassetteId === oldCassette.id || detail.cassette?.id === oldCassette.id
              );

              return (
                <div 
                  key={oldCassette.id} 
                  className={`group relative border rounded-xl p-4 space-y-3 transition-all duration-200 ${
                    isReplaced 
                      ? 'bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800/50 shadow-sm' 
                      : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                  }`}
                >
                  {/* Cassette Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-sm">
                          {index + 1}
                </div>
                        <p className="font-mono font-bold text-base text-gray-900 dark:text-slate-100">
                          {oldCassette.serialNumber}
                        </p>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-md text-xs font-medium">
                          {oldCassette.cassetteType?.typeCode || 'N/A'}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          oldCassette.status === 'SCRAPPED' 
                            ? 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' 
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}>
                          {oldCassette.status}
                        </span>
                </div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-2 ml-9">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3" />
                          <span className="font-medium">{oldCassette.customerBank?.bankName || 'N/A'}</span>
              </div>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3 w-3" />
                          <span className="font-mono">{oldCassette.machine?.serialNumberManufacturer || 'N/A'}</span>
                  </div>
                  </div>
                      {replacementDetail?.replacementReason && (
                        <div className="mt-2 ml-9 p-2 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg text-xs">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">Alasan:</span>{' '}
                          <span className="text-blue-600 dark:text-blue-300">{replacementDetail.replacementReason}</span>
                  </div>
                      )}
                  </div>
                    {isReplaced && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Replaced</span>
                </div>
                    )}
              </div>
              
                  {/* Replacement Status or Form */}
                  {isReplaced && newCassette ? (
                    <div className="ml-9 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Kaset Baru:</span>{' '}
                          <span className="font-mono font-bold text-sm text-green-700 dark:text-green-400">{newCassette.serialNumber}</span>
                      </div>
                    </div>
                  </div>
                  ) : (
                    <div className="ml-9">
                      {selectedOldCassetteId === oldCassette.id ? (
                        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/10 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                          <div className="space-y-2">
                            <Label htmlFor={`newSerialNumber-${oldCassette.id}`} className="text-xs font-semibold flex items-center gap-1">
                              Serial Number Baru
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`newSerialNumber-${oldCassette.id}`}
                              value={formData[oldCassette.id]?.newSerialNumber || ''}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  [oldCassette.id]: {
                                    ...prev[oldCassette.id],
                                    newSerialNumber: e.target.value.toUpperCase(),
                                    notes: prev[oldCassette.id]?.notes || '',
                                  }
                                }));
                              }}
                              placeholder="RB-BNI-0002"
                              required
                              className="h-9 text-sm font-mono border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                </div>
                          <div className="space-y-2">
                            <Label htmlFor={`notes-${oldCassette.id}`} className="text-xs font-semibold">Catatan (Opsional)</Label>
                            <Textarea
                              id={`notes-${oldCassette.id}`}
                              value={formData[oldCassette.id]?.notes || ''}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  [oldCassette.id]: {
                                    ...prev[oldCassette.id],
                                    newSerialNumber: prev[oldCassette.id]?.newSerialNumber || '',
                                    notes: e.target.value,
                                  }
                                }));
                              }}
                              placeholder="Catatan tambahan..."
                              rows={2}
                              className="text-xs border-2 focus:border-blue-500 dark:focus:border-blue-400 resize-none"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOldCassetteId(null);
                                setFormData(prev => {
                                  const updated = { ...prev };
                                  delete updated[oldCassette.id];
                                  return updated;
                                });
                              }}
                              disabled={submitting}
                              className="h-8 text-xs px-3 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                              Batal
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={submitting || !(formData[oldCassette.id]?.newSerialNumber?.trim())}
                              className="h-8 text-xs px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  Submit
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOldCassetteId(oldCassette.id);
                            // Initialize form data for this cassette if not exists
                            if (!formData[oldCassette.id]) {
                              setFormData(prev => ({
                                ...prev,
                                [oldCassette.id]: { newSerialNumber: '', notes: '' }
                              }));
                            }
                          }}
                          className="h-8 text-xs px-3 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium transition-all"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Input SN Baru
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Info - Show if all cassettes are replaced and ticket is ready for pickup */}
        {/* Show pickup button if user hasn't confirmed yet (dual confirmation support) */}
        {/* In replacement flow, we only have pickup confirmation (no disposal) */}
        {allReplaced && ticket?.status === 'RESOLVED' && !ticket?.cassetteReturn && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3 border-b border-green-200/50 dark:border-green-800/50">
              <CardTitle className="text-base font-bold flex items-center gap-2.5 text-green-700 dark:text-green-400">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Semua Kaset Sudah Di-replace
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="p-3 bg-white/80 dark:bg-slate-800/80 border border-green-200/50 dark:border-green-800/50 rounded-lg backdrop-blur-sm">
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Kaset Baru yang Siap Di-pickup:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(newCassettes).map((newCassette: any) => (
                      <span 
                        key={newCassette.id} 
                        className="font-mono text-xs px-2.5 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800 font-semibold shadow-sm"
                      >
                        {newCassette.serialNumber}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded flex-shrink-0 mt-0.5">
                      <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Ticket Status: <span className="font-mono text-blue-700 dark:text-blue-400">RESOLVED</span>
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                        Kaset baru sudah siap untuk di-pickup oleh Pengelola di RC. Silakan konfirmasi pickup di bawah ini.
                      </p>
                                  {/* Pickup Confirmation Status */}
                      {ticket?.cassetteReturn?.confirmedByRc && (
                        <div className="mt-2 space-y-3">
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="text-xs flex items-center gap-1.5 text-green-700 dark:text-green-400 mb-3">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="font-medium">
                                Pickup sudah dikonfirmasi oleh {ticket.cassetteReturn.rcConfirmer?.fullName || 'RC Staff'}
                              </span>
                            </div>
                            
                            {/* Pickup Details - Parse from notes */}
                            {(() => {
                              const notes = ticket.cassetteReturn.notes || '';
                              
                              // Parse pickup information from notes
                              const pickupDateTimeMatch = notes.match(/Tanggal\/Waktu\s+Pickup[:\s]+([^\n]+)/i);
                              const kondisiMatch = notes.match(/Kondisi\s+Kaset[:\s]+([^\n]+)/i);
                              const namaPengambilMatch = notes.match(/Nama\s+Pengambil[:\s]+([^\n]+)/i);
                              const noHpMatch = notes.match(/No\.?\s*HP\s+Pengambil[:\s]+([^\n]+)/i);
                              const catatanMatch = notes.match(/Catatan[:\s]+([^\n]+)/i);
                              
                              const pickupDateTime = pickupDateTimeMatch ? pickupDateTimeMatch[1].trim() : null;
                              const kondisiKaset = kondisiMatch ? kondisiMatch[1].trim() : null;
                              const namaPengambil = namaPengambilMatch ? namaPengambilMatch[1].trim() : null;
                              const noHp = noHpMatch ? noHpMatch[1].trim() : null;
                              const catatanTambahan = catatanMatch ? catatanMatch[1].trim() : null;
                              
                              const hasStructuredData = pickupDateTime || kondisiKaset || namaPengambil || noHp;
                              
                              if (!hasStructuredData) {
                                return null;
                              }
                              
                              return (
                                <div className="space-y-3 pt-3 border-t border-green-200 dark:border-green-700">
                                  {/* Header */}
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                      PICKUP DI RC
                                    </h4>
                                  </div>
                                  
                                  {/* Information Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {pickupDateTime && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Tanggal/Waktu Pickup
                                        </p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                          {pickupDateTime}
                                        </p>
                                      </div>
                                    )}
                                    {kondisiKaset && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Kondisi Kaset
                                        </p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                          {kondisiKaset}
                                        </p>
                                      </div>
                                    )}
                                    {namaPengambil && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Nama Pengambil
                                        </p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                          {namaPengambil}
                                        </p>
                                      </div>
                                    )}
                                    {noHp && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          No. HP Pengambil
                                        </p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                          {noHp}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Catatan Tambahan */}
                                  {catatanTambahan && (
                                    <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-1">
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Catatan
                                      </p>
                                      <p className="text-xs text-slate-700 dark:text-slate-300">
                                        {catatanTambahan}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Digital Signature */}
                                  {ticket.cassetteReturn.signature && (
                                    <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-1.5">
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Tanda Tangan Digital
                                      </p>
                                      <div className="inline-block border border-green-200 dark:border-green-700 rounded bg-white dark:bg-slate-900 p-2">
                                        <img 
                                          src={ticket.cassetteReturn.signature} 
                                          alt="Tanda Tangan Digital" 
                                          className="h-auto max-h-24 object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Only show pickup button if RC user and pickup hasn't been confirmed yet */}
                {(() => {
                  const isHitachiUser = user?.userType === 'HITACHI';
                  const hasReturnRecord = !!ticket?.cassetteReturn;
                  
                  // Only RC can confirm pickup
                  if (!isHitachiUser) {
                    return (
                      <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400 text-center font-semibold">
                          ℹ️ Hanya RC staff yang dapat mengkonfirmasi pickup
                        </p>
                      </div>
                    );
                  }
                  
                  if (hasReturnRecord) {
                    return (
                      <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-xs text-green-700 dark:text-green-400 text-center font-semibold">
                          ✅ Pickup sudah dikonfirmasi
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Button 
                      size="sm" 
                      onClick={() => setShowPickupDialog(true)}
                      className="w-full h-9 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Konfirmasi Pickup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pickup Confirmation Dialog - Only for RC staff */}
        {(user?.userType === 'HITACHI') ? (
          <Dialog open={showPickupDialog} onOpenChange={setShowPickupDialog}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Package className="h-5 w-5" />
                Konfirmasi Pickup {Object.values(newCassettes).length > 1 ? `${Object.values(newCassettes).length} Kaset` : 'Kaset'}
              </DialogTitle>
              <DialogDescription>
                Konfirmasi bahwa kaset baru telah diambil oleh Pengelola di RC
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Info:</strong> Setelah konfirmasi, status kaset langsung berubah menjadi OK dan ticket menjadi CLOSED.
                </p>
              </div>

              {/* Info Box - Replacement Mapping - Show ALL replacement requests */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3">
                  📋 Informasi Replacement - Semua Kaset yang Diganti:
                </p>
                <div className="space-y-2.5">
                  {oldCassettes.map((oldCassette: any, index: number) => {
                    const newCassette = newCassettes[oldCassette.id];
                    
                    return (
                      <div 
                        key={oldCassette.id} 
                        className="p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{index + 1}</span>
              </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Serial Number Lama:</span>
                              <span className="font-mono text-sm px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 font-semibold">
                                {oldCassette.serialNumber}
                              </span>
                              <span className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">SCRAPPED</span>
              </div>
                            {newCassette ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Serial Number Baru:</span>
                                  <span className="font-mono text-sm px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800 font-semibold">
                                    {newCassette.serialNumber}
                                  </span>
                                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">READY FOR PICKUP</span>
            </div>
                              </>
                            ) : (
                  <div>
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                  ⏳ Belum di-replace - Menunggu input SN baru dari RC
                                </span>
                  </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Object.keys(newCassettes).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">
                      ✅ Kaset Baru yang akan di-pickup ({Object.keys(newCassettes).length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(newCassettes).map((newCassette: any) => (
                        <span 
                          key={newCassette.id} 
                          className="font-mono text-sm px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800 font-semibold shadow-sm"
                        >
                          {newCassette.serialNumber}
                        </span>
                      ))}
                </div>
              </div>
            )}
              </div>

              {/* Tanggal/Waktu */}
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="pickup-date" className="text-sm font-semibold">
                    Tanggal Pickup <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="pickup-date"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-time" className="text-sm font-semibold">
                    Waktu Pickup <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pickup-time"
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Kondisi Kaset */}
              <div className="space-y-2">
                <Label htmlFor="pickup-condition" className="text-sm font-semibold">
                  Kondisi Kaset Saat Diambil <span className="text-red-500">*</span>
                </Label>
                <Select value={pickupCondition} onValueChange={setPickupCondition}>
                  <SelectTrigger id="pickup-condition">
                    <SelectValue placeholder="Pilih kondisi kaset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">✅ Baik - Tidak ada kerusakan</SelectItem>
                    <SelectItem value="MINOR_DAMAGE">⚠️ Ada kerusakan minor</SelectItem>
                    <SelectItem value="DAMAGE">❌ Ada kerusakan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nama Pengambil dan No HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup-recipient-name" className="text-sm font-semibold">
                    Nama Pengambil <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pickup-recipient-name"
                    type="text"
                    placeholder="Masukkan nama pengambil"
                    value={pickupRecipientName}
                    onChange={(e) => setPickupRecipientName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-recipient-phone" className="text-sm font-semibold">
                    No. HP Pengambil <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pickup-recipient-phone"
                    type="tel"
                    placeholder="Masukkan nomor HP"
                    value={pickupRecipientPhone}
                    onChange={(e) => setPickupRecipientPhone(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="pickup-notes" className="text-sm font-semibold">
                  Catatan Tambahan
                </Label>
                <Textarea
                  id="pickup-notes"
                  placeholder="Masukkan catatan tambahan jika diperlukan..."
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Tanda Tangan Digital */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Tanda Tangan Digital <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Tanda tangan di area berikut untuk konfirmasi pickup
                </p>
                <SignaturePad
                  onSignatureChange={(signature) => setPickupSignature(signature)}
                  width={500}
                  height={200}
                />
                
                {/* Preview Signature */}
                {pickupSignature && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Preview Tanda Tangan:
                              </p>
                <Button
                  type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSignaturePreview(true)}
                                className="h-6 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Lihat Besar
                              </Button>
                            </div>
                            <div className="relative inline-block border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 p-2 cursor-pointer hover:border-teal-400 transition-colors"
                                 onClick={() => setShowSignaturePreview(true)}
                            >
                              <img 
                                src={pickupSignature} 
                                alt="Preview Tanda Tangan" 
                                className="h-auto max-h-32 object-contain"
                              />
                            </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Tanda tangan sudah tersimpan
                  </p>
                </div>
              )}
              </div>

              {/* Konfirmasi Checkbox */}
              <div className="flex items-start space-x-3 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                <input
                  type="checkbox"
                  id="pickup-confirmed"
                  checked={pickupConfirmed}
                  onChange={(e) => setPickupConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-2 cursor-pointer"
                />
                <Label 
                  htmlFor="pickup-confirmed" 
                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                >
                  Saya mengkonfirmasi bahwa {Object.values(newCassettes).length > 1 ? `${Object.values(newCassettes).length} kaset` : 'kaset'} telah diambil di RC dengan kondisi sesuai yang dipilih di atas.
                  <span className="text-red-500 ml-1">*</span>
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                  variant="outline"
                onClick={() => {
                  setShowPickupDialog(false);
                  setPickupNotes('');
                  setPickupDate(new Date().toISOString().split('T')[0]);
                  setPickupTime(new Date().toTimeString().slice(0, 5));
                  setPickupCondition('GOOD');
                  setPickupSignature(null);
                  setPickupConfirmed(false);
                  setPickupRecipientName('');
                  setPickupRecipientPhone('');
                }}
                disabled={confirmingPickup}
                >
                  Batal
                </Button>
                <Button
                onClick={handleConfirmPickup}
                disabled={confirmingPickup || !pickupConfirmed || !pickupSignature || !pickupRecipientName.trim() || !pickupRecipientPhone.trim()}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-50"
              >
                {confirmingPickup ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengonfirmasi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    Konfirmasi Pickup
                    </>
                  )}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        ) : null}

        {/* Signature Preview Dialog */}
        <Dialog open={showSignaturePreview} onOpenChange={setShowSignaturePreview}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <Eye className="h-5 w-5" />
                Preview Tanda Tangan Digital
              </DialogTitle>
              <DialogDescription>
                Tanda tangan yang akan digunakan untuk konfirmasi pickup
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {pickupSignature && (
                <div className="relative border-4 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 p-4 overflow-auto max-h-[60vh]">
                  <img 
                    src={pickupSignature} 
                    alt="Tanda Tangan Digital" 
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
              
            <DialogFooter>
                <Button
                  variant="outline"
                onClick={() => setShowSignaturePreview(false)}
                >
                Tutup
                </Button>
              <Button
                onClick={() => {
                  if (pickupSignature) {
                    const link = document.createElement('a');
                    link.href = pickupSignature;
                    link.download = `tanda-tangan-pickup-${ticketId}-${Date.now()}.png`;
                    link.click();
                  }
                }}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                disabled={!pickupSignature}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

