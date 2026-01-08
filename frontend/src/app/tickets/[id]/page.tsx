'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';
import PDFDownloadButton from '@/components/reports/PDFDownloadButton';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { markTicketAsViewed } from '@/lib/viewed-tickets';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Wrench,
  Truck,
  FileText,
  User,
  Building2,
  Monitor,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Inbox,
  Truck as TruckIcon,
  Trash2,
  MapPin,
  RefreshCw,
  Eye,
  Download,
} from 'lucide-react';

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const ticketId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [ticket, setTicket] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingRepairs, setCreatingRepairs] = useState(false);
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
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [showStartRepairDialog, setShowStartRepairDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const isHitachi = user?.userType === 'HITACHI';
  const isPengelola = user?.userType === 'PENGELOLA';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isRcManager = user?.role === 'RC_MANAGER';

  // Only Hitachi users can delete tickets
  // Only SUPER_ADMIN can delete CLOSED tickets
  // RC_MANAGER and SUPER_ADMIN can delete non-CLOSED tickets
  // RC_STAFF cannot delete tickets
  const canDelete = isHitachi && (
    isSuperAdmin ||
    (isRcManager && ticket?.status !== 'CLOSED')
  );

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
      try {
        // Fetch ticket
        const ticketResponse = await api.get(`/tickets/${ticketId}`);
        const ticketData = ticketResponse.data;
        setTicket(ticketData);

        // Debug: Log ticket data to help troubleshoot
        console.log('Ticket data:', {
          id: ticketData?.id,
          status: ticketData?.status,
          deliveryMethod: ticketData?.deliveryMethod,
          hasCassetteDelivery: !!ticketData?.cassetteDelivery,
          courierService: ticketData?.cassetteDelivery?.courierService,
          receivedAtRc: ticketData?.cassetteDelivery?.receivedAtRc,
          userType: user?.userType,
          isHitachi: user?.userType === 'HITACHI',
          canShowReceiveButton: (ticketData?.cassetteDelivery && !ticketData?.cassetteDelivery?.receivedAtRc) ||
            (ticketData?.deliveryMethod === 'SELF_DELIVERY' && !ticketData?.cassetteDelivery &&
              (ticketData?.status === 'OPEN' || ticketData?.status === 'IN_DELIVERY')),
          // Debug for "Mulai Repair" button
          canShowStartRepair: ticketData?.status === 'RECEIVED' &&
            !ticketData?.cassetteDetails?.some((detail: any) => detail.requestReplacement === true),
          hasRequestReplacement: ticketData?.cassetteDetails?.some((detail: any) => detail.requestReplacement === true),
          cassetteDetailsCount: ticketData?.cassetteDetails?.length || 0,
          cassetteDetails: ticketData?.cassetteDetails?.map((d: any) => ({
            id: d.id,
            requestReplacement: d.requestReplacement,
            cassetteId: d.cassetteId
          })) || [],
        });

        // Mark ticket as viewed if it's a new ticket (OPEN or IN_DELIVERY status)
        if (ticketData && (ticketData.status === 'OPEN' || ticketData.status === 'IN_DELIVERY')) {
          markTicketAsViewed(ticketId);
        }

        // Get all cassettes for this ticket
        const allCassettes = ticketResponse.data.cassetteDetails && ticketResponse.data.cassetteDetails.length > 0
          ? ticketResponse.data.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any) => c !== null)
          : (ticketResponse.data.cassette ? [ticketResponse.data.cassette] : []);

        const cassetteIds = allCassettes.map((c: any) => c.id);

        // Fetch repairs if user is Hitachi - use optimized endpoint
        if (isAuthenticated && user?.userType === 'HITACHI') {
          try {
            const repairsResponse = await api.get(`/repairs/by-ticket/${ticketId}`);
            setRepairs(repairsResponse.data || []);
          } catch (repairError) {
            console.warn('Could not fetch repairs:', repairError);
            setRepairs([]);
          }
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && ticketId) {
      fetchData();
    }
  }, [isAuthenticated, ticketId, user?.userType]);

  const getStatusBadge = (status: string) => {
    // UI status labels disesuaikan dengan flow baru (pickup di RC, tanpa pengiriman balik)
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      OPEN: { label: 'Open', variant: 'bg-[#2563EB] text-white', icon: AlertCircle },
      PENDING_APPROVAL: { label: 'Menunggu Approval', variant: 'bg-orange-500 text-white', icon: Clock },
      APPROVED_ON_SITE: { label: 'On-Site Approved', variant: 'bg-teal-500 text-white', icon: CheckCircle2 },
      IN_DELIVERY: { label: 'Dalam Pengiriman ke RC', variant: 'bg-amber-500 text-white', icon: Package },
      RECEIVED: { label: 'Diterima di RC', variant: 'bg-sky-600 text-white', icon: Inbox },
      IN_PROGRESS: { label: 'Sedang Diperbaiki', variant: 'bg-yellow-500 text-white', icon: Wrench },
      RESOLVED: { label: 'Siap Di-pickup di RC', variant: 'bg-green-600 text-white', icon: CheckCircle2 },
      CLOSED: { label: 'Selesai', variant: 'bg-gray-600 text-white', icon: CheckCircle2 },
    };
    return configs[status] || configs.OPEN;
  };

  const getPriorityBadge = (priority: string) => {
    const configs: Record<string, { label: string; variant: string }> = {
      CRITICAL: { label: 'Kritis', variant: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' },
      HIGH: { label: 'Tinggi', variant: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
      MEDIUM: { label: 'Sedang', variant: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700' },
      LOW: { label: 'Rendah', variant: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' },
    };
    return configs[priority] || configs.MEDIUM;
  };

  const getRepairStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      RECEIVED: { label: 'Received', variant: 'bg-blue-500 text-white', icon: Package },
      DIAGNOSING: { label: 'Diagnosing', variant: 'bg-yellow-500 text-white', icon: AlertCircle },
      ON_PROGRESS: { label: 'On Progress', variant: 'bg-orange-500 text-white', icon: Wrench },
      COMPLETED: { label: 'Completed', variant: 'bg-green-500 text-white', icon: CheckCircle2 },
    };
    return configs[status] || { label: status, variant: 'bg-gray-500 text-white', icon: FileText };
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tickets/${ticketId}`);
      toast({
        title: 'Berhasil',
        description: 'Service Order berhasil dihapus. Status cassette telah dikembalikan ke OK.',
        variant: 'default',
      });
      // Check if user came from history page (via query param or referrer) or if ticket is CLOSED
      const fromHistory = searchParams.get('from') === 'history' ||
        (typeof window !== 'undefined' && document.referrer.includes('/history')) ||
        ticket?.status === 'CLOSED';

      // Small delay to show toast before navigation
      setTimeout(() => {
        if (fromHistory) {
          router.push('/history');
        } else {
          router.push('/tickets');
        }
      }, 500);
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal menghapus Service Order',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleConfirmPickup = async () => {
    // Check if this is disposal confirmation for SCRAPPED cassettes
    // IMPORTANT: Replacement tickets NEVER have disposal flow - SCRAPPED cassettes are replaced with new ones
    const readyForPickup = allCassettes.filter((c: any) => c.status === 'READY_FOR_PICKUP');
    const isDisposal = !isReplacementTicket && hasScrappedCassettes && !hasReplacementForScrapped && readyForPickup.length === 0;

    if (!pickupConfirmed) {
      toast({
        title: 'Konfirmasi Diperlukan',
        description: isDisposal
          ? 'Silakan centang konfirmasi bahwa kaset SCRAPPED telah dikonfirmasi untuk disposal.'
          : 'Silakan centang konfirmasi bahwa kaset telah diambil dengan kondisi baik.',
        variant: 'destructive',
      });
      return;
    }

    // Only require signature for pickup flow, not disposal
    if (!isDisposal && !pickupSignature) {
      toast({
        title: 'Tanda Tangan Diperlukan',
        description: 'Silakan berikan tanda tangan digital untuk konfirmasi pickup.',
        variant: 'destructive',
      });
      return;
    }

    if (!isDisposal && (!pickupRecipientName.trim() || !pickupRecipientPhone.trim())) {
      toast({
        title: 'Data Pengambil Diperlukan',
        description: 'Silakan isi nama pengambil dan nomor HP.',
        variant: 'destructive',
      });
      return;
    }

    setConfirmingPickup(true);
    try {
      const pickupDateTime = `${pickupDate}T${pickupTime}:00`;

      const notes = isDisposal
        ? [
          `Tanggal/Waktu Konfirmasi Disposal: ${new Date(pickupDateTime).toLocaleString('id-ID')}`,
          `Status Kaset: SCRAPPED (Tidak bisa diperbaiki, tidak lolos QC)`,
          `Kaset tetap di RC untuk disposal`,
          `Dikonfirmasi oleh: ${user?.fullName || user?.username || 'N/A'}`,
          pickupNotes.trim() ? `Catatan: ${pickupNotes.trim()}` : null,
        ].filter(Boolean).join('\n')
        : [
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
        rcSignature: isDisposal ? undefined : (pickupSignature || undefined),
        signature: isDisposal ? undefined : (pickupSignature || undefined), // For backward compatibility
      };

      await api.post('/tickets/return', payload);

      toast({
        title: 'Berhasil',
        description: isDisposal
          ? 'Disposal berhasil dikonfirmasi. Kaset tetap di RC untuk disposal dan ticket menjadi CLOSED.'
          : 'Konfirmasi pickup berhasil. Ticket menjadi CLOSED.',
      });

      setShowPickupDialog(false);
      setPickupNotes('');
      setPickupDate(new Date().toISOString().split('T')[0]);
      setPickupTime(new Date().toTimeString().slice(0, 5));
      setPickupCondition('GOOD');
      setPickupSignature(null);
      setPickupConfirmed(false);
      setPickupRecipientName('');
      setPickupRecipientPhone('');

      // Refresh ticket data
      const response = await api.get(`/tickets/${ticketId}`);
      setTicket(response.data);
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

  const handleReceiveDelivery = async () => {
    setReceiving(true);
    try {
      await api.post(`/tickets/${ticketId}/receive-delivery`, {
        notes: receiveNotes.trim() || undefined,
      });

      toast({
        title: 'Berhasil',
        description: isMultiCassette
          ? `${cassetteCount} kaset berhasil diterima di RC. Status ticket berubah menjadi RECEIVED.`
          : 'Kaset berhasil diterima di RC. Status ticket berubah menjadi RECEIVED.',
      });

      setShowReceiveDialog(false);
      setReceiveNotes('');

      // Refresh ticket data
      const response = await api.get(`/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (error: any) {
      console.error('Error receiving delivery:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal menerima kaset',
        variant: 'destructive',
      });
    } finally {
      setReceiving(false);
    }
  };

  const handleStartRepair = async () => {
    setCreatingRepairs(true);
    try {
      const response = await api.post(`/repairs/bulk-from-ticket/${ticketId}`);

      toast({
        title: 'Berhasil!',
        description: `${response.data.count} repair ticket telah dibuat. Silakan lihat di halaman Repairs untuk mengelola repair.`,
        variant: 'default',
      });

      // Close dialog
      setShowStartRepairDialog(false);

      // Refresh ticket data first
      const ticketResponse = await api.get(`/tickets/${ticketId}`);
      setTicket(ticketResponse.data);

      // Refresh repairs data - use optimized endpoint
      if (isHitachi) {
        try {
          const repairsResponse = await api.get(`/repairs/by-ticket/${ticketId}`);
          const repairsData = repairsResponse.data || [];
          setRepairs(repairsData);
          
          // If repairs were created but ticket status hasn't updated yet, refresh again after a short delay
          if (repairsData.length > 0 && ticketResponse.data.status === 'APPROVED_ON_SITE') {
            setTimeout(async () => {
              try {
                const refreshedTicket = await api.get(`/tickets/${ticketId}`);
                setTicket(refreshedTicket.data);
              } catch (error) {
                console.warn('Could not refresh ticket status:', error);
              }
            }, 1000);
          }
        } catch (repairError) {
          console.warn('Could not refresh repairs:', repairError);
        }
      }
    } catch (error: any) {
      console.error('Error creating repairs:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      // Extract error message from various possible locations
      let errorMessage = 'Terjadi kesalahan saat membuat repair tickets. Silakan coba lagi.';

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Gagal Membuat Repair Tickets',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setCreatingRepairs(false);
    }
  };

  const handleApproveOnSiteRepair = async () => {
    setApproving(true);
    try {
      const response = await api.patch(`/tickets/${ticketId}/approve-on-site`);
      setTicket(response.data);
      toast({
        title: 'Berhasil!',
        description: 'On-site repair request telah disetujui. RC Staff dapat mulai melakukan repair di lokasi pengelola.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error approving on-site repair:', error);
      toast({
        title: 'Gagal',
        description: error.response?.data?.message || 'Gagal menyetujui on-site repair request',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleRejectOnSiteRepair = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Alasan Diperlukan',
        description: 'Silakan masukkan alasan penolakan.',
        variant: 'destructive',
      });
      return;
    }

    setRejecting(true);
    try {
      const response = await api.patch(`/tickets/${ticketId}/reject-on-site`, {
        reason: rejectReason.trim(),
      });
      setTicket(response.data);
      setShowRejectDialog(false);
      setRejectReason('');
      toast({
        title: 'Berhasil',
        description: 'On-site repair request telah ditolak. Ticket akan kembali ke flow normal (repair di RC).',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error rejecting on-site repair:', error);
      toast({
        title: 'Gagal',
        description: error.response?.data?.message || 'Gagal menolak on-site repair request',
        variant: 'destructive',
      });
    } finally {
      setRejecting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] dark:text-teal-400" />
            <p className="text-lg font-medium text-gray-600 dark:text-slate-300">Memuat detail SO...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || !ticket) {
    return null;
  }

  // Effective status untuk UI:
  // Jika semua repair sudah COMPLETED (dan ini bukan replacement ticket),
  // anggap status SO = RESOLVED (Ready for Pickup) walaupun backend
  // mungkin masih IN_PROGRESS karena delay sinkronisasi.
  const allCassettes = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
    ? ticket.cassetteDetails.map((detail: any) => detail.cassette)
    : [ticket.cassette].filter(Boolean);

  const cassetteCount = allCassettes.length;
  const isMultiCassette = cassetteCount > 1;

  // Check if this is a replacement ticket (no repair tickets needed)
  const isReplacementTicket = ticket.requestReplacement === true ||
    ticket.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);

  // Check if all repair tickets are completed (only for non-replacement tickets)
  const completedRepairs = repairs.filter((r: any) => r.status === 'COMPLETED');
  const completedCount = completedRepairs.length;

  // Count only repairs that are completed AND passed QC (READY_FOR_PICKUP), not SCRAPPED
  const successfullyRepairedCount = allCassettes.filter((c: any) => c.status === 'READY_FOR_PICKUP').length;
  const scrappedCount = allCassettes.filter((c: any) => c.status === 'SCRAPPED').length;

  // All repairs are completed when all cassettes are either READY_FOR_PICKUP or SCRAPPED
  const allRepairsCompleted = repairs.length > 0 && repairs.length === cassetteCount &&
    repairs.every((r: any) => r.status === 'COMPLETED') &&
    allCassettes.every((c: any) => c.status === 'READY_FOR_PICKUP' || c.status === 'SCRAPPED');

  // Effective status untuk keperluan UI (progress bar + cards)
  const effectiveStatus =
    !isReplacementTicket && allRepairsCompleted && ticket.status !== 'CLOSED'
      ? 'RESOLVED'
      : ticket.status;

  const statusBadge = getStatusBadge(effectiveStatus);
  const priorityBadge = getPriorityBadge(ticket.priority);
  const StatusIcon = statusBadge.icon;

  // Status flow UI (flow baru, pickup-based):
  // Normal: OPEN → IN_DELIVERY → RECEIVED → IN_PROGRESS → RESOLVED (ready for pickup) → CLOSED
  // On-Site: OPEN → PENDING_APPROVAL → APPROVED_ON_SITE → IN_PROGRESS → RESOLVED → CLOSED
  const statusSteps = ticket.repairLocation === 'ON_SITE' 
    ? ['OPEN', 'PENDING_APPROVAL', 'APPROVED_ON_SITE', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
    : ['OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const currentStepIndex = statusSteps.indexOf(effectiveStatus);

  // Handle case where status is not in steps (shouldn't happen, but safety check)
  const validStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  // Check if any cassettes are SCRAPPED (for disposal confirmation)
  const hasScrappedCassettes = allCassettes.some((c: any) => c.status === 'SCRAPPED');
  const allCassettesScrapped = allCassettes.length > 0 && allCassettes.every((c: any) => c.status === 'SCRAPPED');
  const hasReplacementForScrapped = allCassettesScrapped && isReplacementTicket;

  // For pickup: only count cassettes that are READY_FOR_PICKUP (not SCRAPPED)
  // For disposal: count all SCRAPPED cassettes
  const readyForPickupCassettes = allCassettes.filter((c: any) => c.status === 'READY_FOR_PICKUP');
  const scrappedCassettes = allCassettes.filter((c: any) => c.status === 'SCRAPPED');

  // Determine if this is a disposal confirmation or pickup confirmation
  // Priority: if there are READY_FOR_PICKUP cassettes, it's a pickup (even if there are also SCRAPPED)
  // Only show disposal if ALL cassettes are SCRAPPED (and not replacement ticket)
  // IMPORTANT: Replacement tickets NEVER show disposal - SCRAPPED cassettes are replaced with new ones
  const isDisposalFlow = !isReplacementTicket && hasScrappedCassettes && !hasReplacementForScrapped && readyForPickupCassettes.length === 0;

  const pickupCassetteCount = isDisposalFlow
    ? scrappedCassettes.length
    : readyForPickupCassettes.length;
  const isMultiPickup = pickupCassetteCount > 1;

  // For replacement tickets: only check if status is RESOLVED (replacement already done)
  // For repair tickets: check if effectiveStatus is RESOLVED (which already considers allRepairsCompleted)
  // For SCRAPPED cassettes: allow disposal confirmation (kaset tidak bisa diperbaiki, tetap di RC)
  // Use effectiveStatus instead of ticket.status to handle cases where backend hasn't synced yet
  // Flow baru: pickup-based (Pengelola pickup di RC), bukan shipping-based
  // Only RC staff can confirm pickup (on behalf of Pengelola)
  const hasReturnRecord = !!ticket.cassetteReturn;

  // RC can confirm if ticket is RESOLVED (either actual status or effective status) and pickup hasn't been confirmed yet
  // Check BOTH ticket.status and effectiveStatus to handle cases where backend has updated but frontend calculation differs
  const canConfirmPickup = (ticket.status === 'RESOLVED' || effectiveStatus === 'RESOLVED') &&
    (isReplacementTicket || allRepairsCompleted || (hasScrappedCassettes && !hasReplacementForScrapped)) &&
    !hasReturnRecord &&
    (isHitachi || isSuperAdmin);

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          {/* Download PDF Report - Only for Hitachi users */}
          {ticket && repairs && isHitachi && (
            <PDFDownloadButton
              ticket={ticket}
              repairs={repairs}
              user={user}
              disabled={ticket.status !== 'CLOSED'}
            />
          )}
        </div>

        {/* Header Card - Compact */}
        <div className="mb-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#1e293b] dark:to-[#0f172a] rounded-xl p-4 shadow-lg border border-slate-300 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{ticket.ticketNumber || `Ticket ${ticketId}`}</h1>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mt-0.5">{ticket.title || 'No title'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={`${statusBadge.variant} text-xs px-2.5 py-1 font-bold`}>
                  <StatusIcon className="h-3.5 w-3.5 mr-1" />
                  {statusBadge.label}
                </Badge>
                <Badge className={`${priorityBadge.variant} border text-xs px-2.5 py-1 font-bold`}>
                  {priorityBadge.label}
                </Badge>

                {/* Cassette Count Badge */}
                {cassetteCount > 0 && (
                  <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded border-2 border-teal-500 dark:border-teal-500/50">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        {cassetteCount} {cassetteCount > 1 ? 'Kaset' : 'Kaset'}
                      </span>
                    </div>
                  </div>
                )}
                {/* On-Site Repair Badge */}
                {ticket.repairLocation === 'ON_SITE' && (
                  <Badge className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 text-xs px-2.5 py-1 font-bold">
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    On-Site Repair
                  </Badge>
                )}
              </div>
            </div>

            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="self-start font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Hapus
              </Button>
            )}
          </div>
        </div>

        {/* Progress Tracker - Compact */}
        <div className="mb-3 bg-slate-100 dark:bg-[#1e293b] rounded-lg p-3 shadow-md border border-slate-300 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Truck className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
            Progress Service Order
          </h3>
          <div className="relative">
            <div className="flex justify-between items-start">
              {statusSteps.map((status, index) => {
                const isActive = validStepIndex === index;
                const isPassed = validStepIndex > index;
                // Ikon per langkah disesuaikan dengan 6 step flow baru
                const stepIcons = [FileText, Package, Inbox, Wrench, CheckCircle2, CheckCircle2];
                const StepIcon = stepIcons[index] || FileText;

                return (
                  <div key={status} className="flex flex-col items-center flex-1 relative">
                    {/* Connection Line */}
                    {index < statusSteps.length - 1 && (
                      <div className="absolute top-4 left-1/2 w-full h-0.5 -z-10">
                        <div className={`h-full transition-all ${isPassed ? 'bg-teal-500 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600'
                          }`} />
                      </div>
                    )}

                    {/* Step Circle */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 mb-1
                      ${isActive
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-600 shadow-md shadow-teal-500/50 scale-105'
                        : isPassed
                          ? 'bg-teal-500 dark:bg-teal-500'
                          : 'bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600'
                      }
                    `}>
                      {isPassed && !isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <StepIcon className={`h-3.5 w-3.5 ${isActive || isPassed ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      )}
                    </div>

                    {/* Step Label */}
                    <span className={`text-[10px] text-center font-semibold max-w-[60px] leading-tight transition-all
                      ${isActive ? 'text-teal-600 dark:text-teal-200' : isPassed ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}
                    `}>
                      {status === 'OPEN' ? 'Buat SO' :
                        status === 'PENDING_APPROVAL' ? 'Approval' :
                          status === 'APPROVED_ON_SITE' ? 'Approved' :
                            status === 'IN_DELIVERY' ? 'Kirim RC' :
                              status === 'RECEIVED' ? 'Terima RC' :
                                status === 'IN_PROGRESS' ? (isReplacementTicket ? 'Replace' : 'Repair') :
                                  status === 'RESOLVED' ? 'Siap Pickup' :
                                    status === 'CLOSED' ? 'Selesai' : 'Tutup'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Cards - 2 Columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Main Info Grid */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  Informasi Ticket
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <InfoBlock icon={Package} iconColor="text-teal-500 dark:text-teal-400" title={isMultiCassette ? `KASET (${cassetteCount})` : "KASET"}>
                    {isMultiCassette ? (
                      <div className="space-y-1">
                        {allCassettes.slice(0, 2).map((cassette: any, idx: number) => (
                          <div key={cassette.id}>
                            <InfoItem label={`#${idx + 1}`} value={cassette.serialNumber} mono />
                          </div>
                        ))}
                        {cassetteCount > 2 && (
                          <p className="text-[10px] text-teal-500 dark:text-teal-400 font-medium">+{cassetteCount - 2} lagi</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <InfoItem label="SN" value={ticket.cassette?.serialNumber || 'N/A'} mono />
                        {ticket.cassette?.cassetteType && (
                          <InfoItem label="Tipe" value={ticket.cassette.cassetteType.typeCode} />
                        )}
                      </>
                    )}
                  </InfoBlock>

                  {ticket.machine && (
                    <InfoBlock icon={Monitor} iconColor="text-blue-500 dark:text-blue-400" title="MESIN">
                      <InfoItem label="SN" value={ticket.machine.serialNumberManufacturer} mono />
                      {ticket.machine.customerBank && (
                        <InfoItem label="Bank" value={ticket.machine.customerBank.bankName} />
                      )}
                    </InfoBlock>
                  )}

                  <InfoBlock icon={User} iconColor="text-orange-500 dark:text-orange-400" title="REPORTER">
                    <InfoItem label="Nama" value={ticket.reporter?.fullName || 'N/A'} />
                    {ticket.reporter?.pengelola && (
                      <InfoItem label="Pengelola" value={ticket.reporter.pengelola.companyName} />
                    )}
                  </InfoBlock>

                  <InfoBlock icon={Clock} iconColor="text-gray-500 dark:text-gray-400" title="WAKTU">
                    <InfoItem label="Dibuat" value={formatDateTime(ticket.reportedAt).split(',')[0]} />
                    {ticket.errorCode && (
                      <InfoItem label="Error" value={ticket.errorCode} valueClass="text-red-500 dark:text-red-400" />
                    )}
                  </InfoBlock>

                  {/* Lokasi Perbaikan */}
                  {ticket.repairLocation && (
                    <InfoBlock icon={MapPin} iconColor="text-purple-500 dark:text-purple-400" title="LOKASI PERBAIKAN">
                      <InfoItem 
                        label="Lokasi" 
                        value={ticket.repairLocation === 'ON_SITE' ? 'Di Lokasi Pengelola (On-Site)' : 'Di Repair Center (RC)'}
                        valueClass={ticket.repairLocation === 'ON_SITE' ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-blue-600 dark:text-blue-400 font-semibold'}
                      />
                      {ticket.repairLocation === 'ON_SITE' && (
                        <InfoItem 
                          label="Status Approval" 
                          value={
                            ticket.status === 'PENDING_APPROVAL' ? 'Menunggu Approval' :
                            ticket.status === 'APPROVED_ON_SITE' ? 'Disetujui' :
                            ticket.status === 'OPEN' ? 'Ditolak (Kembali ke RC)' :
                            'Selesai'
                          }
                          valueClass={
                            ticket.status === 'PENDING_APPROVAL' ? 'text-yellow-600 dark:text-yellow-400' :
                            ticket.status === 'APPROVED_ON_SITE' ? 'text-green-600 dark:text-green-400' :
                            'text-gray-600 dark:text-gray-400'
                          }
                        />
                      )}
                    </InfoBlock>
                  )}
                </div>

                {ticket.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-700 dark:text-slate-300 font-extrabold mb-2 uppercase tracking-wider">DESKRIPSI</p>
                    <p className="text-sm text-gray-900 dark:text-slate-100 leading-relaxed font-medium">{ticket.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Multi-Cassette Detail List - Compact Table */}
            {isMultiCassette && (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider">Detail Semua Kaset</h3>
                    </div>
                    <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm px-3 py-1 font-bold">
                      {cassetteCount} Items
                    </Badge>
                  </div>

                  {/* Compact Table View */}
                  <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {allCassettes.map((cassette: any, index: number) => (
                        <div key={cassette.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-colors">
                          {/* Number Badge */}
                          <div className="w-7 h-7 rounded bg-teal-600 dark:bg-teal-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                            {index + 1}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-mono font-extrabold text-sm text-gray-900 dark:text-slate-100 truncate" title={cassette.serialNumber}>
                                {cassette.serialNumber}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              {cassette.cassetteType && (
                                <>
                                  <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded font-bold uppercase tracking-wide">
                                    {cassette.cassetteType.typeCode}
                                  </span>
                                  {cassette.cassetteType.machineType && (
                                    <span className={`px-1.5 py-0.5 text-white rounded font-bold uppercase tracking-wide ${cassette.cassetteType.machineType === 'VS' ? 'bg-purple-600' : 'bg-orange-600'
                                      }`}>
                                      {cassette.cassetteType.machineType}
                                    </span>
                                  )}
                                </>
                              )}
                              {cassette.customerBank && (
                                <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
                                  {cassette.customerBank.bankName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery/Return Info */}
            {(ticket.cassetteDelivery || ticket.cassetteReturn) && (
              <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {ticket.cassetteDelivery && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold mb-4">
                          <Truck className="h-5 w-5" />
                          <span className="text-sm uppercase tracking-wider">Pengiriman ke RC</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InfoItem label="Kurir" value={ticket.cassetteDelivery.courierService || 'N/A'} isDark={false} />
                          <InfoItem label="Resi" value={ticket.cassetteDelivery.trackingNumber || 'N/A'} mono isDark={false} />
                          <InfoItem
                            label="Tanggal Kirim"
                            value={formatDateTime(ticket.cassetteDelivery.shippedDate).split(',')[0]}
                            isDark={false}
                          />
                          <InfoItem
                            label="Diterima di RC"
                            value={ticket.cassetteDelivery.receivedAtRc
                              ? formatDateTime(ticket.cassetteDelivery.receivedAtRc).split(',')[0]
                              : '-'}
                            valueClass={ticket.cassetteDelivery.receivedAtRc
                              ? ''
                              : 'text-slate-500 dark:text-slate-500'}
                            isDark={false}
                          />
                        </div>
                      </div>
                    )}

                    {ticket.cassetteReturn && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-bold mb-4">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm uppercase tracking-wider">Pickup di RC</span>
                        </div>
                        <div className="space-y-4">
                          {/* Pickup Confirmation Info */}
                          {ticket.cassetteReturn.confirmedByRc && (
                            <div className="p-3 rounded-lg border-2 bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Konfirmasi Pickup
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                <p className="font-semibold">Dikonfirmasi oleh: {ticket.cassetteReturn.rcConfirmer?.fullName || 'RC Staff'}</p>
                                <p>Tanggal: {ticket.cassetteReturn.rcConfirmedAt ? formatDateTime(ticket.cassetteReturn.rcConfirmedAt) : '-'}</p>
                              </div>
                            </div>
                          )}

                          {/* Pickup Details - Parse from notes */}
                          {(() => {
                            const notes = ticket.cassetteReturn.notes || '';

                            // Parse pickup information from notes (handle various formats)
                            const pickupDateTimeMatch = notes.match(/Tanggal\/Waktu\s+Pickup[:\s]+([^\n]+)/i);
                            const kondisiMatch = notes.match(/Kondisi\s+Kaset[:\s]+([^\n]+)/i);
                            const namaPengambilMatch = notes.match(/Nama\s+Pengambil[:\s]+([^\n]+)/i);
                            const noHpMatch = notes.match(/No\.?\s*HP\s+Pengambil[:\s]+([^\n]+)/i);
                            const dikonfirmasiMatch = notes.match(/Dikonfirmasi\s+oleh[:\s]+([^\n]+)/i);
                            const catatanMatch = notes.match(/Catatan[:\s]+([^\n]+)/i);

                            const pickupDateTime = pickupDateTimeMatch ? pickupDateTimeMatch[1].trim() : null;
                            const kondisiKaset = kondisiMatch ? kondisiMatch[1].trim() : null;
                            const namaPengambil = namaPengambilMatch ? namaPengambilMatch[1].trim() : null;
                            const noHp = noHpMatch ? noHpMatch[1].trim() : null;
                            const dikonfirmasiOleh = dikonfirmasiMatch ? dikonfirmasiMatch[1].trim() : null;
                            const catatanTambahan = catatanMatch ? catatanMatch[1].trim() : null;

                            // Check if we have any structured data
                            const hasStructuredData = pickupDateTime || kondisiKaset || namaPengambil || noHp || dikonfirmasiOleh;

                            if (!hasStructuredData && !notes) {
                              return null;
                            }

                            return (
                              <div className="space-y-4">
                                {/* Information Grid */}
                                {hasStructuredData && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pickupDateTime && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Tanggal/Waktu Pickup
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {pickupDateTime}
                                        </p>
                                      </div>
                                    )}
                                    {kondisiKaset && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Kondisi Kaset
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {kondisiKaset}
                                        </p>
                                      </div>
                                    )}
                                    {namaPengambil && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Nama Pengambil
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {namaPengambil}
                                        </p>
                                      </div>
                                    )}
                                    {noHp && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          No. HP Pengambil
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {noHp}
                                        </p>
                                      </div>
                                    )}
                                    {dikonfirmasiOleh && (
                                      <div className="space-y-1 md:col-span-2">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                          Dikonfirmasi Oleh
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {dikonfirmasiOleh}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Digital Signature Section */}
                                {ticket.cassetteReturn.signature && (
                                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      Tanda Tangan Digital
                                    </p>
                                    <div className="inline-block border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 p-3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={ticket.cassetteReturn.signature}
                                        alt="Tanda Tangan Digital"
                                        className="h-auto max-h-32 object-contain"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Catatan Tambahan */}
                                {catatanTambahan && (
                                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      Catatan Tambahan
                                    </p>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {catatanTambahan}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Fallback: Show raw notes if no structured data found */}
                                {!hasStructuredData && notes && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      Catatan
                                    </p>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {notes}
                                      </p>
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Panel */}
          <div className="space-y-4">
            {/* Hitachi Actions */}
            {isHitachi && (
              <>
                {/* Receive Delivery - Show if has cassetteDelivery and not yet received, OR if SELF_DELIVERY without delivery record */}
                {/* Show for both IN_DELIVERY (courier) and OPEN/IN_DELIVERY (self-delivery) status */}
                {((ticket.cassetteDelivery && !ticket.cassetteDelivery.receivedAtRc) ||
                  (ticket.deliveryMethod === 'SELF_DELIVERY' && !ticket.cassetteDelivery && (ticket.status === 'OPEN' || ticket.status === 'IN_DELIVERY'))) &&
                  (ticket.status === 'IN_DELIVERY' || ticket.status === 'OPEN') && (
                    <ActionCard color="cyan">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                          <Package className="h-5 w-5" />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {(ticket.cassetteDelivery?.courierService === 'SELF_DELIVERY' || ticket.deliveryMethod === 'SELF_DELIVERY')
                              ? (isMultiCassette ? `${cassetteCount} kaset - Antar Mandiri` : 'Kaset - Antar Mandiri')
                              : (isMultiCassette ? `${cassetteCount} kaset dalam pengiriman` : 'Kaset dalam pengiriman ke RC')}
                          </span>
                        </div>
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-500/50 rounded p-3">
                          <p className="text-xs text-cyan-800 dark:text-cyan-300">
                            📦 {(ticket.cassetteDelivery?.courierService === 'SELF_DELIVERY' || ticket.deliveryMethod === 'SELF_DELIVERY')
                              ? 'Kaset diantar langsung oleh pengelola. Konfirmasi penerimaan kaset di RC sebelum mulai diagnosa/repair.'
                              : ticket.status === 'IN_DELIVERY'
                                ? 'Kaset sedang dikirim ke RC. Konfirmasi penerimaan setelah kaset tiba di RC sebelum mulai diagnosa/repair.'
                                : 'Kaset perlu dikonfirmasi penerimaannya di RC sebelum mulai diagnosa/repair.'}
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowReceiveDialog(true)}
                          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-semibold"
                          size="lg"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {isMultiCassette ? `Terima ${cassetteCount} Kaset di RC` : 'Terima di RC'}
                        </Button>
                      </div>
                    </ActionCard>
                  )}

                {/* Replacement Request Action - Show for tickets with requestReplacement = true */}
                {ticket.cassetteDetails?.some((detail: any) => detail.requestReplacement === true) &&
                  (effectiveStatus === 'RECEIVED' || effectiveStatus === 'IN_PROGRESS') &&
                  isHitachi && (
                    <ActionCard color="orange">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                          <RefreshCw className="h-5 w-5" />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Replacement Request
                          </span>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-500/50 rounded p-3">
                          <p className="text-xs text-orange-800 dark:text-orange-300">
                            ⚠️ Kaset ini diminta untuk diganti (tidak layak pakai). <strong>TIDAK perlu repair ticket.</strong> Langsung input form replacement untuk ganti SN.
                          </p>
                        </div>
                        <Link href={`/tickets/${ticket.id}/replacement`} className="w-full block">
                          <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-orange-600 dark:to-orange-700 dark:hover:from-orange-700 dark:hover:to-orange-800 text-white font-semibold" size="lg">
                            <RefreshCw className="h-5 w-5 mr-2" />
                            Input Form Replacement
                          </Button>
                        </Link>
                      </div>
                    </ActionCard>
                  )}

                {/* On-Site Repair Approval (Hitachi only) */}
                {ticket.repairLocation === 'ON_SITE' && ticket.status === 'PENDING_APPROVAL' && isHitachi && (
                  <ActionCard color="orange">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                        <Clock className="h-5 w-5" />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          On-Site Repair Request
                        </span>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-500/50 rounded p-3">
                        <p className="text-xs text-orange-800 dark:text-orange-300">
                          Pengelola meminta repair dilakukan di lokasi mereka. Silakan approve atau reject request ini.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleApproveOnSiteRepair}
                          disabled={approving}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white font-bold"
                          size="lg"
                        >
                          {approving ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              <span className="font-bold">Memproses...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              <span className="font-bold">Approve</span>
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={approving || rejecting}
                          variant="destructive"
                          className="flex-1 font-bold"
                          size="lg"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </ActionCard>
                )}

                {/* Approved On-Site Repair */}
                {ticket.repairLocation === 'ON_SITE' && ticket.status === 'APPROVED_ON_SITE' && repairs.length === 0 && (
                  <ActionCard color="teal">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          On-Site Repair Approved
                        </span>
                      </div>
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-500/50 rounded p-3">
                        <p className="text-xs text-teal-800 dark:text-teal-300">
                          ✅ On-site repair telah disetujui. RC Staff dapat mulai melakukan repair di lokasi pengelola.
                        </p>
                      </div>
                      {isHitachi && (
                        <Button
                          onClick={() => setShowStartRepairDialog(true)}
                          disabled={creatingRepairs}
                          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-bold"
                          size="lg"
                        >
                          {creatingRepairs ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              <span className="font-bold">Memproses...</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="h-5 w-5 mr-2" />
                              <span className="font-bold">{isMultiCassette ? `Mulai Repair ${cassetteCount} Kaset` : 'Mulai Repair'}</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </ActionCard>
                )}

                {/* Show "Mulai Repair" button only if NOT a replacement request and NOT on-site repair */}
                {effectiveStatus === 'RECEIVED' &&
                  ticket.repairLocation !== 'ON_SITE' &&
                  !ticket.cassetteDetails?.some((detail: any) => detail.requestReplacement === true) && (
                    <ActionCard color="teal">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                          <Inbox className="h-5 w-5" />
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isMultiCassette ? `${cassetteCount} kaset sudah diterima` : 'Kaset sudah diterima di RC'}
                          </span>
                        </div>
                        <Button
                          onClick={() => setShowStartRepairDialog(true)}
                          disabled={creatingRepairs}
                          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-bold"
                          size="lg"
                        >
                          {creatingRepairs ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              <span className="font-bold">Memproses...</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="h-5 w-5 mr-2" />
                              <span className="font-bold">{isMultiCassette ? `Mulai Repair ${cassetteCount} Kaset` : 'Mulai Repair'}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </ActionCard>
                  )}

                {effectiveStatus === 'IN_PROGRESS' && !allRepairsCompleted && (
                  <ActionCard color="yellow">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <Wrench className="h-5 w-5" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {isMultiCassette ? `${cassetteCount} kaset sedang repair` : 'Sedang diperbaiki'}
                        </span>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/50 rounded p-3">
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                          🔧 Repair sedang berlangsung. Cek progress di Repairs page.
                        </p>
                      </div>
                      <Link href="/repairs" className="w-full block">
                        <Button className="w-full bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-semibold">
                          Lihat Progress Repairs
                        </Button>
                      </Link>
                    </div>
                  </ActionCard>
                )}

                {effectiveStatus === 'RESOLVED' && !ticket.cassetteReturn && (
                  <ActionCard color="green">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {isReplacementTicket
                            ? (ticket.status === 'RESOLVED' ? 'Replacement selesai' : 'Replacement dalam proses')
                            : (allRepairsCompleted
                              ? (isMultiCassette
                                ? `${successfullyRepairedCount} kaset selesai diperbaiki${scrappedCount > 0 ? `, ${scrappedCount} kaset SCRAPPED` : ''}`
                                : successfullyRepairedCount > 0
                                  ? 'Kaset selesai diperbaiki'
                                  : 'Kaset SCRAPPED')
                              : (isMultiCassette ? `${completedCount}/${cassetteCount} kaset selesai diperbaiki` : 'Kaset sedang diperbaiki')
                            )
                          }
                        </span>
                      </div>
                      {isReplacementTicket ? (
                        ticket.status === 'RESOLVED' ? (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-500/50 rounded p-3">
                            <p className="text-xs text-green-800 dark:text-green-300">
                              ✅ Replacement selesai. Kaset baru siap untuk di-pickup oleh Pengelola di RC.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/50 rounded p-3">
                            <p className="text-xs text-yellow-800 dark:text-yellow-300">
                              ⏳ Menunggu proses replacement selesai. Setelah replacement, status akan menjadi RESOLVED dan tombol akan aktif.
                            </p>
                          </div>
                        )
                      ) : allRepairsCompleted ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-500/50 rounded p-3">
                          <p className="text-xs text-green-800 dark:text-green-300">
                            ✅ Repair & QC selesai.
                            {successfullyRepairedCount > 0 && scrappedCount > 0 ? (
                              <>
                                {successfullyRepairedCount} kaset siap untuk di-pickup oleh Pengelola di RC. {scrappedCount} kaset SCRAPPED akan tetap di RC untuk disposal.
                              </>
                            ) : successfullyRepairedCount > 0 ? (
                              <>
                                {successfullyRepairedCount} kaset siap untuk di-pickup oleh Pengelola di RC.
                              </>
                            ) : scrappedCount > 0 ? (
                              <>
                                {scrappedCount} kaset SCRAPPED. Konfirmasi disposal untuk kaset yang tidak bisa diperbaiki.
                              </>
                            ) : (
                              'Siap untuk di-pickup oleh Pengelola di RC.'
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/50 rounded p-3">
                          <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            ⏳ Menunggu semua {cassetteCount} kaset selesai diperbaiki ({completedCount}/{cassetteCount} repair selesai{successfullyRepairedCount > 0 ? `, ${successfullyRepairedCount} berhasil` : ''}{scrappedCount > 0 ? `, ${scrappedCount} SCRAPPED` : ''}). Tombol akan aktif setelah semua repair tickets selesai.
                          </p>
                        </div>
                      )}
                      {/* For replacement tickets, pickup confirmation is handled in replacement page */}
                      {!isReplacementTicket && (
                        <>
                          {canConfirmPickup ? (
                            <Button
                              onClick={() => setShowPickupDialog(true)}
                              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-semibold"
                              size="lg"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              {isMultiPickup ? `Konfirmasi Pickup ${pickupCassetteCount} Kaset` : 'Konfirmasi Pickup'}
                            </Button>
                          ) : (
                            <Button
                              className="w-full bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 text-white font-semibold cursor-not-allowed opacity-60"
                              size="lg"
                              disabled
                            >
                              <Package className="h-5 w-5 mr-2" />
                              {isMultiPickup ? `Konfirmasi Pickup ${pickupCassetteCount} Kaset` : 'Konfirmasi Pickup'}
                            </Button>
                          )}
                        </>
                      )}
                      {isReplacementTicket && ticket.status === 'RESOLVED' && (
                        <Link href={`/tickets/${ticket.id}/replacement`} className="w-full block">
                          <Button
                            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-semibold"
                            size="lg"
                          >
                            <Package className="h-5 w-5 mr-2" />
                            Konfirmasi Pickup di Halaman Replacement
                          </Button>
                        </Link>
                      )}
                    </div>
                  </ActionCard>
                )}

                {/* RETURN_SHIPPED status removed - flow baru langsung RESOLVED -> CLOSED */}
                {false && ticket.cassetteReturn && !ticket.cassetteReturn.receivedAtPengelola && (
                  <ActionCard color="cyan">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                        <TruckIcon className="h-5 w-5" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {isMultiCassette ? `${cassetteCount} kaset dikirim` : 'Kaset dalam pengiriman'}
                        </span>
                      </div>
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-500/50 rounded p-3">
                        <p className="text-xs text-cyan-800 dark:text-cyan-300">
                          📦 Kaset sedang dikirim kembali ke pengelola. Menunggu konfirmasi penerimaan.
                        </p>
                      </div>
                    </div>
                  </ActionCard>
                )}

                {ticket.status === 'CLOSED' && (
                  <ActionCard color="green">
                    <div className="space-y-3 text-center">
                      <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">SO Selesai</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Service Order telah selesai dan ditutup.
                        {isMultiCassette && (() => {
                          const returnedCount = allCassettes.filter((c: any) => c.status === 'OK').length;
                          const scrappedCount = allCassettes.filter((c: any) => c.status === 'SCRAPPED').length;
                          if (returnedCount > 0 && scrappedCount > 0) {
                            return ` ${returnedCount} kaset telah kembali ke pengelola, ${scrappedCount} kaset SCRAPPED tetap di RC.`;
                          } else if (returnedCount > 0) {
                            return ` ${returnedCount} kaset telah kembali ke pengelola.`;
                          } else if (scrappedCount > 0) {
                            return ` ${scrappedCount} kaset SCRAPPED tetap di RC untuk disposal.`;
                          } else {
                            return ` ${cassetteCount} kaset telah kembali ke pengelola.`;
                          }
                        })()}
                      </p>
                    </div>
                  </ActionCard>
                )}
              </>
            )}

            {/* Repair Tickets Status - Grouped by SO */}
            {repairs.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Status Repair Semua Kaset</h3>
                    </div>
                    <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold px-3 py-1">
                      {repairs.length} Repair Ticket{repairs.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                    {repairs.map((repair: any) => {
                      const repairStatusBadge = getRepairStatusBadge(repair.status);
                      const RepairStatusIcon = repairStatusBadge.icon;

                      return (
                        <Link
                          key={repair.id}
                          href={`/repairs/${repair.id}`}
                          className="block"
                        >
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: Cassette Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-sm font-extrabold shadow-md flex-shrink-0">
                                    {allCassettes.findIndex((c: any) => c.id === repair.cassetteId) + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                                      {repair.cassette?.serialNumber || 'N/A'}
                                    </p>
                                    {repair.cassette?.cassetteType && (
                                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                                        {repair.cassette.cassetteType.typeCode}
                                        {repair.cassette.cassetteType.machineType && ` • ${repair.cassette.cassetteType.machineType}`}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Issue */}
                                {repair.reportedIssue && (
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-2 line-clamp-2">
                                    {repair.reportedIssue}
                                  </p>
                                )}

                                {/* Engineer */}
                                {repair.repairer && (
                                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                                    <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                    <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                      {repair.repairer.fullName}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Right: Status & QC */}
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <Badge className={`${repairStatusBadge.variant} text-xs px-2.5 py-1 gap-1 font-bold`}>
                                  <RepairStatusIcon className="h-3.5 w-3.5" />
                                  {repairStatusBadge.label}
                                </Badge>

                                {/* QC Status */}
                                {repair.qcPassed !== null && (
                                  <div className="text-xs font-bold">
                                    {repair.qcPassed ? (
                                      <span className="text-green-600 dark:text-green-400">✅ QC Pass</span>
                                    ) : (
                                      <span className="text-red-600 dark:text-red-400">❌ QC Fail</span>
                                    )}
                                  </div>
                                )}
                                {repair.qcPassed === null && repair.status === 'COMPLETED' && (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">⏳ QC Pending</span>
                                )}

                                {/* Completed Date */}
                                {repair.completedAt && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    {formatDateTime(repair.completedAt).split(',')[0]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pengelola Actions */}
            {/* RETURN_SHIPPED status removed - flow baru langsung RESOLVED -> CLOSED */}
            {false && !ticket.cassetteReturn?.receivedAtPengelola && (
              <ActionCard color="orange">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <Package className="h-5 w-5" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Kaset telah dikirim
                    </span>
                  </div>
                  <Link href={`/tickets/${ticket.id}/receive-return`} className="w-full block">
                    <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white font-semibold" size="lg">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Terima Kembali
                    </Button>
                  </Link>
                </div>
              </ActionCard>
            )}
          </div>
        </div>
      </div>

      {/* Receive Delivery Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Package className="h-5 w-5" />
              Konfirmasi Penerimaan di RC
            </DialogTitle>
            <DialogDescription>
              Konfirmasi bahwa {isMultiCassette ? `${cassetteCount} kaset` : 'kaset'} telah diterima di RC.
              Status ticket akan berubah menjadi RECEIVED dan siap untuk mulai diagnosa/repair.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="receive-notes">Catatan (Opsional)</Label>
              <Textarea
                id="receive-notes"
                placeholder="Masukkan catatan jika diperlukan..."
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReceiveDialog(false);
                setReceiveNotes('');
              }}
              disabled={receiving}
            >
              Batal
            </Button>
            <Button
              onClick={handleReceiveDelivery}
              disabled={receiving}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              {receiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengonfirmasi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Konfirmasi Penerimaan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Pickup/Disposal Dialog - Only for RC staff */}
      {isHitachi || isSuperAdmin ? (
        <Dialog open={showPickupDialog} onOpenChange={setShowPickupDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${isDisposalFlow ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>
                {isDisposalFlow ? <Trash2 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                {isDisposalFlow
                  ? 'Konfirmasi Disposal Kaset'
                  : 'Konfirmasi Pickup Kaset'}
              </DialogTitle>
              <DialogDescription>
                {isDisposalFlow
                  ? `Konfirmasi disposal untuk ${isMultiPickup ? `${pickupCassetteCount} kaset` : 'kaset'} dengan status SCRAPPED (tidak bisa diperbaiki, tidak lolos QC). Kaset tetap di RC untuk disposal.`
                  : `Lengkapi informasi pickup untuk ${isMultiPickup ? `${pickupCassetteCount} kaset` : 'kaset'} yang telah diambil di RC.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Info Banner */}
              {isDisposalFlow ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                        ⚠️ Kaset Tidak Bisa Diperbaiki (SCRAPPED)
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                        <li>Kaset tidak lolos Quality Control setelah perbaikan</li>
                        <li>Kaset tetap di RC untuk disposal (tidak dikembalikan ke Pengelola)</li>
                        <li>Setelah konfirmasi, ticket akan menjadi CLOSED</li>
                        <li>PDF Disposal Certificate akan tersedia untuk bukti ke Pengelola</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Info:</strong> Setelah konfirmasi, status kaset langsung berubah menjadi OK dan ticket menjadi CLOSED.
                  </p>
                </div>
              )}

              {/* Summary Info */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {isDisposalFlow
                    ? 'Kaset yang akan dikonfirmasi disposal:'
                    : 'Kaset yang akan di-pickup:'}
                </p>
                {isDisposalFlow ? (
                  // Disposal: show only SCRAPPED cassettes
                  isMultiPickup ? (
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {scrappedCassettes.map((c: any, idx: number) => (
                        <li key={c.id} className="font-mono">
                          {c.serialNumber}
                          <Badge variant="destructive" className="ml-2 text-xs">SCRAPPED</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                        {scrappedCassettes[0]?.serialNumber}
                      </p>
                      <Badge variant="destructive" className="text-xs">SCRAPPED</Badge>
                    </div>
                  )
                ) : (
                  // Pickup: show READY_FOR_PICKUP cassettes
                  // For replacement tickets: show replacement mapping (old → new) and new cassettes
                  // For repair tickets: show READY_FOR_PICKUP cassettes, and also show SCRAPPED if any
                  <>
                    {/* For replacement tickets: show ALL replacement mappings */}
                    {isReplacementTicket && (() => {
                      // Get all cassettes that are marked for replacement
                      const replacementCassettes = ticket.cassetteDetails
                        ?.filter((detail: any) => detail.requestReplacement === true)
                        .map((detail: any) => detail.cassette)
                        .filter((c: any) => c !== null) || [];

                      if (replacementCassettes.length === 0) return null;

                      return (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3">
                            📋 Informasi Replacement - Semua Kaset yang Diganti:
                          </p>
                          <div className="space-y-2.5">
                            {replacementCassettes.map((oldCassette: any, index: number) => {
                              // Check if this old cassette has been replaced
                              // Backend now includes replacementFor relation
                              const newCassette = oldCassette.replacementFor && oldCassette.replacementFor.length > 0
                                ? oldCassette.replacementFor[0]
                                : null;

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
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Serial Number Lama:</span>
                                          <span className="font-mono text-sm px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 font-semibold">
                                            {oldCassette.serialNumber}
                                          </span>
                                          <span className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">SCRAPPED</span>
                                        </div>
                                      </div>
                                      {newCassette ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-8" />
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap ml-8">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Serial Number Baru:</span>
                                            <span className="font-mono text-sm px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800 font-semibold">
                                              {newCassette.serialNumber}
                                            </span>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">READY FOR PICKUP</span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="ml-8">
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
                        </div>
                      );
                    })()}

                    {readyForPickupCassettes.length > 0 && (
                      <div className={isReplacementTicket && scrappedCassettes.length > 0 ? "mt-3 pt-3 border-t border-slate-300 dark:border-slate-600" : "mb-2"}>
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                          {isReplacementTicket
                            ? `Kaset baru siap pickup (${readyForPickupCassettes.length}):`
                            : `Kaset siap pickup (${readyForPickupCassettes.length}):`}
                        </p>
                        {readyForPickupCassettes.length > 1 ? (
                          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            {readyForPickupCassettes.map((c: any) => (
                              <li key={c.id} className="font-mono">{c.serialNumber}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                            {readyForPickupCassettes[0]?.serialNumber}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Only show SCRAPPED info for repair tickets, not replacement tickets */}
                    {!isReplacementTicket && scrappedCassettes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                          Kaset SCRAPPED - tidak di-pickup ({scrappedCassettes.length}):
                        </p>
                        {scrappedCassettes.length > 1 ? (
                          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            {scrappedCassettes.map((c: any) => (
                              <li key={c.id} className="font-mono">
                                {c.serialNumber}
                                <Badge variant="destructive" className="ml-2 text-xs">SCRAPPED</Badge>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                              {scrappedCassettes[0]?.serialNumber}
                            </p>
                            <Badge variant="destructive" className="text-xs">SCRAPPED</Badge>
                          </div>
                        )}
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">
                          Kaset SCRAPPED akan tetap di RC untuk disposal dan tidak dikembalikan ke Pengelola.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tanggal Pickup */}
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

              {/* Kondisi Kaset - Only show for non-SCRAPPED cassettes (pickup flow) */}
              {!isDisposalFlow ? (
                <>
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

                  {/* Nama Pengambil dan No HP - Only for pickup */}
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
                </>
              ) : null}

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="pickup-notes" className="text-sm font-semibold">
                  Catatan Tambahan
                </Label>
                <Textarea
                  id="pickup-notes"
                  placeholder="Masukkan catatan tambahan jika diperlukan (misalnya: kondisi fisik, jumlah kaset yang diambil, dll)..."
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Tanda Tangan Digital - Only for pickup, not disposal */}
              {!isDisposalFlow ? (
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pickupSignature}
                          alt="Preview Tanda Tangan"
                          className="h-auto max-h-32 object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Tanda tangan sudah tersimpan
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

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
                  {isDisposalFlow
                    ? `Saya mengkonfirmasi bahwa ${isMultiPickup ? `${pickupCassetteCount} kaset` : 'kaset'} dengan status SCRAPPED (tidak bisa diperbaiki, tidak lolos QC) telah dikonfirmasi untuk disposal. Kaset tetap di RC dan ticket akan ditutup.`
                    : `Saya mengkonfirmasi bahwa ${isMultiPickup ? `${pickupCassetteCount} kaset` : 'kaset'} telah diambil di RC dengan kondisi sesuai yang dipilih di atas.`}
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
                disabled={confirmingPickup || !pickupConfirmed || (!isDisposalFlow && (!pickupSignature || !pickupRecipientName.trim() || !pickupRecipientPhone.trim()))}
                className={`bg-gradient-to-r disabled:opacity-50 ${isDisposalFlow
                    ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    : 'from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                  }`}
              >
                {confirmingPickup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengonfirmasi...
                  </>
                ) : (
                  <>
                    {isDisposalFlow ? (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Konfirmasi Disposal
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Konfirmasi Pickup
                      </>
                    )}
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
              <div className="relative border-4 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 p-4 overflow-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pickupSignature}
                  alt="Tanda Tangan Digital"
                  className="w-full h-auto"
                  loading="lazy"
                  decoding="async"
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Hapus Service Order?
            </DialogTitle>
            <DialogDescription>
              Hapus SO <span className="font-mono text-[#E60012]">{ticket?.ticketNumber}</span>?
            </DialogDescription>
            <div className="space-y-3 pt-4">
              {ticket?.status === 'CLOSED' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    ⚠️ Tiket ini sudah CLOSED. Hanya Super Admin yang dapat menghapus tiket yang sudah ditutup.
                  </p>
                </div>
              )}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm space-y-1">
                <p className="font-medium text-yellow-900 dark:text-yellow-300">⚠️ Yang akan terjadi:</p>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-400 space-y-1">
                  <li>SO dihapus (soft delete)</li>
                  <li>Status cassette → OK</li>
                  <li>Data tersimpan untuk audit</li>
                </ul>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Start Repair Dialog */}
      <Dialog open={showStartRepairDialog} onOpenChange={setShowStartRepairDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] sm:max-w-[500px] mx-auto rounded-3xl sm:rounded-lg p-4 sm:p-6">
          <DialogHeader className="px-0">
            <DialogTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Wrench className="h-5 w-5" />
              Mulai Repair
            </DialogTitle>
            <DialogDescription>
              {isMultiCassette
                ? `Mulai repair untuk ${cassetteCount} kaset?`
                : 'Mulai repair untuk kaset ini?'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Info:</strong> {isMultiCassette
                  ? `Ini akan membuat ${cassetteCount} repair tickets dan mengubah status SO menjadi IN_PROGRESS.`
                  : 'Ini akan membuat repair ticket dan mengubah status SO menjadi IN_PROGRESS.'}
              </p>
            </div>
          </div>

          <DialogFooter className="px-0 gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowStartRepairDialog(false)}
              disabled={creatingRepairs}
              className="w-full sm:w-auto rounded-xl sm:rounded-lg"
            >
              Batal
            </Button>
            <Button
              onClick={handleStartRepair}
              disabled={creatingRepairs}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 w-full sm:w-auto rounded-xl sm:rounded-lg"
            >
              {creatingRepairs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Mulai Repair
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject On-Site Repair Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] sm:max-w-[500px] mx-auto rounded-3xl sm:rounded-lg p-4 sm:p-6">
          <DialogHeader className="px-0">
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Reject On-Site Repair Request
            </DialogTitle>
            <DialogDescription>
              Masukkan alasan penolakan. Ticket akan kembali ke flow normal (repair di RC).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-0">
            <div className="space-y-2">
              <Label htmlFor="rejectReason" className="text-sm font-semibold">
                Alasan Penolakan <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Lokasi terlalu jauh, tidak tersedia RC Staff, dll."
                className="min-h-[100px]"
              />
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ Setelah ditolak, ticket akan kembali ke status OPEN dan repair akan dilakukan di RC (flow normal).
              </p>
            </div>
          </div>

          <DialogFooter className="px-0 gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
              disabled={rejecting}
              className="w-full sm:w-auto rounded-xl sm:rounded-lg"
            >
              Batal
            </Button>
            <Button
              onClick={handleRejectOnSiteRepair}
              disabled={rejecting || !rejectReason.trim()}
              variant="destructive"
              className="w-full sm:w-auto rounded-xl sm:rounded-lg"
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

// Helper Components
const InfoBlock = ({ icon: Icon, iconColor, title, children }: any) => {
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 ${iconColor} mb-1.5`}>
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-200">{title}</span>
      </div>
      {children}
    </div>
  );
};

const InfoItem = ({ label, value, mono = false, valueClass = '' }: any) => {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${valueClass || 'text-gray-900 dark:text-slate-100'}`}>
        {value}
      </p>
    </div>
  );
};

const ActionCard = ({ color, children }: any) => {
  const colors = {
    amber: 'border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/20',
    red: 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/20',
    yellow: 'border-yellow-300 dark:border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20',
    green: 'border-green-300 dark:border-green-500/50 bg-green-50 dark:bg-green-900/20',
    orange: 'border-orange-300 dark:border-orange-500/50 bg-orange-50 dark:bg-orange-900/20',
    rose: 'border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/20',
    cyan: 'border-cyan-300 dark:border-cyan-500/50 bg-cyan-50 dark:bg-cyan-900/20',
    teal: 'border-teal-300 dark:border-teal-500/50 bg-teal-50 dark:bg-teal-900/20',
  };
  return (
    <Card className={`border-2 ${colors[color as keyof typeof colors]} bg-white dark:bg-slate-800`}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
};

