'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import PageLayout from '@/components/layout/PageLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  User,
  Clock,
  FileText,
  Monitor,
  Home,
  Calendar,
  Hash,
  Wrench,
} from 'lucide-react';

export default function ReceiveReturnPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { user } = useAuthStore();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await api.get(`/tickets/${ticketId}`);
        setTicket(response.data);

        if (!response.data.cassetteReturn) {
          setMessage({ type: 'error', text: 'Belum ada return delivery untuk SO ini.' });
        } else if (response.data.cassetteReturn.receivedAtPengelola) {
          setMessage({ type: 'error', text: 'Kaset sudah diterima di pengelola.' });
        }
      } catch (error: any) {
        console.error('Error fetching ticket:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal memuat SO' });
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      await api.post(`/tickets/${ticketId}/receive-return`, { notes });
      setMessage({ type: 'success', text: '✅ Kaset berhasil diterima! Redirect...' });
      
      setTimeout(() => {
        router.push('/tickets');
      }, 1500);
    } catch (error: any) {
      console.error('Error receiving return:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal konfirmasi penerimaan' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get all cassettes
  const allCassettes = ticket?.cassetteDetails && ticket.cassetteDetails.length > 0
    ? ticket.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
    : (ticket?.cassette ? [ticket.cassette] : []);

  const cassetteCount = allCassettes.length;
  const isMultiCassette = cassetteCount > 1;
  const returnInfo = ticket?.cassetteReturn;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Memuat data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!ticket) {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-200 font-bold text-lg mb-2">Service Order tidak ditemukan</p>
            <Button 
              variant="outline" 
              className="mt-4 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold" 
              onClick={() => router.push('/tickets')}
            >
              Kembali
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const canConfirm = returnInfo && !returnInfo.receivedAtPengelola;

  return (
    <PageLayout>
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
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Terima Kaset dari RC</h1>
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
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-600 dark:text-teal-400">Repair</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-teal-400"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-teal-500">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-600 dark:text-teal-400">Dikirim</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/50 scale-110">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-700 dark:text-teal-300">Diterima</span>
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
                  {isMultiCassette ? `${cassetteCount} Kaset Diterima:` : 'Kaset Diterima:'}
                </p>
                <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold px-2 py-0.5 text-xs">
                  {cassetteCount} Item
                </Badge>
              </div>
              {isMultiCassette ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
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

          {/* Shipping Info Card */}
          {returnInfo && (
            <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Sender Info */}
                  {returnInfo.sender && (
                    <div>
                      <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
                        <User className="h-4 w-4" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Pengirim</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{returnInfo.sender.fullName || 'N/A'}</p>
                    </div>
                  )}

                  {/* Shipping Info */}
                  {returnInfo.courierService && (
                    <div>
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Truck className="h-4 w-4" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Kurir</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{returnInfo.courierService}</p>
                      {returnInfo.trackingNumber && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono font-semibold mt-0.5">
                          {returnInfo.trackingNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      Dikirim
                    </p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                      {returnInfo.shippedDate
                        ? formatDateTime(returnInfo.shippedDate)
                        : 'N/A'}
                    </p>
                  </div>
                  {returnInfo.estimatedArrival && (
                    <div>
                      <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        Estimasi Tiba
                      </p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                        {formatDateTime(returnInfo.estimatedArrival)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {returnInfo.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider">Catatan Pengiriman:</p>
                    <p className="text-sm text-slate-900 dark:text-slate-200 font-medium bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-300 dark:border-slate-600">
                      {returnInfo.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
              {canConfirm && message?.type !== 'success' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
                      <Home className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Konfirmasi Penerimaan</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                      {isMultiCassette 
                        ? `Konfirmasi ${cassetteCount} kaset sudah diterima`
                        : 'Konfirmasi kaset sudah diterima'
                      }
                    </p>
                  </div>

                  {/* Verification Checklist */}
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-500/50 rounded-lg">
                    <p className="text-xs font-extrabold text-yellow-700 dark:text-yellow-300 mb-2 uppercase tracking-wider">✓ Pastikan:</p>
                    <ul className="text-xs text-yellow-600 dark:text-yellow-200/90 space-y-1.5 font-medium">
                      <li>• {isMultiCassette ? 'Semua kaset' : 'Kaset'} sudah diterima fisik</li>
                      <li>• Kondisi {isMultiCassette ? 'kaset-kaset' : 'kaset'} baik</li>
                      <li>• Serial number sesuai</li>
                      <li>• Tidak ada kerusakan fisik</li>
                    </ul>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Catatan Penerimaan
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isMultiCassette 
                        ? `Kondisi ${cassetteCount} kaset, dll...` 
                        : "Kondisi kaset saat diterima, dll..."}
                      rows={4}
                      className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                    />
                  </div>

                  {/* Error */}
                  {message && message.type === 'error' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-500/50 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        {message.text}
                      </p>
                    </div>
                  )}

                  {/* Actions - Form only shown when message.type !== 'success' */}
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
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {isMultiCassette ? `Terima ${cassetteCount} Kaset` : 'Terima Kaset'}
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

                  <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 text-center font-semibold">
                      💡 Setelah konfirmasi, SO akan otomatis ditutup (CLOSED)
                    </p>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  {message?.type === 'success' ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-lg font-extrabold text-green-600 dark:text-green-400 mb-2">Berhasil!</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Kaset sudah diterima. SO ditutup otomatis.</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-semibold">
                        {!returnInfo
                          ? 'Belum ada return delivery untuk SO ini.'
                          : 'Kaset sudah diterima di pengelola.'}
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push('/tickets')}
                        className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
                      >
                        Kembali ke Daftar SO
                      </Button>
                    </>
                  )}
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

