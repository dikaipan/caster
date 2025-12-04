'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Wrench,
  FileText,
  ArrowLeft,
  Save,
  XCircle,
  Package,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Loader2,
  ClipboardCheck,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import PageLayout from '@/components/layout/PageLayout';

interface CassetteDetail {
  id: string;
  cassetteId: string;
  cassette: {
    id: string;
    serialNumber: string;
    cassetteType?: {
      typeCode: string;
      typeName?: string;
    };
    machine?: {
      machineId: string;
      location: string;
    };
    customerBank?: {
      bankName: string;
      bankCode?: string;
    };
  };
  status: string;
  checklist: any;
  findings: string | null;
  actionsTaken: string | null;
  partsReplaced: any;
  notes: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

interface PM {
  id: string;
  pmNumber: string;
  type: string;
  status: string;
  location: string;
  scheduledDate: string;
  completedDate: string | null;
  assignedEngineer: string | null;
  engineer: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  notes: string | null;
  cancellationReason: string | null;
  cassetteDetails: CassetteDetail[];
  requestedByPengelola: {
    id: string;
    name: string;
  } | null;
  requestedByHitachi: {
    id: string;
    name: string;
    email: string;
  } | null;
  locationAddress: string | null;
  locationContact: string | null;
  locationContactPhone: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  SCHEDULED: { label: 'Dijadwalkan', color: 'bg-blue-600 dark:bg-blue-500', icon: Calendar },
  IN_PROGRESS: { label: 'Dalam Proses', color: 'bg-yellow-500 dark:bg-yellow-600', icon: Clock },
  COMPLETED: { label: 'Selesai', color: 'bg-green-500 dark:bg-green-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-500 dark:bg-red-600', icon: XCircle },
};

const cassetteStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu', color: 'bg-gray-500 dark:bg-gray-600' },
  IN_PROGRESS: { label: 'Dalam Proses', color: 'bg-teal-600 dark:bg-teal-500' },
  COMPLETED: { label: 'Selesai', color: 'bg-green-500 dark:bg-green-600' },
};

const typeLabels: Record<string, string> = {
  ROUTINE: 'Rutin',
  ON_DEMAND_PENGELOLA: 'On Demand - Pengelola',
  ON_DEMAND_HITACHI: 'On Demand - Hitachi',
  EMERGENCY: 'Darurat',
  // Legacy support
  ROUTINE_SCHEDULED: 'Rutin Terjadwal',
  ON_DEMAND_BANK: 'Permintaan Bank',
};

const locationLabels: Record<string, string> = {
  PENGELOLA_LOCATION: 'Lokasi Pengelola',
  BANK_LOCATION: 'Lokasi Bank',
  REPAIR_CENTER: 'Repair Center',
  FIELD_SITE: 'Lokasi Lapangan',
};

