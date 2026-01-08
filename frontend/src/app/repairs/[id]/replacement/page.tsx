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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReplacementPage() {
  const router = useRouter();
  const params = useParams();
  const repairId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [repair, setRepair] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  
  // Form fields
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

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
      if (!isAuthenticated || !repairId) return;

      try {
        setLoading(true);
        
        // Fetch repair ticket
        const repairResponse = await api.get(`/repairs/${repairId}`);
        setRepair(repairResponse.data);

        // Fetch problem ticket to get replacement info
        if (repairResponse.data.cassette?.id) {
          try {
            // Find ticket via cassette delivery
            const deliveriesResponse = await api.get(`/tickets?cassetteId=${repairResponse.data.cassette.id}`);
            // API returns { data: [...], pagination: {...} } structure
            const tickets = Array.isArray(deliveriesResponse.data?.data) 
              ? deliveriesResponse.data.data 
              : Array.isArray(deliveriesResponse.data) 
                ? deliveriesResponse.data 
                : [];
            const replacementTicket = tickets.find((t: any) => {
              // Check if ticket has replacement request
              if (t.cassetteDetails && t.cassetteDetails.length > 0) {
                return t.cassetteDetails.some((detail: any) => 
                  detail.cassetteId === repairResponse.data.cassette.id && 
                  detail.requestReplacement === true
                );
              }
              return false;
            });
            
            if (replacementTicket) {
              setTicket(replacementTicket);
            }
          } catch (err) {
            console.warn('Could not fetch ticket:', err);
          }
        }
      } catch (error: any) {
        console.error('Error fetching repair:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load repair data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && repairId) {
      fetchData();
    }
  }, [isAuthenticated, repairId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!newSerialNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Serial Number baru wajib diisi',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    if (!repair?.cassette?.id || !ticket?.id) {
      toast({
        title: 'Error',
        description: 'Data repair atau ticket tidak lengkap',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/cassettes/replace', {
        oldCassetteId: repair.cassette.id,
        newSerialNumber: newSerialNumber.trim(),
        replacementTicketId: ticket.id,
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Success',
        description: `Kaset ${repair.cassette.serialNumber} berhasil diganti dengan ${newSerialNumber.trim()}`,
      });

      // Redirect back to repair detail
      setTimeout(() => {
        router.push(`/repairs/${repairId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error replacing cassette:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal mengganti kaset',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  if (!repair) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg">Repair ticket not found</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const oldCassette = repair.cassette;
  const hasReplacementRequest = ticket?.cassetteDetails?.some((detail: any) => 
    detail.cassetteId === oldCassette?.id && detail.requestReplacement === true
  );

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/repairs/${repairId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Form Replacement Cassette</h1>
              <p className="text-sm text-muted-foreground">
                Ganti SN kaset yang tidak layak pakai dengan SN baru
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informasi Kaset Lama
            </CardTitle>
            <CardDescription>
              Kaset yang akan diganti (akan di-mark sebagai SCRAPPED)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Serial Number</Label>
                <p className="text-lg font-semibold">{oldCassette?.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="text-lg font-semibold">{oldCassette?.status || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Type</Label>
                <p className="text-lg font-semibold">{oldCassette?.cassetteType?.typeCode || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Bank</Label>
                <p className="text-lg font-semibold">{oldCassette?.customerBank?.bankName || 'N/A'}</p>
              </div>
            </div>
            
            {hasReplacementRequest && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Replacement Requested
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {ticket.cassetteDetails?.find((d: any) => d.requestReplacement)?.replacementReason || 'Kaset tidak layak pakai'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replacement Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Kaset Baru (Pengganti)
            </CardTitle>
            <CardDescription>
              Input Serial Number baru untuk kaset pengganti. Type, Bank, Machine, dan UsageType akan otomatis diisi dari kaset lama.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newSerialNumber">
                  Serial Number Baru <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newSerialNumber"
                  value={newSerialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value.toUpperCase())}
                  placeholder="Contoh: RB-BNI-0002"
                  required
                  className="text-lg font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Serial Number baru untuk kaset pengganti
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk replacement..."
                  rows={4}
                />
              </div>

              {/* Auto-fill Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                <p className="text-sm font-semibold mb-2">Data yang akan otomatis diisi:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Type: {oldCassette?.cassetteType?.typeCode || 'N/A'}</li>
                  <li>• Bank: {oldCassette?.customerBank?.bankName || 'N/A'}</li>
                  <li>• Machine: {oldCassette?.machine?.serialNumberManufacturer || 'N/A'}</li>
                  <li>• Usage Type: {oldCassette?.usageType || 'N/A'}</li>
                  <li>• Status: OK (baru dibuat)</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/repairs/${repairId}`)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !newSerialNumber.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit Replacement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

