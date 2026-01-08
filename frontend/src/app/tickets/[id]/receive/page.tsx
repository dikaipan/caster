'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

export default function ReceiveDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return;

      try {
        const response = await api.get(`/tickets/${ticketId}`);
        setTicket(response.data);

        if (response.data.status !== 'IN_DELIVERY') {
          setError(`Status SO harus "IN_DELIVERY" untuk bisa diterima.`);
        }

        if (response.data.cassetteDelivery?.receivedAtRc) {
          setError('Kaset sudah diterima di RC.');
        }
      } catch (error: any) {
        console.error('Error fetching ticket:', error);
        setError(error.response?.data?.message || 'SO tidak ditemukan');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && ticketId) {
      fetchTicket();
    }
  }, [isAuthenticated, ticketId]);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post(`/tickets/${ticketId}/receive-delivery`, {
        notes: notes.trim() || undefined,
      });

      const allCassettesTemp = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
        ? ticket.cassetteDetails.map((detail: any) => detail.cassette)
        : [ticket.cassette].filter(Boolean);
      const count = allCassettesTemp.length;

      setSuccess(count > 1 
        ? `✅ ${count} kaset berhasil diterima di RC!` 
        : '✅ Kaset berhasil diterima di RC!'
      );
      
      setTimeout(() => {
        router.push(`/tickets/${ticketId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menerima kaset. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
            <p className="text-lg font-medium text-slate-300">Memuat data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.userType !== 'HITACHI') {
    return (
      <PageLayout>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-slate-200 font-bold text-lg mb-2">Akses Ditolak</p>
            <p className="text-slate-400">Hanya untuk RC Staff.</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (!ticket) {
    return (
      <PageLayout>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-200 font-bold text-lg">Service Order tidak ditemukan</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const delivery = ticket.cassetteDelivery;
  const canReceive = ticket.status === 'IN_DELIVERY' && delivery && !delivery.receivedAtRc;

  // Get all cassettes (multi-cassette or single)
  const allCassettes = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
    ? ticket.cassetteDetails.map((detail: any) => detail.cassette)
    : [ticket.cassette].filter(Boolean);

  const cassetteCount = allCassettes.length;
  const isMultiCassette = cassetteCount > 1;

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
          <div className="mb-4 bg-gradient-to-r from-[#1e293b] to-[#0f172a] rounded-xl p-4 shadow-lg border border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Terima Kaset di RC</h1>
                    <p className="text-slate-300 text-sm font-medium mt-0.5">
                      SO: <span className="font-mono font-bold">{ticket.ticketNumber}</span>
                      {isMultiCassette && <span className="ml-2 text-teal-400 font-bold">• {cassetteCount} Kaset</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="mb-4 bg-[#1e293b] rounded-xl shadow-lg border-2 border-slate-700">
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-teal-400" />
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
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-400">Kirim ke RC</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-teal-400"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/50 scale-110">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-teal-300">Diterima RC</span>
                </div>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="absolute top-7 left-1/2 w-full h-1 -z-10">
                    <div className="h-full bg-slate-600"></div>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center z-10 mb-2 bg-slate-700 border-2 border-slate-600">
                    <Wrench className="h-6 w-6 text-slate-400" />
                  </div>
                  <span className="text-xs text-center font-semibold max-w-[80px] leading-tight text-slate-500">Repair</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Shipping Info Card */}
          <Card className="bg-slate-800 border-2 border-slate-700 rounded-xl">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                {/* Sender Info */}
                <div>
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Pengirim</span>
                  </div>
                  <p className="text-sm font-bold text-slate-100">{delivery?.sender?.fullName || 'N/A'}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {delivery?.sender?.pengelola?.companyName || 'N/A'}
                  </p>
                </div>

                {/* Shipping Info */}
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Truck className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Kurir</span>
                  </div>
                  <p className="text-sm font-bold text-slate-100">{delivery?.courierService || 'N/A'}</p>
                  {delivery?.trackingNumber && (
                    <p className="text-xs text-slate-400 font-mono font-semibold mt-0.5">
                      {delivery.trackingNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    Dikirim
                  </p>
                  <p className="font-bold text-slate-100 mt-1.5">
                    {delivery?.shippedDate
                      ? new Date(delivery.shippedDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
                {delivery?.estimatedArrival && (
                  <div>
                    <p className="text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      Estimasi Tiba
                    </p>
                    <p className="font-bold text-slate-100 mt-1.5">
                      {new Date(delivery.estimatedArrival).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Sender Address */}
              {delivery?.senderAddress && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-2 font-bold uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" />
                    Alamat Pengirim
                  </p>
                  <p className="text-sm text-slate-200 font-medium">
                    {delivery.senderAddress}, {delivery.senderCity}, {delivery.senderProvince} {delivery.senderPostalCode}
                  </p>
                  {delivery.senderContactName && (
                    <p className="text-xs text-slate-400 font-semibold mt-1.5">
                      Kontak: {delivery.senderContactName} ({delivery.senderContactPhone})
                    </p>
                  )}
                </div>
              )}

              {/* Pengelola Notes */}
              {delivery?.notes && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Catatan Pengelola:</p>
                  <p className="text-sm text-slate-200 font-medium bg-slate-900 p-3 rounded-lg border border-slate-600">
                    {delivery.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SO Info */}
          <Card className="bg-slate-800 border-2 border-slate-700 rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 font-extrabold mb-3 uppercase tracking-wider">Service Order</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400 font-semibold">Title:</span>
                  <span className="text-sm font-bold text-slate-100">{ticket.title}</span>
                </div>
                {ticket.machine && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 font-semibold">Mesin:</span>
                      <span className="text-sm font-mono font-bold text-slate-100">
                        {ticket.machine.serialNumberManufacturer}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 font-semibold">Bank:</span>
                      <span className="text-sm font-bold text-slate-100">
                        {ticket.machine.customerBank?.bankName || 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Action Panel */}
        <div>
          <Card className="border-2 border-teal-500/50 bg-slate-800 sticky top-6 rounded-xl">
            <CardContent className="p-5">
              {canReceive ? (
                <form onSubmit={handleReceive} className="space-y-4">
                  <div className="text-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-100">Konfirmasi Penerimaan</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Verifikasi serial number kaset yang diterima
                    </p>
                  </div>

                  {/* Kaset List for Verification */}
                  <div className="bg-slate-900 border-2 border-teal-500/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                        {isMultiCassette ? `${cassetteCount} Kaset:` : 'Kaset:'}
                      </p>
                      <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold px-2 py-0.5 text-xs">
                        {cassetteCount} Item
                      </Badge>
                    </div>
                    {isMultiCassette ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                        {allCassettes.map((cassette: any, index: number) => (
                          <div key={cassette.id} className="flex items-center gap-3 bg-teal-900/30 p-3 rounded-lg border border-teal-500/30">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm font-extrabold text-teal-300 truncate">
                                {cassette.serialNumber}
                              </p>
                              {cassette.cassetteType && (
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                  {cassette.cassetteType.typeCode}
                                </p>
                              )}
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-teal-900/30 p-4 rounded-lg border border-teal-500/30">
                        <p className="font-mono text-xl font-extrabold text-teal-300 text-center mb-2">
                          {allCassettes[0]?.serialNumber}
                        </p>
                        {allCassettes[0]?.cassetteType && (
                          <p className="text-xs text-slate-400 font-semibold text-center">
                            {allCassettes[0].cassetteType.typeCode}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                      Catatan (Opsional)
                    </label>
                    <Textarea
                      placeholder={isMultiCassette 
                        ? `Kondisi ${cassetteCount} kaset, kelengkapan, dll...` 
                        : "Kondisi fisik kaset, kelengkapan, dll..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="text-sm bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-3">
                      <p className="text-sm text-red-300 flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {success && (
                    <div className="bg-green-900/20 border-2 border-green-500/50 rounded-lg p-3">
                      <p className="text-sm text-green-300 flex items-center gap-2 font-semibold">
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
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold"
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-300 mb-4 font-semibold">
                    {!delivery
                      ? 'Data pengiriman tidak ditemukan'
                      : delivery.receivedAtRc
                        ? 'Kaset sudah diterima di RC'
                        : `Status SO: ${ticket.status}`}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/tickets')}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold"
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