export default function PMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loadUser } = useAuthStore();
  const [pm, setPm] = useState<PM | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCassette, setExpandedCassette] = useState<string | null>(null);
  const [editingCassette, setEditingCassette] = useState<string | null>(null);
  const [cassetteFormData, setCassetteFormData] = useState<any>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showDisableAutoScheduleDialog, setShowDisableAutoScheduleDialog] = useState(false);
  const [disablingAutoSchedule, setDisablingAutoSchedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [takingTask, setTakingTask] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Check user type early for redirect logic
  const isPengelola = user?.userType === 'PENGELOLA';
  const isHitachi = user?.userType === 'HITACHI';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    // Redirect Pengelola users - PM feature is temporarily disabled for Pengelola
    if (!isLoading && isAuthenticated && isPengelola) {
      router.push('/tickets');
    }
  }, [isAuthenticated, isLoading, router, isPengelola]);

  useEffect(() => {
    const fetchPM = async () => {
      try {
        const response = await api.get(`/preventive-maintenance/${params.id}`);
        setPm(response.data);
      } catch (error) {
        console.error('Error fetching PM:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPM();
    }
  }, [params.id]);

  const handleStartEdit = (cassetteDetail: CassetteDetail) => {
    setEditingCassette(cassetteDetail.id);
    setCassetteFormData({
      findings: cassetteDetail.findings || '',
      actionsTaken: cassetteDetail.actionsTaken || '',
      partsReplaced: cassetteDetail.partsReplaced?.join(', ') || '',
      notes: cassetteDetail.notes || '',
      status: cassetteDetail.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingCassette(null);
    setCassetteFormData({});
  };

  const handleSaveCassette = async (cassetteId: string) => {
    if (!pm) return;

    try {
      setSubmitting(true);
      await api.patch(
        `/preventive-maintenance/${pm.id}/cassette/${cassetteId}`,
        {
          findings: cassetteFormData.findings || undefined,
          actionsTaken: cassetteFormData.actionsTaken || undefined,
          partsReplaced: cassetteFormData.partsReplaced
            ? cassetteFormData.partsReplaced.split(',').map((p: string) => p.trim())
            : undefined,
          notes: cassetteFormData.notes || undefined,
          status: cassetteFormData.status,
        }
      );

      // Refresh data
      const response = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(response.data);
      setEditingCassette(null);
      setCassetteFormData({});
    } catch (error) {
      console.error('Error updating cassette:', error);
      alert('Gagal mengupdate data cassette');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeTask = async () => {
    if (!pm) return;
    try {
      setTakingTask(true);
      const response = await api.post(`/preventive-maintenance/${pm.id}/take`);
      setPm(response.data);
      alert('PM task assigned to you successfully!');
    } catch (error: any) {
      console.error('Error taking PM task:', error);
      alert(error.response?.data?.message || 'Failed to take PM task');
    } finally {
      setTakingTask(false);
    }
  };

  const handleStartPM = async () => {
    if (!pm) return;

    try {
      setSubmitting(true);
      await api.patch(`/preventive-maintenance/${pm.id}`, {
        status: 'IN_PROGRESS',
      });

      // Refresh data
      const response = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(response.data);
    } catch (error) {
      console.error('Error starting PM:', error);
      alert('Gagal memulai PM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompletePM = async () => {
    console.log('🟢 handleCompletePM called', { pm: pm?.id, user: user?.id, userType: user?.userType });
    
    if (!pm) {
      console.warn('⚠️ PM is null');
      alert('PM tidak ditemukan');
      return;
    }

    // Check if all cassettes are completed
    const allCompleted = pm.cassetteDetails.every(
      (cd) => cd.status === 'COMPLETED'
    );

    console.log('📊 Completion check:', {
      total: pm.cassetteDetails.length,
      completed: pm.cassetteDetails.filter(cd => cd.status === 'COMPLETED').length,
      allCompleted
    });

    if (!allCompleted) {
      const incompleteCount = pm.cassetteDetails.filter(cd => cd.status !== 'COMPLETED').length;
      alert(`Semua cassette harus selesai terlebih dahulu. Masih ada ${incompleteCount} cassette yang belum selesai.`);
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menyelesaikan PM ${pm.pmNumber}?\n\nSemua ${pm.cassetteDetails.length} cassette telah selesai.`
    );

    if (!confirmed) {
      console.log('❌ User cancelled');
      return;
    }

    try {
      setSubmitting(true);
      console.log('🟢 Starting PM completion:', pm.id);
      
      const response = await api.patch(`/preventive-maintenance/${pm.id}`, {
        status: 'COMPLETED',
      });

      console.log('✅ PM completed successfully:', response.data);

      // Refresh data
      const updatedResponse = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(updatedResponse.data);

      // Show success message
      alert(`✅ PM ${pm.pmNumber} berhasil diselesaikan!`);
      
      // Optionally redirect or refresh
      // router.refresh();
    } catch (error: any) {
      console.error('❌ Error completing PM:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || error.message || 'Gagal menyelesaikan PM';
      alert(`❌ ${errorMessage}\n\nSilakan coba lagi atau hubungi administrator.`);
    } finally {
      setSubmitting(false);
      console.log('🏁 handleCompletePM finished');
    }
  };

  const handleReschedulePM = async () => {
    if (!pm || !rescheduleDate || !rescheduleReason.trim()) {
      alert('Tanggal dan alasan reschedule harus diisi');
      return;
    }

    const newDate = new Date(rescheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);

    if (newDate <= today) {
      alert('Tanggal reschedule harus di masa depan');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/preventive-maintenance/${pm.id}`, {
        status: 'RESCHEDULED',
        scheduledDate: rescheduleDate,
        rescheduledReason: rescheduleReason,
      });

      // Refresh data
      const response = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(response.data);
      setShowRescheduleDialog(false);
      setRescheduleDate('');
      setRescheduleReason('');
      alert('PM berhasil dijadwalkan ulang!');
    } catch (error: any) {
      console.error('Error rescheduling PM:', error);
      alert(error.response?.data?.message || 'Gagal menjadwalkan ulang PM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPM = async () => {
    if (!pm || !cancelReason.trim()) {
      alert('Alasan pembatalan harus diisi');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/preventive-maintenance/${pm.id}/cancel`, {
        reason: cancelReason,
      });

      // Refresh data
      const response = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(response.data);
      setShowCancelDialog(false);
      setCancelReason('');
      alert('PM berhasil dibatalkan');
    } catch (error: any) {
      console.error('Error cancelling PM:', error);
      alert(error.response?.data?.message || 'Gagal membatalkan PM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableAutoSchedule = async () => {
    if (!pm) return;

    try {
      setDisablingAutoSchedule(true);
      await api.post(`/preventive-maintenance/${pm.id}/disable-auto-schedule`);

      // Refresh data
      const response = await api.get(`/preventive-maintenance/${pm.id}`);
      setPm(response.data);
      setShowDisableAutoScheduleDialog(false);
      alert('Auto-scheduling untuk PM rutin ini telah dinonaktifkan. PM berikutnya tidak akan dibuat otomatis.');
    } catch (error: any) {
      console.error('Error disabling auto-schedule:', error);
      alert(error.response?.data?.message || 'Gagal menonaktifkan auto-scheduling');
    } finally {
      setDisablingAutoSchedule(false);
    }
  };

  const handleDeletePM = async () => {
    if (!pm) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/preventive-maintenance/${pm.id}`);
      
      alert('PM berhasil dihapus');
      router.push('/preventive-maintenance');
    } catch (error: any) {
      console.error('Error deleting PM:', error);
      const errorMessage = error.response?.data?.message || 'Gagal menghapus PM';
      alert(errorMessage);
      
      // If error is about CANCELLED PM, show specific message
      if (errorMessage.includes('cancelled') || errorMessage.includes('CANCELLED')) {
        console.warn('PM is CANCELLED. Only Super Admin can delete CANCELLED PM.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading || isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" />
        </div>
      </PageLayout>
    );
  }

  if (!pm) {
    return (
      <PageLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">PM tidak ditemukan</p>
            <Button onClick={() => router.push('/preventive-maintenance')} className="mt-4">
              Kembali ke List PM
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const StatusIcon = statusConfig[pm.status]?.icon || AlertCircle;
  const completedCount = pm.cassetteDetails.filter((cd) => cd.status === 'COMPLETED').length;
  const totalCount = pm.cassetteDetails.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const canEdit = isHitachi && pm.status !== 'COMPLETED' && pm.status !== 'CANCELLED';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isRcManager = user?.role === 'RC_MANAGER';
  // Pengelola can cancel their own PM requests, Hitachi can cancel any PM
  // Compare requestedByPengelola.id with user.id for pengelola users
  const canCancel = (isHitachi || (isPengelola && pm?.requestedByPengelola?.id === user?.id)) 
    && pm?.status !== 'COMPLETED' 
    && pm?.status !== 'CANCELLED';
  // Hitachi users (RC_MANAGER and SUPER_ADMIN) can delete PM
  // SUPER_ADMIN can delete any PM (including COMPLETED and CANCELLED)
  // RC_MANAGER can only delete non-COMPLETED, non-CANCELLED, and non-IN_PROGRESS PM
  // RC_STAFF cannot delete PM
  const canDelete = isHitachi && pm && (
    isSuperAdmin || // SUPER_ADMIN can delete any PM (including CANCELLED and COMPLETED)
    (isRcManager && pm.status && pm.status !== 'IN_PROGRESS' && pm.status !== 'COMPLETED' && pm.status !== 'CANCELLED') // RC_MANAGER cannot delete IN_PROGRESS, COMPLETED, or CANCELLED
  );

  // Wizard steps
  const wizardSteps = [
    { key: 'INFO', label: 'Info PM', icon: FileText },
    { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench },
    { key: 'COMPLETION', label: 'Selesai', icon: CheckCircle2 },
  ];

  let currentWizardStep = 0;
  if (pm.status === 'SCHEDULED') {
    currentWizardStep = 0;
  } else if (pm.status === 'IN_PROGRESS') {
    currentWizardStep = completedCount === totalCount ? 2 : 1;
  } else if (pm.status === 'COMPLETED' || pm.status === 'CANCELLED') {
    currentWizardStep = 2;
  }

  const isAssignedToMe = pm.assignedEngineer === user?.id;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/preventive-maintenance')}
            className="text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>

        {/* Progress Wizard - Step Indicator (Compact like repair progress) */}
        <div className="mb-3 bg-slate-100 dark:bg-[#1e293b] rounded-lg p-3 shadow-md border border-slate-300 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Wrench className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
            Progress Preventive Maintenance
          </h3>
          <div className="relative z-0">
            <div className="flex justify-between items-start relative">
              {wizardSteps.map((step, index) => {
                const isActive = index === currentWizardStep;
                const isCompleted = index < currentWizardStep || pm.status === 'COMPLETED';
                const StepIcon = step.icon;
                
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                    {/* Connection Line */}
                    {index < wizardSteps.length - 1 && (
                      <div className="absolute top-4 left-1/2 w-full h-0.5 z-0">
                        <div className={`h-full transition-all ${
                          isCompleted ? 'bg-teal-500 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                      </div>
                    )}
                    
                    {/* Step Circle */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-20 mb-1
                      ${isActive 
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-600 shadow-md shadow-teal-500/50 scale-105' 
                        : isCompleted 
                        ? 'bg-teal-500 dark:bg-teal-500' 
                        : 'bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600'
                      }
                    `}>
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <StepIcon className={`h-3.5 w-3.5 ${isActive || isCompleted ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      )}
                    </div>
                    
                    {/* Step Label */}
                    <span className={`text-[10px] text-center font-semibold max-w-[60px] leading-tight transition-all
                      ${isActive ? 'text-teal-600 dark:text-teal-200' : isCompleted ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}
                    `}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Progress: {completedCount} / {totalCount} selesai
              </span>
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Wizard Content Area */}
        <div className="border-2 border-teal-500 dark:border-teal-400 rounded-2xl p-6 bg-white dark:bg-[#1e293b] shadow-xl">
          <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-600 shadow-lg">
              {(() => {
                const CurrentIcon = wizardSteps[currentWizardStep].icon;
                return <CurrentIcon className="h-8 w-8 text-white" />;
              })()}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {wizardSteps[currentWizardStep].label}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {currentWizardStep === 0 && `PM ${pm.pmNumber} - ${typeLabels[pm.type] || pm.type}`}
                    {currentWizardStep === 1 && `Lakukan maintenance pada ${totalCount} cassette`}
                    {currentWizardStep === 2 && 'Review dan selesaikan PM'}
                  </p>
                </div>
                <Badge className={`${statusConfig[pm.status]?.color} text-white text-sm px-3 py-1`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {statusConfig[pm.status]?.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Info PM */}
            {currentWizardStep === 0 && (
              <div className="space-y-4">
                {/* Header Card - Compact */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#1e293b] dark:to-[#0f172a] rounded-xl p-4 shadow-lg border border-slate-300 dark:border-slate-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
                          <CalendarCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{pm.pmNumber}</h1>
                          <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mt-0.5">
                            {typeLabels[pm.type] || 'Preventive Maintenance'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={`${statusConfig[pm.status]?.color} text-white text-xs px-2.5 py-1 font-bold`}>
                          <StatusIcon className="h-3.5 w-3.5 mr-1" />
                          {statusConfig[pm.status]?.label}
                        </Badge>
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 text-xs px-2.5 py-1 font-bold">
                          {typeLabels[pm.type] || pm.type}
                        </Badge>
                        {pm.cassetteDetails.length > 0 && (
                          <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded border-2 border-teal-500 dark:border-teal-500/50">
                            <div className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                {pm.cassetteDetails.length} {pm.cassetteDetails.length > 1 ? 'Kaset' : 'Kaset'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                      Informasi PM
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-teal-500 dark:text-teal-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal Jadwal</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                {format(new Date(pm.scheduledDate), 'dd MMMM yyyy', { locale: localeId })}
                              </p>
                              {(() => {
                                const scheduledDate = new Date(pm.scheduledDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                scheduledDate.setHours(0, 0, 0, 0);
                                const diffTime = scheduledDate.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                  return (
                                    <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                                      ({Math.abs(diffDays)} hari yang lalu)
                                    </span>
                                  );
                                } else if (diffDays === 0) {
                                  return (
                                    <span className="text-xs text-teal-500 dark:text-teal-400 font-medium">
                                      (Hari ini)
                                    </span>
                                  );
                                } else if (diffDays === 1) {
                                  return (
                                    <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                                      (Besok)
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                      (- {diffDays} hari)
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>

                        {pm.completedDate && (
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal Selesai</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                {format(new Date(pm.completedDate), 'dd MMMM yyyy', { locale: localeId })}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Jenis PM</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 text-xs px-2.5 py-1 font-bold">
                                {typeLabels[pm.type] || pm.type}
                              </Badge>
                              {pm.type === 'ROUTINE' && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                                  (Terjadwal otomatis)
                                </span>
                              )}
                              {(pm.type === 'ON_DEMAND_PENGELOLA' || pm.type === 'ON_DEMAND_HITACHI') && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                                  (Permintaan manual)
                                </span>
                              )}
                              {pm.type === 'EMERGENCY' && (
                                <span className="text-xs text-red-500 dark:text-red-400 italic font-semibold">
                                  (Prioritas tinggi)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-orange-500 dark:text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Lokasi</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{locationLabels[pm.location] || pm.location}</p>
                            {pm.locationAddress && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{pm.locationAddress}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-purple-500 dark:text-purple-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Engineer</p>
                            {pm.engineer ? (
                              <div>
                                <p className={`text-sm font-semibold ${isAssignedToMe ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-slate-200'}`}>
                                  {pm.engineer.fullName}
                                  {isAssignedToMe && <span className="ml-2 text-xs">(You)</span>}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{pm.engineer.role}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic">Unassigned</p>
                            )}
                          </div>
                        </div>

                        {user?.userType === 'HITACHI' && pm.status !== 'COMPLETED' && pm.status !== 'CANCELLED' && !isAssignedToMe && (
                          <Button
                            size="sm"
                            className="mt-2 bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white"
                            onClick={handleTakeTask}
                            disabled={takingTask}
                          >
                            {takingTask ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Taking...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Take Task
                              </>
                            )}
                          </Button>
                        )}

                        {pm.locationContact && (
                          <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-pink-500 dark:text-pink-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kontak Lokasi</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{pm.locationContact}</p>
                              {pm.locationContactPhone && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{pm.locationContactPhone}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-cyan-500 dark:text-cyan-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Diminta Oleh</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                              {pm.requestedByPengelola?.name || pm.requestedByHitachi?.name || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {pm.notes && (
                      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">CATATAN</p>
                        <p className="text-sm text-slate-900 dark:text-slate-200">{pm.notes}</p>
                      </div>
                    )}

                    {pm.cancellationReason && (
                      <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-2">ALASAN PEMBATALAN</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{pm.cancellationReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cassette List Preview */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                      Cassette yang akan di-maintenance
                      <Badge variant="secondary" className="ml-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-700">
                        {pm.cassetteDetails.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-2">
                      {pm.cassetteDetails.map((cd) => (
                        <div key={cd.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                {cd.cassette.serialNumber}
                              </p>
                              {cd.cassette.machine && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {cd.cassette.machine.machineId} • {cd.cassette.machine.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${cassetteStatusConfig[cd.status]?.color} text-white text-xs`}>
                            {cassetteStatusConfig[cd.status]?.label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons for step 1 */}
                {canEdit && (
                  <div className="flex gap-3 justify-end flex-wrap">
                    {pm.status === 'SCHEDULED' && (
                      <>
                        <Button
                          onClick={handleStartPM}
                          disabled={submitting || !isAssignedToMe}
                          className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 text-white px-8"
                          size="lg"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Mulai PM
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            // Set default date to tomorrow
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setRescheduleDate(tomorrow.toISOString().split('T')[0]);
                            setShowRescheduleDialog(true);
                          }}
                          disabled={submitting}
                          variant="outline"
                          size="lg"
                          className="border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Jadwalkan Ulang
                        </Button>
                      </>
                    )}
                    {canCancel && (pm.status === 'SCHEDULED' || pm.status === 'IN_PROGRESS') && (
                      <Button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={submitting}
                        variant="destructive"
                        size="lg"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Batalkan PM
                      </Button>
                    )}
                  </div>
                )}

                {/* Delete button - separate from canEdit so it shows even for COMPLETED/CANCELLED PM */}
                {canDelete && (
                  <div className="flex gap-3 justify-end flex-wrap mt-3">
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={deleting}
                      variant="destructive"
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus PM
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Maintenance - Cassette Details Table */}
            {currentWizardStep === 1 && (
              <div className="space-y-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="p-0">
                    <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                          <Package className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                          Daftar Cassette Maintenance ({pm.cassetteDetails.length})
                        </h3>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="w-full">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">No</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Serial Number</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Machine / Lokasi</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bank</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Temuan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tindakan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Parts</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Selesai</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {pm.cassetteDetails.map((cassetteDetail, index) => (
                            <tr 
                              key={cassetteDetail.id} 
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                {index + 1}
                              </td>
                              <td className="px-6 py-3">
                                <div>
                                  <p className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400">
                                    {cassetteDetail.cassette.serialNumber}
                                  </p>
                                  {cassetteDetail.cassette.cassetteType && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {cassetteDetail.cassette.cassetteType.typeCode}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.cassette.machine ? (
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                      {cassetteDetail.cassette.machine.machineId}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {cassetteDetail.cassette.machine.location || '-'}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.cassette.customerBank ? (
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px]" title={cassetteDetail.cassette.customerBank.bankName}>
                                      {cassetteDetail.cassette.customerBank.bankName}
                                    </p>
                                    {cassetteDetail.cassette.customerBank.bankCode && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {cassetteDetail.cassette.customerBank.bankCode}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <Badge className={`${cassetteStatusConfig[cassetteDetail.status]?.color} text-white text-xs`}>
                                  {cassetteStatusConfig[cassetteDetail.status]?.label}
                                </Badge>
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.findings ? (
                                  <p 
                                    className="text-sm text-slate-900 dark:text-slate-200 max-w-xs truncate" 
                                    title={cassetteDetail.findings}
                                  >
                                    {cassetteDetail.findings}
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.actionsTaken ? (
                                  <p 
                                    className="text-sm text-slate-900 dark:text-slate-200 max-w-xs truncate" 
                                    title={cassetteDetail.actionsTaken}
                                  >
                                    {cassetteDetail.actionsTaken}
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.partsReplaced && Array.isArray(cassetteDetail.partsReplaced) && cassetteDetail.partsReplaced.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {cassetteDetail.partsReplaced.slice(0, 2).map((part: string, idx: number) => (
                                      <Badge key={idx} className="text-[10px] bg-teal-500 dark:bg-teal-600 text-white">
                                        {part}
                                      </Badge>
                                    ))}
                                    {cassetteDetail.partsReplaced.length > 2 && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        +{cassetteDetail.partsReplaced.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {cassetteDetail.completedAt ? (
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {format(new Date(cassetteDetail.completedAt), 'dd MMM HH:mm', { locale: localeId })}
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-center">
                                {canEdit && cassetteDetail.status !== 'COMPLETED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      handleStartEdit(cassetteDetail);
                                      setExpandedCassette(cassetteDetail.id);
                                    }}
                                    className="h-7 px-2 text-xs border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                  >
                                    <Wrench className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {pm.cassetteDetails.length === 0 && (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Tidak ada cassette</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Step 3: Completion */}
            {currentWizardStep === 2 && (
              <div className="space-y-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4">
                      Summary Maintenance
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-2xl font-bold text-teal-500 dark:text-teal-400">{pm.cassetteDetails.length}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total Cassette</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-2xl font-bold text-green-500 dark:text-green-400">{completedCount}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Selesai</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                          {pm.cassetteDetails.filter(cd => cd.status === 'IN_PROGRESS').length}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Dalam Proses</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-2xl font-bold text-slate-500 dark:text-slate-400">
                          {pm.cassetteDetails.filter(cd => cd.status === 'PENDING').length}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Pending</p>
                      </div>
                    </div>

                    {pm.status === 'COMPLETED' ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-500 dark:border-green-400 rounded-lg text-center">
                          <CheckCircle2 className="h-16 w-16 text-green-500 dark:text-green-400 mx-auto mb-3" />
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">PM Selesai!</h3>
                          {pm.completedDate && (
                            <p className="text-slate-700 dark:text-slate-300 text-sm">
                              Diselesaikan pada: {format(new Date(pm.completedDate), 'dd MMMM yyyy, HH:mm', { locale: localeId })}
                            </p>
                          )}
                        </div>
                        {/* Auto-schedule info and disable button for ROUTINE PM */}
                        {pm.type === 'ROUTINE' && (pm.nextPmDate || pm.nextPmInterval) && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                  PM Rutin - Auto-scheduling Aktif
                                </p>
                                {pm.nextPmDate && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    PM berikutnya akan dibuat otomatis pada: {format(new Date(pm.nextPmDate), 'dd MMMM yyyy', { locale: localeId })}
                                  </p>
                                )}
                                {pm.nextPmInterval && !pm.nextPmDate && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Interval: {pm.nextPmInterval} hari
                                  </p>
                                )}
                              </div>
                              <Button
                                onClick={() => setShowDisableAutoScheduleDialog(true)}
                                variant="outline"
                                size="sm"
                                className="border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Nonaktifkan
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : pm.status === 'CANCELLED' ? (
                      <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400 rounded-lg">
                        <XCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">PM Dibatalkan</h3>
                        {pm.cancellationReason && (
                          <div className="mt-4">
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">ALASAN PEMBATALAN</p>
                            <p className="text-sm text-red-700 dark:text-red-300">{pm.cancellationReason}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 rounded-lg">
                        <p className="text-sm text-slate-700 dark:text-slate-300 text-center mb-4">
                          {completedCount < totalCount
                            ? `Selesaikan semua cassette (${completedCount}/${totalCount}) untuk melanjutkan`
                            : 'Semua cassette telah selesai. Anda dapat menyelesaikan PM ini.'}
                        </p>
                        {canEdit && (
                          <div className="flex gap-3">
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🟢 Button clicked:', { 
                                  submitting, 
                                  completedCount, 
                                  totalCount, 
                                  canComplete: completedCount >= totalCount 
                                });
                                handleCompletePM();
                              }}
                              disabled={submitting || completedCount < totalCount}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              size="lg"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-5 w-5 mr-2" />
                                  Selesaikan PM
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {!canEdit && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                            Hanya engineer yang di-assign atau Hitachi user yang dapat menyelesaikan PM
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cassette Summary List */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-4">
                      <ClipboardCheck className="h-4 w-4 inline mr-2 text-teal-500 dark:text-teal-400" />
                      Detail Cassette
                    </h3>
                    <div className="space-y-2">
                      {pm.cassetteDetails.map((cd) => (
                        <div key={cd.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                {cd.cassette.serialNumber}
                              </p>
                            </div>
                            <Badge className={`${cassetteStatusConfig[cd.status]?.color} text-white text-xs`}>
                              {cassetteStatusConfig[cd.status]?.label}
                            </Badge>
                          </div>
                          {cd.actionsTaken && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                              <strong>Action:</strong> {cd.actionsTaken}
                            </p>
                          )}
                          {cd.completedAt && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              <strong>Completed:</strong> {format(new Date(cd.completedAt), 'dd MMM HH:mm', { locale: localeId })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Delete button for Step 2 (Completion) - for COMPLETED/CANCELLED PM */}
                {canDelete && (
                  <div className="flex gap-3 justify-end flex-wrap mt-3">
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={deleting}
                      variant="destructive"
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus PM
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Cassette Dialog */}
      <Dialog open={editingCassette !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-teal-500 dark:text-teal-400" />
              Update Maintenance Cassette
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {editingCassette && pm?.cassetteDetails.find(cd => cd.id === editingCassette)?.cassette.serialNumber && (
                <>Update data maintenance untuk cassette <strong>{pm.cassetteDetails.find(cd => cd.id === editingCassette)?.cassette.serialNumber}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Status</Label>
              <select
                value={cassetteFormData.status || ''}
                onChange={(e) =>
                  setCassetteFormData({
                    ...cassetteFormData,
                    status: e.target.value,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
              >
                <option value="PENDING">Menunggu</option>
                <option value="IN_PROGRESS">Dalam Proses</option>
                <option value="COMPLETED">Selesai</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Temuan</Label>
              <Textarea
                value={cassetteFormData.findings || ''}
                onChange={(e) =>
                  setCassetteFormData({
                    ...cassetteFormData,
                    findings: e.target.value,
                  })
                }
                placeholder="Catat temuan saat maintenance..."
                className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Tindakan yang Dilakukan</Label>
              <Textarea
                value={cassetteFormData.actionsTaken || ''}
                onChange={(e) =>
                  setCassetteFormData({
                    ...cassetteFormData,
                    actionsTaken: e.target.value,
                  })
                }
                placeholder="Catat tindakan yang dilakukan..."
                className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Parts yang Diganti</Label>
              <Input
                value={cassetteFormData.partsReplaced || ''}
                onChange={(e) =>
                  setCassetteFormData({
                    ...cassetteFormData,
                    partsReplaced: e.target.value,
                  })
                }
                placeholder="Pisahkan dengan koma (contoh: Belt, Roller)"
                className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pisahkan dengan koma jika lebih dari 1
              </p>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Catatan Tambahan</Label>
              <Textarea
                value={cassetteFormData.notes || ''}
                onChange={(e) =>
                  setCassetteFormData({
                    ...cassetteFormData,
                    notes: e.target.value,
                  })
                }
                placeholder="Catatan tambahan..."
                className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (editingCassette && pm) {
                  const cassetteDetail = pm.cassetteDetails.find(cd => cd.id === editingCassette);
                  if (cassetteDetail) {
                    handleSaveCassette(cassetteDetail.cassetteId);
                  }
                }
              }}
              disabled={submitting}
              className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              Jadwalkan Ulang PM
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Pilih tanggal baru dan berikan alasan untuk menjadwalkan ulang PM {pm?.pmNumber}. PM hanya dapat dijadwalkan ulang dari status "Terjadwal".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Tanggal Baru *</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                className="mt-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tanggal harus di masa depan
              </p>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Alasan Penjadwalan Ulang *</Label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Jelaskan alasan penjadwalan ulang..."
                className="mt-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRescheduleDialog(false);
                setRescheduleDate('');
                setRescheduleReason('');
              }}
              disabled={submitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button
              onClick={handleReschedulePM}
              disabled={submitting || !rescheduleDate || !rescheduleReason.trim()}
              className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Jadwalkan Ulang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Batalkan PM</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Masukkan alasan pembatalan PM ini. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-slate-700 dark:text-slate-300">Alasan Pembatalan</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Jelaskan alasan pembatalan..."
              className="mt-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}
              disabled={submitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelPM}
              disabled={submitting || !cancelReason.trim()}
            >
              {submitting ? 'Memproses...' : 'Batalkan PM'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete PM Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
              Hapus PM
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-slate-600 dark:text-slate-400 space-y-3">
                <p>Apakah Anda yakin ingin menghapus PM ini? Tindakan ini akan menandai PM sebagai CANCELLED dan tidak dapat dibatalkan.</p>
                {pm?.status === 'COMPLETED' || pm?.status === 'CANCELLED' ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      ℹ️ PM ini sudah {pm?.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED'}. Hanya Super Admin yang dapat menghapus PM yang sudah selesai atau dibatalkan.
                    </p>
                  </div>
                ) : pm?.status === 'IN_PROGRESS' ? (
                  <p className="text-red-600 dark:text-red-400 font-semibold">PM yang sedang IN_PROGRESS tidak dapat dihapus. Silakan batalkan terlebih dahulu.</p>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400 font-semibold">RC Manager tidak dapat menghapus PM yang sudah COMPLETED atau CANCELLED. Hanya Super Admin yang dapat menghapus PM tersebut.</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePM}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus PM
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Auto-Schedule Dialog */}
      <Dialog open={showDisableAutoScheduleDialog} onOpenChange={setShowDisableAutoScheduleDialog}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              Nonaktifkan Auto-Scheduling
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menonaktifkan auto-scheduling untuk PM rutin ini? PM berikutnya tidak akan dibuat otomatis berdasarkan interval yang sudah ditetapkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Catatan:</strong> Setelah dinonaktifkan, PM berikutnya harus dibuat secara manual. 
                Anda dapat mengaktifkan kembali dengan membuat PM rutin baru dengan interval yang sama.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableAutoScheduleDialog(false)}
              disabled={disablingAutoSchedule}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableAutoSchedule}
              disabled={disablingAutoSchedule}
            >
              {disablingAutoSchedule ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Nonaktifkan Auto-Scheduling
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

