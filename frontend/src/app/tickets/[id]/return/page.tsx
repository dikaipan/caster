'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  MapPin,
  FileText,
  Loader2,
  Wrench,
} from 'lucide-react';

export default function ReturnDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Removed shipping fields - only notes needed for pickup confirmation

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
        console.log('🔍 Fetching ticket:', ticketId);
        // Fetch ticket
        const ticketResponse = await api.get(`/tickets/${ticketId}`);
        console.log('✅ Ticket fetched successfully:', ticketResponse.data?.ticketNumber);
        setTicket(ticketResponse.data);

        // Get all cassettes for this ticket
        const allCassettes = ticketResponse.data.cassetteDetails && ticketResponse.data.cassetteDetails.length > 0
          ? ticketResponse.data.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
          : (ticketResponse.data.cassette ? [ticketResponse.data.cassette] : []);
        
        const cassetteIds = allCassettes.map((c: any) => c.id);

        // Fetch all repairs and filter by cassettes in this ticket
        let allRepairs: any[] = [];
        try {
          const repairsResponse = await api.get('/repairs');
          // Backend returns: { data: [...], pagination: {...} }
          // So repairsResponse.data is the object with data and pagination
          if (repairsResponse.data && typeof repairsResponse.data === 'object') {
            // Check if it's the paginated response structure
            if (Array.isArray(repairsResponse.data.data)) {
              allRepairs = repairsResponse.data.data;
            } else if (Array.isArray(repairsResponse.data)) {
              // Fallback: if data itself is an array
              allRepairs = repairsResponse.data;
            } else {
              allRepairs = [];
            }
          } else {
            allRepairs = [];
          }
        } catch (repairError) {
          console.warn('Could not fetch repairs:', repairError);
          allRepairs = [];
        }

        // Ensure allRepairs is an array before filtering
        if (!Array.isArray(allRepairs)) {
          console.warn('allRepairs is not an array:', allRepairs);
          allRepairs = [];
        }

        // Filter repairs for cassettes in this ticket
        const ticketRepairs = allRepairs.filter((repair: any) => 
          cassetteIds.includes(repair.cassetteId)
        );
        setRepairs(ticketRepairs);

        // Validation checks
        if (ticketResponse.data.status !== 'RESOLVED') {
          setError(`Status SO harus "RESOLVED" (Siap Di-pickup) untuk bisa dikonfirmasi pickup.`);
        }

        if (ticketResponse.data.cassetteReturn) {
          setError('Return delivery sudah dibuat untuk SO ini.');
        }

        // Check if this is a replacement ticket (no repair tickets needed)
        const isReplacementTicket = ticketResponse.data.requestReplacement === true || 
          ticketResponse.data.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);

        // Check if all repairs are completed (only for non-replacement tickets)
        if (!isReplacementTicket) {
          const incompleteRepairs = ticketRepairs.filter((repair: any) => repair.status !== 'COMPLETED');
          if (incompleteRepairs.length > 0) {
            const incompleteCassettes = incompleteRepairs.map((repair: any) => repair.cassette?.serialNumber || 'N/A').join(', ');
            setError(`Tidak bisa mengirim kembali! Masih ada ${incompleteRepairs.length} kaset yang belum selesai diperbaiki: ${incompleteCassettes}`);
          }
        }
      } catch (error: any) {
        console.error('❌ Error fetching data:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          ticketId,
        });
        
        // More specific error messages
        if (error.response?.status === 404) {
          setError(`SO dengan ID ${ticketId} tidak ditemukan. Pastikan ID SO benar.`);
        } else if (error.response?.status === 403) {
          setError('Anda tidak memiliki akses ke SO ini.');
        } else if (error.response?.status === 401) {
          setError('Sesi Anda telah berakhir. Silakan login kembali.');
        } else {
          setError(error.response?.data?.message || `Gagal memuat SO: ${error.message || 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && ticketId) {
      fetchData();
    }
  }, [isAuthenticated, ticketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // No validation needed for pickup confirmation - only notes

    // Check if this is a replacement ticket (no repair tickets needed)
    const isReplacementTicket = ticket?.requestReplacement === true || 
      ticket?.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);

    // Double check: Validate all repairs are completed (only for non-replacement tickets)
    if (!isReplacementTicket) {
      const incompleteRepairs = repairs.filter((repair: any) => repair.status !== 'COMPLETED');
      if (incompleteRepairs.length > 0) {
        const incompleteCassettes = incompleteRepairs.map((repair: any) => repair.cassette?.serialNumber || 'N/A').join(', ');
        setError(`Tidak bisa mengirim kembali! Masih ada ${incompleteRepairs.length} kaset yang belum selesai diperbaiki: ${incompleteCassettes}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        ticketId,
        notes: notes.trim() || undefined,
      };

      console.log('📤 Confirming pickup:', payload);
      
      await api.post('/tickets/return', payload);

      const cassetteCount = allCassettes.length;
      setSuccess(cassetteCount > 1 
        ? `✅ Pickup ${cassetteCount} kaset berhasil dikonfirmasi!` 
        : '✅ Pickup kaset berhasil dikonfirmasi!'
      );
      
      setTimeout(() => {
        router.push(`/tickets/${ticketId}`);
      }, 1500);
    } catch (err: any) {
      console.error('❌ Error creating return delivery:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        payload: {
          ticketId,
          notes: notes?.trim() || undefined,
        },
      });

      // More specific error messages
      if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Bad Request';
        const validationErrors = err.response?.data?.message || [];
        
        if (Array.isArray(validationErrors)) {
          // Validation errors from class-validator
          const errorList = validationErrors.map((e: any) => e.constraints ? Object.values(e.constraints).join(', ') : e).join('\n');
          setError(`Validasi gagal:\n${errorList}`);
        } else {
          setError(errorMessage);
        }
      } else if (err.response?.status === 404) {
        setError('SO tidak ditemukan. Pastikan ID SO benar.');
      } else if (err.response?.status === 403) {
        setError('Anda tidak memiliki akses untuk membuat return delivery.');
      } else {
        setError(err.response?.data?.message || `Gagal mengonfirmasi pickup: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-400 dark:text-teal-400" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Memuat data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.userType !== 'HITACHI') {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-200 font-bold text-lg mb-2">Akses Ditolak</p>
            <p className="text-slate-600 dark:text-slate-400">Hanya untuk RC Staff.</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (!ticket) {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-200 font-bold text-lg">Service Order tidak ditemukan</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Check if this is a replacement ticket
  const isReplacementTicket = ticket?.requestReplacement === true || 
    ticket?.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);

  // Get all cassettes
  // Note: For replacement tickets, backend will use the NEW cassette (with replacementTicketId)
  // Frontend displays the cassettes from ticket, but backend handles the correct cassette selection
  const allCassettes = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
    ? ticket.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
    : (ticket.cassette ? [ticket.cassette] : []);

  const cassetteCount = allCassettes.length;
  const isMultiCassette = cassetteCount > 1;

  // Check if all repairs are completed
  const incompleteRepairs = repairs.filter((repair: any) => repair.status !== 'COMPLETED');
  const allRepairsCompleted = repairs.length === 0 || incompleteRepairs.length === 0;
  
  const canCreate = ticket?.status === 'RESOLVED' 
    && !ticket?.cassetteReturn 
    && allRepairsCompleted;

  return (
    <PageLayout>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Calendar icon styling for dark mode */
          input[type="date"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.7;
          }
          
          .dark input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.9;
          }
          
          /* Firefox */
          input[type="date"]::-moz-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.7;
          }
          
          .dark input[type="date"]::-moz-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.9;
          }
        `
      }} />
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          {/* Header Card - Compact */}
          <div className="mb-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#1e293b] dark:to-[#0f172a] rounded-xl p-4 shadow-lg border border-slate-300 dark:border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Kirim Kembali ke Pengelola</h1>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mt-0.5">
                      SO: <span className="font-mono font-bold">{ticket.ticketNumber}</span>
                      {isMultiCassette && <span className="ml-2 text-teal-600 dark:text-teal-400 font-bold">• {cassetteCount} Kaset</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="mb-4 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Progress Service Order
            </h3>
            <div className="relative">
              <div className="flex justify-between items-start">
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-teal-400"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-teal-500">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-600 dark:text-teal-400">Diterima RC</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-teal-400"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-teal-500">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-600 dark:text-teal-400">Repair</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/50 scale-110">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-700 dark:text-teal-300">Kirim Kembali</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cassettes List */}
          <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                  {isReplacementTicket 
                    ? (isMultiCassette ? `${cassetteCount} Kaset Baru Siap untuk Pickup:` : 'Kaset Baru Siap untuk Pickup:')
                    : (isMultiCassette ? `${cassetteCount} Kaset Siap untuk Pickup:` : 'Kaset Siap untuk Pickup:')
                  }
                </p>
                <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold px-2 py-0.5 text-xs">
                  {cassetteCount} Item
                </Badge>
              </div>
              {isReplacementTicket && (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/50 rounded text-xs text-blue-800 dark:text-blue-300">
                  ℹ️ <strong>Replacement Ticket:</strong> Yang di-pickup adalah kaset baru (SN baru) yang sudah dibuat melalui form replacement. Kaset lama (SN lama) sudah di-mark sebagai SCRAPPED.
                </div>
              )}
              {isMultiCassette ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {allCassettes.map((cassette: any, index: number) => (
                    <div key={cassette.id} className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/30 p-3 rounded-lg border border-teal-200 dark:border-teal-500/30">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-extrabold text-teal-700 dark:text-teal-300 truncate">
                          {cassette.serialNumber}
                        </p>
                        {cassette.cassetteType && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                            {cassette.cassetteType.typeCode}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-lg border border-teal-200 dark:border-teal-500/30">
                  <p className="font-mono text-xl font-extrabold text-teal-700 dark:text-teal-300 text-center mb-2">
                    {allCassettes[0]?.serialNumber}
                  </p>
                  {allCassettes[0]?.cassetteType && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold text-center">
                      {allCassettes[0].cassetteType.typeCode}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SO Info */}
          <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold mb-3 uppercase tracking-wider">Service Order</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Title:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{ticket.title}</span>
                </div>
                {ticket.machine && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Mesin:</span>
                      <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ticket.machine.serialNumberManufacturer}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Bank:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {ticket.machine.customerBank?.bankName || 'N/A'}
                      </span>
                    </div>
                  </>
                )}
                {ticket.reporter && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Reporter:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ticket.reporter.fullName || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Action Panel */}
        <div>
          <Card className="border-2 border-teal-200 dark:border-teal-500/50 bg-white dark:bg-slate-800 sticky top-6 rounded-xl">
            <CardContent className="p-5">
              {canCreate ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Konfirmasi Pickup</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                      Konfirmasi bahwa Pengelola telah mengambil kaset di RC
                    </p>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Catatan (Opsional)
                    </label>
                    <Textarea
                      placeholder={isMultiCassette 
                        ? `Kondisi ${cassetteCount} kaset, dll...` 
                        : "Kondisi kaset, dll..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-500/50 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-500/50 rounded-lg p-3">
                      <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        {success}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-3">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold shadow-lg"
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Truck className="h-5 w-5 mr-2" />
                          {isMultiCassette ? `Kirim ${cassetteCount} Kaset` : 'Kirim Kaset'}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={submitting}
                      className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-semibold">
                    {ticket?.status !== 'RESOLVED'
                      ? `Status SO: ${ticket?.status}. Harus RESOLVED untuk kirim kembali.`
                      : ticket?.cassetteReturn
                      ? 'Return delivery sudah dibuat.'
                      : incompleteRepairs.length > 0
                      ? `Tidak bisa mengirim kembali! Masih ada ${incompleteRepairs.length} kaset yang belum selesai diperbaiki.`
                      : 'Tidak dapat membuat return delivery.'}
                  </p>
                  {incompleteRepairs.length > 0 && (
                    <div className="mt-3 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg text-left">
                      <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2 uppercase tracking-wider">Kaset yang belum selesai:</p>
                      <ul className="text-xs text-red-600 dark:text-red-200 space-y-1">
                        {incompleteRepairs.map((repair: any) => (
                          <li key={repair.id} className="flex items-center gap-2">
                            <span className="font-mono font-bold">{repair.cassette?.serialNumber || 'N/A'}</span>
                            <span className="text-red-500 dark:text-red-400">- {repair.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/tickets')}
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
                  >
                    Kembali ke Daftar SO
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </PageLayout>
  );
}
