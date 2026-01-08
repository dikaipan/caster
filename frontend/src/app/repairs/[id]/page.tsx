'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Wrench,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  UserPlus,
  PlayCircle,
  PauseCircle,
  Search,
  Save,
  CheckCircle,
  RefreshCw,
  Shield,
  Calendar,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CASSETTE_PARTS, getPartsForMachineType } from '@/config/cassette-parts';

export default function RepairDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const repairId = params.id as string;
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [takingTicket, setTakingTicket] = useState(false);
  const [repair, setRepair] = useState<any>(null);
  const [activeForm, setActiveForm] = useState<'none' | 'diagnosing' | 'repair' | 'complete'>('none');

  // Form fields
  const [repairActionTaken, setRepairActionTaken] = useState('');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [otherParts, setOtherParts] = useState(''); // For non-standard parts
  const [notes, setNotes] = useState('');
  const [qcPassed, setQcPassed] = useState<boolean | null>(null);
  const [showCompleteRepairDialog, setShowCompleteRepairDialog] = useState(false);

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const [ticket, setTicket] = useState<any>(null);
  const [hasReplacementRequest, setHasReplacementRequest] = useState(false);

  useEffect(() => {
    const fetchRepair = async () => {
      if (!isAuthenticated || !repairId) return;

      try {
        const response = await api.get(`/repairs/${repairId}`);
        const data = response.data;
        console.log('Repair data:', {
          id: data.id,
          status: data.status,
          receivedAtRc: data.receivedAtRc,
          hasReceivedAtRc: !!data.receivedAtRc
        });
        setRepair(data);
        setRepairActionTaken(data.repairActionTaken || '');

        // Handle partsReplaced - convert dari array of names ke array of IDs
        if (data.partsReplaced) {
          if (Array.isArray(data.partsReplaced)) {
            const machineType = data.cassette?.cassetteType?.machineType;
            if (machineType && (machineType === 'SR' || machineType === 'VS')) {
              const allParts = [
                ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].outer,
                ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].inner
              ];

              // Match part names to IDs
              const matchedIds = data.partsReplaced
                .map((partName: string) => {
                  const found = allParts.find((p: any) => p.name === partName);
                  return found?.id;
                })
                .filter((id: any): id is string => !!id);

              setSelectedParts(matchedIds.length > 0 ? matchedIds : []);
            } else {
              setSelectedParts([]);
            }
          } else {
            setSelectedParts([]);
          }
        } else {
          setSelectedParts([]);
        }

        setNotes(data.notes || '');
        setQcPassed(data.qcPassed);

        // Fetch ticket to check for replacement request
        if (data.cassette?.id) {
          try {
            const deliveriesResponse = await api.get(`/tickets?cassetteId=${data.cassette.id}`);
            // API returns { data: [...], pagination: {...} } structure
            const tickets = Array.isArray(deliveriesResponse.data?.data)
              ? deliveriesResponse.data.data
              : Array.isArray(deliveriesResponse.data)
                ? deliveriesResponse.data
                : [];
            const replacementTicket = tickets.find((t: any) => {
              if (t.cassetteDetails && t.cassetteDetails.length > 0) {
                return t.cassetteDetails.some((detail: any) =>
                  detail.cassetteId === data.cassette.id &&
                  detail.requestReplacement === true
                );
              }
              return false;
            });

            if (replacementTicket) {
              setTicket(replacementTicket);
              setHasReplacementRequest(true);
            }
          } catch (err) {
            console.warn('Could not fetch ticket:', err);
          }
        }
      } catch (error: any) {
        console.error('Error fetching repair:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load repair' });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && repairId) {
      fetchRepair();
    }
  }, [isAuthenticated, repairId]);

  // Reset activeForm to 'none' when repair data changes to ensure user goes through flow from start
  useEffect(() => {
    if (repair) {
      // Only auto-set form if status is COMPLETED (to show completed view)
      // Otherwise, always start from step 0 (Identifikasi Kaset)
      if (repair.status === 'COMPLETED') {
        setActiveForm('none');
      } else {
        // Reset to none to force user to start from step 0
        setActiveForm('none');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repair?.id]); // Only reset when repair ID changes, not on every status change

  const handleTakeTicket = async () => {
    try {
      setTakingTicket(true);
      const response = await api.post(`/repairs/${repairId}/take`);
      setRepair(response.data);
      setMessage({ type: 'success', text: 'Ticket assigned to you successfully!' });
    } catch (error: any) {
      console.error('Error taking ticket:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to take ticket'
      });
    } finally {
      setTakingTicket(false);
    }
  };

  const handleStartDiagnosing = async () => {
    setMessage(null);
    setSubmitting(true);

    try {
      await api.patch(`/repairs/${repairId}`, {
        status: 'DIAGNOSING',
      });

      const response = await api.get(`/repairs/${repairId}`);
      setRepair(response.data);
      setActiveForm('diagnosing');
      setMessage({ type: 'success', text: '✅ Status diubah ke Diagnosing' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal update status' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartRepair = async () => {
    setMessage(null);
    setSubmitting(true);

    try {
      await api.patch(`/repairs/${repairId}`, {
        status: 'ON_PROGRESS',
        notes: notes.trim() || undefined,
      });

      const response = await api.get(`/repairs/${repairId}`);
      setRepair(response.data);
      setActiveForm('repair');
      setMessage({ type: 'success', text: '✅ Status diubah ke On Progress. Silakan update progress repair.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal update status' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    setMessage(null);
    setSubmitting(true);

    try {
      const machineType = repair?.cassette?.cassetteType?.machineType;
      let partsArray: string[] = [];

      // Add standard parts from checklist
      if (machineType && (machineType === 'SR' || machineType === 'VS') && selectedParts.length > 0) {
        partsArray = selectedParts.map(id => {
          const allParts = [
            ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].outer,
            ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].inner
          ];
          const part = allParts.find((p: any) => p.id === id);
          return part?.name || id;
        });
      }

      // Add other parts (custom input)
      if (otherParts.trim()) {
        const customParts = otherParts.split(',').map(p => p.trim()).filter(p => p);
        partsArray = [...partsArray, ...customParts];
      }

      await api.patch(`/repairs/${repairId}`, {
        repairActionTaken: repairActionTaken.trim() || undefined,
        partsReplaced: partsArray.length > 0 ? partsArray : undefined,
        otherPartsReplaced: otherParts.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const response = await api.get(`/repairs/${repairId}`);
      setRepair(response.data);
      setMessage({ type: 'success', text: '✅ Progress tersimpan!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan progress' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setMessage(null);

    if (qcPassed === null) {
      setMessage({ type: 'error', text: 'Pilih status QC terlebih dahulu!' });
      return;
    }

    if (!repairActionTaken.trim()) {
      setMessage({ type: 'error', text: 'Repair action harus diisi!' });
      return;
    }

    setShowCompleteRepairDialog(true);
  };

  const handleConfirmCompleteRepair = async () => {
    setSubmitting(true);
    setShowCompleteRepairDialog(false);

    try {
      const machineType = repair?.cassette?.cassetteType?.machineType;
      let partsArray: string[] = [];

      // Add standard parts from checklist
      if (machineType && (machineType === 'SR' || machineType === 'VS') && selectedParts.length > 0) {
        partsArray = selectedParts.map(id => {
          const allParts = [
            ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].outer,
            ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].inner
          ];
          const part = allParts.find((p: any) => p.id === id);
          return part?.name || id;
        });
      }

      // Add other parts (custom input)
      if (otherParts.trim()) {
        const customParts = otherParts.split(',').map(p => p.trim()).filter(p => p);
        partsArray = [...partsArray, ...customParts];
      }

      await api.post(`/repairs/${repairId}/complete`, {
        repairActionTaken: repairActionTaken.trim(),
        partsReplaced: partsArray.length > 0 ? partsArray : undefined,
        qcPassed,
      });

      setMessage({ type: 'success', text: `✅ Repair selesai! QC ${qcPassed ? 'Passed' : 'Failed'}` });

      // Refresh data
      const refreshResponse = await api.get(`/repairs/${repairId}`);
      setRepair(refreshResponse.data);
      setActiveForm('none');
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal complete repair' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any }> = {
      RECEIVED: { label: 'Received', variant: 'bg-blue-500 dark:bg-blue-500 text-white', icon: Package },
      DIAGNOSING: { label: 'Diagnosing', variant: 'bg-yellow-500 dark:bg-yellow-500 text-white', icon: Search },
      ON_PROGRESS: { label: 'On Progress', variant: 'bg-orange-500 dark:bg-orange-500 text-white', icon: Wrench },
      COMPLETED: { label: 'Completed', variant: 'bg-green-500 dark:bg-green-500 text-white', icon: CheckCircle2 },
    };
    return configs[status] || { label: status, variant: 'bg-gray-500 dark:bg-gray-500 text-white', icon: FileText };
  };

  if (isLoading || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated || user?.userType !== 'HITACHI') {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Access denied. RC Staff only.</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (!repair) {
    return (
      <PageLayout>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Repair ticket tidak ditemukan</p>
            <Button variant="outline" className="mt-4 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => router.push('/repairs')}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const statusBadge = getStatusBadge(repair.status);
  const StatusIcon = statusBadge.icon;
  const wizardSteps = [
    { key: 'IDENTIFIKASI', label: 'Identifikasi Kaset', icon: Package },
    { key: 'DIAGNOSA', label: 'Diagnosa Masalah', icon: Search },
    { key: 'REPAIR', label: 'Perbaikan', icon: Wrench },
    { key: 'QC', label: 'QC & Selesai', icon: CheckCircle2 },
  ];

  // Determine wizard step based on activeForm, not repair status
  // This ensures user always goes through flow from step 0 (Identifikasi Kaset)
  let currentWizardStep = 0;
  if (repair.status === 'COMPLETED') {
    // If completed, show step 3 (QC & Selesai) view
    currentWizardStep = 3;
  } else if (activeForm === 'complete') {
    // If user is in complete form, show step 3
    currentWizardStep = 3;
  } else if (activeForm === 'repair') {
    // If user is in repair form, show step 2
    currentWizardStep = 2;
  } else if (activeForm === 'diagnosing') {
    // If user is in diagnosing form, show step 1
    currentWizardStep = 1;
  } else {
    // Default: show step 0 (Identifikasi Kaset)
    // This ensures user always starts from step 0, regardless of repair status
    currentWizardStep = 0;
  }

  const isAssignedToMe = repair.repairedBy === user?.id;
  const canTakeTicket = !repair.repairedBy || isAssignedToMe;

  return (
    <PageLayout>
      <div className="w-full max-w-6xl mx-auto">
        {/* Pesan error / sukses */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${message.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Progress Wizard - Step Indicator */}
        <div className="mb-4 bg-white dark:bg-[#1e293b] rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2 relative">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentWizardStep;
              const isCompleted = index < currentWizardStep || repair.status === 'COMPLETED';
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                  {/* Connector line */}
                  {index < wizardSteps.length - 1 && (
                    <div className="absolute top-6 left-1/2 w-full h-px -z-10">
                      <div
                        className={`h-full transition-all ${isCompleted || (isActive && index < currentWizardStep)
                          ? 'bg-teal-500 dark:bg-teal-400'
                          : 'bg-slate-200 dark:bg-slate-600'
                          }`}
                      />
                    </div>
                  )}

                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive
                      ? 'bg-teal-500 dark:bg-teal-500'
                      : isCompleted
                        ? 'bg-teal-500 dark:bg-teal-500'
                        : 'bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600'
                      }`}
                  >
                    <StepIcon className={`h-5 w-5 ${isActive || isCompleted ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  </div>

                  <p
                    className={`mt-2 text-xs font-medium text-center transition-all ${isActive
                      ? 'text-teal-600 dark:text-teal-400'
                      : isCompleted
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-slate-500 dark:text-slate-400'
                      }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Content Area */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-[#1e293b]">
          <div className="flex flex-col md:flex-row items-start gap-2.5 mb-2.5">
            <div className="p-1.5 rounded-md bg-teal-500 dark:bg-teal-500">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-0.5">
                {wizardSteps[currentWizardStep].label}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-2">
                {currentWizardStep === 0 && 'Informasi kaset yang akan diperbaiki'}
                {currentWizardStep === 1 && 'Catat temuan dan diagnosa masalah pada kaset'}
                {currentWizardStep === 2 && 'Update progress perbaikan dan parts yang diganti'}
                {currentWizardStep === 3 && 'Quality Control dan penyelesaian repair'}
              </p>

              {/* Cassette Info Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-teal-200 dark:border-teal-500/50">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Serial Number</p>
                      <p className="text-sm font-mono font-semibold text-teal-600 dark:text-teal-400">
                        {repair.cassette?.serialNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {repair.cassette?.cassetteType?.machineType && (
                  <div className={`px-2.5 py-1.5 rounded-md border ${repair.cassette.cassetteType.machineType === 'VS'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/50'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/50'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <Wrench className={`h-3.5 w-3.5 ${repair.cassette.cassetteType.machineType === 'VS'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-orange-600 dark:text-orange-400'
                        }`} />
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mesin</p>
                        <p className={`text-sm font-semibold ${repair.cassette.cassetteType.machineType === 'VS'
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-orange-700 dark:text-orange-300'
                          }`}>
                          {repair.cassette.cassetteType.machineType}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {repair.cassette?.cassetteType && (
                  <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</p>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {repair.cassette.cassetteType.typeCode}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {repair.cassette?.customerBank && (
                  <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bank</p>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {repair.cassette.customerBank.bankName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="space-y-2.5">
            {/* Step 1: Identifikasi Kaset */}
            {currentWizardStep === 0 && (
              <div className="space-y-2">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <InfoBlock icon={Package} iconColor="text-teal-600 dark:text-teal-400" title="CASSETTE" isDark>
                        <InfoItem label="SN" value={repair.cassette?.serialNumber || 'N/A'} mono isDark />
                        {repair.cassette?.cassetteType && (
                          <InfoItem label="Type" value={repair.cassette.cassetteType.typeCode} isDark />
                        )}
                      </InfoBlock>

                      <InfoBlock icon={Building2} iconColor="text-green-600 dark:text-green-400" title="BANK" isDark>
                        <InfoItem label="Name" value={repair.cassette?.customerBank?.bankName || 'N/A'} isDark />
                        {repair.cassette?.customerBank?.bankCode && (
                          <InfoItem label="Code" value={repair.cassette.customerBank.bankCode} isDark />
                        )}
                      </InfoBlock>

                      <InfoBlock icon={User} iconColor="text-orange-600 dark:text-orange-400" title="REPAIRER" isDark>
                        <InfoItem label="Name" value={repair.repairer?.fullName || 'Not assigned'} isDark />
                        {repair.repairer?.role && <InfoItem label="Role" value={repair.repairer.role} isDark />}
                      </InfoBlock>

                      <InfoBlock icon={Clock} iconColor="text-slate-600 dark:text-gray-400" title="TIME" isDark>
                        <InfoItem
                          label="Received"
                          value={
                            repair.receivedAtRc
                              ? new Date(repair.receivedAtRc).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                              })
                              : 'N/A'
                          }
                          isDark
                        />
                        <InfoItem
                          label="QC"
                          value={
                            repair.qcPassed === null
                              ? '⏳ Pending'
                              : repair.qcPassed
                                ? '✅ Pass'
                                : '❌ Fail'
                          }
                          isDark
                        />
                      </InfoBlock>
                    </div>

                    {/* Warranty Information - Only show if repair is completed and has warranty */}
                    {repair.status === 'COMPLETED' && repair.qcPassed && repair.warrantyType && repair.warrantyEndDate && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Warranty Information</p>
                        </div>
                        {(() => {
                          const endDate = new Date(repair.warrantyEndDate);
                          const now = new Date();
                          const isUnderWarranty = endDate >= now;
                          const warrantyTypeLabel = repair.warrantyType === 'MA' ? 'Maintenance Agreement' :
                            repair.warrantyType === 'MS' ? 'Manage Service' :
                              repair.warrantyType === 'IN_WARRANTY' ? 'In Warranty' :
                                repair.warrantyType === 'OUT_WARRANTY' ? 'Out Warranty' :
                                  repair.warrantyType;

                          return (
                            <div className="space-y-2.5">
                              <div className={`p-3 rounded-lg border-2 ${isUnderWarranty
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-500'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Shield className={`h-5 w-5 ${isUnderWarranty ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                      }`} />
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {isUnderWarranty ? '✅ Masih Dalam Garansi' : '❌ Garansi Sudah Berakhir'}
                                    </p>
                                  </div>
                                  <Badge className={
                                    isUnderWarranty
                                      ? 'bg-green-500 dark:bg-green-500 text-white'
                                      : 'bg-red-500 dark:bg-red-500 text-white'
                                  }>
                                    {isUnderWarranty ? 'GRATIS' : 'BERBAYAR'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">
                                  {isUnderWarranty
                                    ? 'Service ini masih dalam periode garansi. Tidak ada biaya yang dikenakan.'
                                    : 'Service ini sudah di luar periode garansi. Akan dikenakan biaya sesuai tarif.'
                                  }
                                </p>
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-300 dark:border-slate-700">
                                  <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Warranty Type</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {warrantyTypeLabel}
                                    </p>
                                  </div>
                                  {repair.warrantyEndDate && (
                                    <div>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Warranty End Date</p>
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {new Date(repair.warrantyEndDate).toLocaleDateString('id-ID', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {repair.reportedIssue && (
                      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-2">REPORTED ISSUE</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{repair.reportedIssue}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action buttons for step 1 */}
                <div className="flex flex-col gap-3">
                  {/* Show info if ticket is assigned to someone else (only for RECEIVED status) */}
                  {repair.status === 'RECEIVED' && repair.repairedBy && !isAssignedToMe && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            Ticket Sudah Diambil
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-300">
                            Ticket ini sudah diambil oleh <span className="font-bold">{repair.repairer?.fullName || 'User lain'}</span>.
                            Anda tidak dapat mengambil ticket yang sudah di-assign ke user lain.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    {repair.status === 'RECEIVED' && canTakeTicket && !isAssignedToMe && (
                      <>
                        <Button
                          onClick={handleTakeTicket}
                          disabled={takingTicket}
                          className="bg-orange-600 dark:bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-700 text-white w-full sm:w-auto px-4 sm:px-8"
                          size="lg"
                        >
                          {takingTicket ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Mengambil tiket...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Ambil Ticket
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setActiveForm('diagnosing')}
                          className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white w-full sm:w-auto px-4 sm:px-8"
                          size="lg"
                        >
                          Lanjut ke Diagnosa Masalah
                          <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                        </Button>
                      </>
                    )}
                    {repair.status === 'RECEIVED' && isAssignedToMe && (
                      <Button
                        onClick={handleStartDiagnosing}
                        disabled={submitting}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white w-full sm:w-auto px-4 sm:px-8"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Lanjut ke Diagnosa Masalah
                            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                          </>
                        )}
                      </Button>
                    )}
                    {/* Navigation button - show if status is not RECEIVED and not COMPLETED */}
                    {/* Also update status to DIAGNOSING to capture waiting time */}
                    {repair.status !== 'RECEIVED' && repair.status !== 'COMPLETED' && (
                      <Button
                        onClick={async () => {
                          // If status is not DIAGNOSING yet, update it to capture diagnosingStartAt
                          if (repair.status !== 'DIAGNOSING') {
                            try {
                              setSubmitting(true);
                              await api.patch(`/repairs/${repairId}`, {
                                status: 'DIAGNOSING',
                              });
                              const response = await api.get(`/repairs/${repairId}`);
                              setRepair(response.data);
                            } catch (err: any) {
                              console.error('Error updating status:', err);
                            } finally {
                              setSubmitting(false);
                            }
                          }
                          setActiveForm('diagnosing');
                        }}
                        disabled={submitting}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white w-full sm:w-auto px-4 sm:px-8"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Lanjut ke Diagnosa Masalah
                            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Diagnosa */}
            {currentWizardStep === 1 && (
              <div className="space-y-2">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          TEMUAN DIAGNOSA / FINDINGS
                        </label>
                        <Textarea
                          placeholder="Jelaskan masalah yang ditemukan saat diagnosa kaset..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={5}
                          className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                        />
                        <p className="text-xs text-slate-600 dark:text-slate-500 mt-1.5">
                          Catat semua temuan secara detail untuk membantu proses repair
                        </p>
                      </div>

                      {repair.reportedIssue && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">REPORTED ISSUE</p>
                          <p className="text-sm text-slate-800 dark:text-slate-300">{repair.reportedIssue}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    onClick={handleStartRepair}
                    disabled={submitting}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white w-full sm:w-auto px-4 sm:px-8"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Lanjut ke Perbaikan
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Perbaikan */}
            {currentWizardStep === 2 && (
              <div className="space-y-2">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          REPAIR ACTION TAKEN <span className="text-red-600 dark:text-red-400">*</span>
                        </label>
                        <Textarea
                          placeholder="Jelaskan tindakan perbaikan yang dilakukan secara detail..."
                          value={repairActionTaken}
                          onChange={(e) => setRepairActionTaken(e.target.value)}
                          rows={4}
                          className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          PARTS REPLACED
                        </label>

                        {(() => {
                          const machineType = repair?.cassette?.cassetteType?.machineType as 'SR' | 'VS' | undefined;
                          const partsConfig = getPartsForMachineType(machineType);

                          if (!machineType || (machineType !== 'SR' && machineType !== 'VS')) {
                            return (
                              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1.5">
                                  Tipe cassette tidak dikenali. Silakan input parts secara manual.
                                </p>
                                <Input
                                  placeholder="Contoh: Sensor Belt SB-100, Roller RK-50 (pisahkan dengan koma)"
                                  value={selectedParts.join(', ')}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedParts(value ? [value] : []);
                                  }}
                                  className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                                />
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2.5">
                              {/* Outer Parts */}
                              {Array.isArray(partsConfig.outer) && partsConfig.outer.length > 0 && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    OUTER UNIT
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {Array.isArray(partsConfig.outer) && partsConfig.outer.map((part) => (
                                      <div key={part.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={part.id}
                                          checked={selectedParts.includes(part.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedParts([...selectedParts, part.id]);
                                            } else {
                                              setSelectedParts(selectedParts.filter(id => id !== part.id));
                                            }
                                          }}
                                          className="border-slate-300 dark:border-slate-600"
                                        />
                                        <label
                                          htmlFor={part.id}
                                          className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer flex-1"
                                        >
                                          {part.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Inner Parts */}
                              {Array.isArray(partsConfig.inner) && partsConfig.inner.length > 0 && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    INNER UNIT
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {Array.isArray(partsConfig.inner) && partsConfig.inner.map((part) => (
                                      <div key={part.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={part.id}
                                          checked={selectedParts.includes(part.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedParts([...selectedParts, part.id]);
                                            } else {
                                              setSelectedParts(selectedParts.filter(id => id !== part.id));
                                            }
                                          }}
                                          className="border-slate-300 dark:border-slate-600"
                                        />
                                        <label
                                          htmlFor={part.id}
                                          className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer flex-1"
                                        >
                                          {part.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Selected Parts Summary */}
                              {selectedParts.length > 0 && (
                                <div className="p-2.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">
                                    PARTS TERPILIH ({selectedParts.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedParts.map((partId) => {
                                      const allParts = [
                                        ...(Array.isArray(partsConfig.outer) ? partsConfig.outer : []),
                                        ...(Array.isArray(partsConfig.inner) ? partsConfig.inner : [])
                                      ];
                                      const part = allParts.find(p => p.id === partId);
                                      return part ? (
                                        <Badge key={partId} variant="outline" className="text-xs">
                                          {part.name}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-slate-600 dark:text-slate-500">
                                Pilih parts yang diganti dari daftar di atas. Opsional - kosongkan jika tidak ada parts yang diganti.
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Other Parts - Custom Input */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          PARTS LAINNYA (OPSIONAL)
                        </label>
                        <Input
                          placeholder="Parts lain yang tidak ada di daftar (pisahkan dengan koma). Contoh: Sensor XYZ, Bracket ABC"
                          value={otherParts}
                          onChange={(e) => setOtherParts(e.target.value)}
                          className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                        />
                        {otherParts.trim() && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              ✏️ Parts tambahan: {otherParts.split(',').map(p => p.trim()).filter(p => p).join(', ')}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Masukkan parts yang tidak ada di checklist standar. Pisahkan dengan koma.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          CATATAN TAMBAHAN
                        </label>
                        <Textarea
                          placeholder="Catatan atau informasi tambahan..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <Button
                    onClick={handleSaveProgress}
                    disabled={submitting}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Progress
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setActiveForm('complete')}
                    disabled={submitting || !repairActionTaken.trim()}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white w-full sm:w-auto px-4 sm:px-8"
                    size="lg"
                  >
                    Lanjut ke QC & Selesai
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: QC & Selesai */}
            {currentWizardStep === 3 && repair.status !== 'COMPLETED' && (
              <div className="space-y-2">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">REPAIR ACTION</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{repairActionTaken || 'Belum diisi'}</p>
                      </div>

                      {selectedParts.length > 0 && (() => {
                        const machineType = repair?.cassette?.cassetteType?.machineType;
                        if (!machineType || (machineType !== 'SR' && machineType !== 'VS')) {
                          return null;
                        }
                        const allParts = [
                          ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].outer,
                          ...CASSETTE_PARTS[machineType as 'SR' | 'VS'].inner
                        ];
                        const selectedPartNames = selectedParts
                          .map((id: any) => allParts.find((p: any) => p.id === id)?.name)
                          .filter((name): name is string => !!name);

                        return (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">PARTS REPLACED</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedPartNames.map((name, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          STATUS QC <span className="text-red-600 dark:text-red-400">*</span>
                        </label>
                        <Select
                          value={qcPassed === null ? '' : qcPassed.toString()}
                          onValueChange={(value) => setQcPassed(value === 'true')}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200">
                            <SelectValue placeholder="Pilih hasil Quality Control..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            <SelectItem value="true" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                              <div className="flex items-center gap-3 py-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                                <div className="font-semibold">✅ QC Passed</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="false" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                              <div className="flex items-center gap-3 py-2">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                                <div className="font-semibold">❌ QC Failed</div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {qcPassed !== null && (
                        <div className={`p-4 rounded-lg border-2 ${qcPassed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-500'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500'
                          }`}>
                          <p className="text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">
                            {qcPassed ? '✅ Kaset Lolos QC' : '❌ Kaset Tidak Lolos QC'}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-400">
                            {qcPassed
                              ? 'Kaset sudah diperbaiki dan lolos QC. Status kaset sekarang: READY_FOR_PICKUP (siap di-pickup di RC). Status SO akan berubah menjadi RESOLVED. Setelah Pengelola konfirmasi pickup di RC, status kaset akan menjadi OK dan siap digunakan kembali.'
                              : 'Kaset akan ditandai sebagai SCRAPPED dan tidak dapat digunakan lagi.'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <Button
                    onClick={async () => {
                      // If status is not ON_PROGRESS yet, update it to capture repairStartAt
                      if (repair.status !== 'ON_PROGRESS' && repair.status !== 'COMPLETED') {
                        try {
                          setSubmitting(true);
                          await api.patch(`/repairs/${repairId}`, {
                            status: 'ON_PROGRESS',
                          });
                          const response = await api.get(`/repairs/${repairId}`);
                          setRepair(response.data);
                        } catch (err: any) {
                          console.error('Error updating status:', err);
                        } finally {
                          setSubmitting(false);
                        }
                      }
                      setActiveForm('repair');
                      setQcPassed(null);
                    }}
                    disabled={submitting}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali ke Perbaikan
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleComplete}
                    disabled={submitting || qcPassed === null || !repairActionTaken.trim()}
                    className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-500 dark:to-green-600 hover:from-green-600 hover:to-green-700 dark:hover:from-green-600 dark:hover:to-green-700 text-white w-full sm:w-auto px-4 sm:px-8"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Complete Repair
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Repair Completed */}
            {repair.status === 'COMPLETED' && (
              <div className="space-y-2.5">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-500 dark:border-green-500 border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-center mb-2.5">
                      <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">Repair Selesai!</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        QC Status: {repair.qcPassed ? '✅ Passed' : '❌ Failed'}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {repair.repairActionTaken && (
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">REPAIR ACTION</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{repair.repairActionTaken}</p>
                        </div>
                      )}

                      {repair.partsReplaced && (
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">PARTS REPLACED</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200">
                            {Array.isArray(repair.partsReplaced)
                              ? repair.partsReplaced.join(', ')
                              : repair.partsReplaced}
                          </p>
                        </div>
                      )}

                      {repair.notes && (
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">NOTES</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{repair.notes}</p>
                        </div>
                      )}

                      {/* Warranty Information - Only show if QC passed and warranty exists */}
                      {repair.qcPassed && repair.warrantyType && repair.warrantyEndDate && (
                        <div className="p-2.5 rounded-lg border">
                          {(() => {
                            const endDate = new Date(repair.warrantyEndDate);
                            const now = new Date();
                            const isUnderWarranty = endDate >= now;
                            const warrantyTypeLabel = repair.warrantyType === 'MA' ? 'Maintenance Agreement' :
                              repair.warrantyType === 'MS' ? 'Manage Service' :
                                repair.warrantyType === 'IN_WARRANTY' ? 'In Warranty' :
                                  repair.warrantyType === 'OUT_WARRANTY' ? 'Out Warranty' :
                                    repair.warrantyType;

                            return (
                              <div className={`${isUnderWarranty
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-500'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Shield className={`h-5 w-5 ${isUnderWarranty ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                      }`} />
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {isUnderWarranty ? '✅ Masih Dalam Garansi' : '❌ Garansi Sudah Berakhir'}
                                    </p>
                                  </div>
                                  <Badge className={
                                    isUnderWarranty
                                      ? 'bg-green-500 dark:bg-green-500 text-white'
                                      : 'bg-red-500 dark:bg-red-500 text-white'
                                  }>
                                    {isUnderWarranty ? 'GRATIS' : 'BERBAYAR'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                                  {isUnderWarranty
                                    ? 'Service ini masih dalam periode garansi. Tidak ada biaya yang dikenakan.'
                                    : 'Service ini sudah di luar periode garansi. Akan dikenakan biaya sesuai tarif.'
                                  }
                                </p>
                                <div className="grid grid-cols-2 gap-2.5 mt-2 pt-2 border-t border-slate-300 dark:border-slate-700">
                                  <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Warranty Type</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {warrantyTypeLabel}
                                    </p>
                                  </div>
                                  {repair.warrantyEndDate && (
                                    <div>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Warranty End Date</p>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {new Date(repair.warrantyEndDate).toLocaleDateString('id-ID', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Replacement Request Info */}
                    {hasReplacementRequest && repair.status === 'COMPLETED' && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-500 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                              Replacement Requested
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                              Kaset ini diminta untuk diganti. Silakan input form replacement untuk mengganti SN kaset.
                            </p>
                            <Button
                              onClick={() => router.push(`/repairs/${repairId}/replacement`)}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white"
                              size="sm"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Input Form Replacement
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() => {
                          const page = searchParams.get('page');
                          if (page) {
                            router.push(`/repairs?page=${page}`);
                          } else {
                            router.push('/repairs');
                          }
                        }}
                        variant="outline"
                        className="flex-1 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Kembali ke Repairs
                      </Button>
                      <Button
                        onClick={() => router.push('/tickets')}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-500 dark:to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white"
                      >
                        Lihat Service Orders
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Complete Repair Dialog */}
      <Dialog open={showCompleteRepairDialog} onOpenChange={setShowCompleteRepairDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] sm:max-w-[500px] mx-auto rounded-3xl sm:rounded-lg p-4 sm:p-6">
          <DialogHeader className="px-0">
            <DialogTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="h-5 w-5" />
              Konfirmasi Selesai Repair
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyelesaikan repair ini?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-0">
            {/* QC Status Info */}
            <div className={`rounded-xl p-3 sm:p-4 border ${qcPassed
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  QC Status:
                </span>
                {qcPassed ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      Passed
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <XCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">
                      Failed
                    </span>
                  </div>
                )}
              </div>
              <p className={`text-sm ${qcPassed
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
                }`}>
                {qcPassed
                  ? 'Kaset akan dikembalikan ke pengelola dalam keadaan OK.'
                  : 'Kaset akan di-mark sebagai SCRAPPED.'}
              </p>
            </div>
          </div>

          <DialogFooter className="px-0 gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowCompleteRepairDialog(false)}
              disabled={submitting}
              className="w-full sm:w-auto rounded-xl sm:rounded-lg"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmCompleteRepair}
              disabled={submitting}
              className={`w-full sm:w-auto rounded-xl sm:rounded-lg ${qcPassed
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Konfirmasi
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
const InfoBlock = ({ icon: Icon, iconColor, title, children, isDark = false }: any) => (
  <div className="space-y-2">
    <div className={`flex items-center gap-1.5 ${iconColor} mb-2`}>
      <Icon className="h-3.5 w-3.5" />
      <span className={`text-[10px] font-bold ${isDark ? 'text-slate-700 dark:text-slate-300' : ''}`}>{title}</span>
    </div>
    {children}
  </div>
);

const InfoItem = ({ label, value, mono = false, isDark = false }: any) => (
  <div>
    <p className={`text-[10px] ${isDark ? 'text-slate-600 dark:text-slate-500' : 'text-gray-500'}`}>{label}</p>
    <p className={`text-xs font-medium ${mono ? 'font-mono' : ''} ${isDark ? 'text-slate-800 dark:text-slate-200' : ''}`}>
      {value}
    </p>
  </div>
);

