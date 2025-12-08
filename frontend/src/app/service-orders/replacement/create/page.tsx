'use client';

import { useEffect, useState, useRef } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CheckCircle2, 
  AlertCircle, 
  Package, 
  FileText, 
  Truck, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function CreateReplacementPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCassettes, setSelectedCassettes] = useState<any[]>([]);
  const [scrappedCassettes, setScrappedCassettes] = useState<any[]>([]);
  const [loadingScrappedCassettes, setLoadingScrappedCassettes] = useState(false);
  const MAX_CASSETTES = 30;
  
  // Replacement form data
  const [replacementReason, setReplacementReason] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [courierService, setCourierService] = useState('');
  const [customCourierService, setCustomCourierService] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippedDate, setShippedDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [pengelolaInfo, setPengelolaInfo] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [useOfficeAddress, setUseOfficeAddress] = useState(false);
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderProvince, setSenderProvince] = useState('');
  const [senderPostalCode, setSenderPostalCode] = useState('');
  const [senderContactName, setSenderContactName] = useState('');
  const [senderContactPhone, setSenderContactPhone] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const steps = [
    { number: 1, title: 'Identifikasi Kaset', icon: Package },
    { number: 2, title: 'Alasan Pergantian', icon: FileText },
    { number: 3, title: 'Pengiriman', icon: Truck },
  ];

  const isPengelola = user?.userType === 'PENGELOLA';

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchPengelolaInfo = async () => {
      if (user?.userType === 'PENGELOLA' && user?.pengelolaId) {
        try {
          const response = await api.get(`/pengelola/${user.pengelolaId}`);
          if (response.data) {
            setPengelolaInfo(response.data);
            if (user.fullName) {
              setSenderContactName(user.fullName);
            }
            if (user.phone) {
              setSenderContactPhone(user.phone);
            }
            
            // Fetch banks assigned to this pengelola
            if (response.data.bankAssignments) {
              const assignedBanks = response.data.bankAssignments
                .filter((assignment: any) => assignment.status === 'ACTIVE' && assignment.customerBank)
                .map((assignment: any) => assignment.customerBank);
              
              setBanks(assignedBanks);
              
              // Auto-select bank if only one bank assigned
              if (assignedBanks.length === 1) {
                setSelectedBankId(assignedBanks[0].id);
              }
            }
          }
        } catch (err: any) {
          console.error('Error fetching pengelola info:', err);
        }
      }
    };

    if (isAuthenticated) {
      fetchPengelolaInfo();
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch SCRAPPED cassettes when bank is selected
  useEffect(() => {
    const fetchScrappedCassettes = async () => {
      if (!selectedBankId) {
        setScrappedCassettes([]);
        return;
      }

      try {
        setLoadingScrappedCassettes(true);
        const params: any = {
          status: 'SCRAPPED',
          customerBankId: selectedBankId,
          limit: 1000, // Get all scrapped cassettes
        };

        const response = await api.get('/cassettes', { params });
        
        let cassettesData: any[] = [];
        if (Array.isArray(response.data)) {
          cassettesData = response.data;
        } else if (response.data?.data) {
          cassettesData = response.data.data;
        }

        // Filter only SCRAPPED cassettes (double check)
        const scrapped = cassettesData.filter((c: any) => c.status === 'SCRAPPED');
        setScrappedCassettes(scrapped);
      } catch (err: any) {
        console.error('Error fetching scrapped cassettes:', err);
        setScrappedCassettes([]);
        toast({
          title: 'Error',
          description: 'Gagal memuat daftar kaset SCRAPPED',
          variant: 'destructive',
        });
      } finally {
        setLoadingScrappedCassettes(false);
      }
    };

    if (isAuthenticated && selectedBankId) {
      fetchScrappedCassettes();
    }
  }, [isAuthenticated, selectedBankId, toast]);


  // Handle cassette selection
  const handleToggleCassette = (cassette: any) => {
    const isSelected = selectedCassettes.some(c => c.id === cassette.id);
    
    if (isSelected) {
      setSelectedCassettes(selectedCassettes.filter(c => c.id !== cassette.id));
    } else {
      if (selectedCassettes.length >= MAX_CASSETTES) {
        setError(`Maksimal ${MAX_CASSETTES} kaset per tiket`);
        toast({
          title: 'Batas Maksimal',
          description: `Maksimal ${MAX_CASSETTES} kaset per tiket`,
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedCassettes([...selectedCassettes, cassette]);
    }
  };

  // Field validation
  const validateField = (name: string, value: string | boolean) => {
    const errors: Record<string, string> = {};
    
    if (name === 'replacementReason' && !value.toString().trim()) {
      errors.replacementReason = 'Alasan pergantian kaset wajib diisi';
    }
    
    if (name === 'senderAddress' && !useOfficeAddress && !value.toString().trim()) {
      errors.senderAddress = 'Alamat pengirim wajib diisi';
    }
    
    if (name === 'senderCity' && !useOfficeAddress && !value.toString().trim()) {
      errors.senderCity = 'Kota pengirim wajib diisi';
    }
    
    if (name === 'senderContactName' && !useOfficeAddress && !value.toString().trim()) {
      errors.senderContactName = 'Nama kontak pengirim wajib diisi';
    }
    
    if (name === 'senderContactPhone' && !useOfficeAddress && !value.toString().trim()) {
      errors.senderContactPhone = 'No. telepon kontak wajib diisi';
    }
    
    if (name === 'trackingNumber' && deliveryMethod === 'COURIER' && !value.toString().trim()) {
      errors.trackingNumber = 'Nomor resi wajib diisi';
    }
    
    if (name === 'courierService' && deliveryMethod === 'COURIER') {
      if (value.toString() === 'OTHER') {
        if (!customCourierService.trim()) {
          errors.courierService = 'Nama jasa kurir wajib diisi';
        }
      } else if (!value.toString() || value.toString() === '') {
        errors.courierService = 'Jasa kurir wajib dipilih';
      }
    }
    
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (errors[name]) {
        newErrors[name] = errors[name];
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
  };

  const handleFieldChange = (name: string, value: string, setter?: (value: string) => void) => {
    if (setter) {
      setter(value);
    }
    validateField(name, value);
  };

  // Validation helpers
  const hasSelectedCassettes = selectedCassettes.length > 0;
  const canProceedToStep2 = hasSelectedCassettes;
  const canProceedToStep3 = canProceedToStep2 && replacementReason.trim().length > 0;
  
  const hasDeliveryMethod = !!deliveryMethod;
  const finalCourierService = courierService === 'OTHER' ? customCourierService.trim() : (courierService || '');
  const hasCourierDetails = deliveryMethod === 'COURIER' 
    ? (finalCourierService.length > 0 && trackingNumber.trim().length > 0 && !!shippedDate)
    : true;
  
  const hasAddressInfo = useOfficeAddress || 
    (senderAddress.trim() && senderCity.trim() && senderContactName.trim() && senderContactPhone.trim());
  
  const canSubmit = canProceedToStep3 && hasDeliveryMethod && hasCourierDetails && hasAddressInfo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const errors: Record<string, string> = {};

    if (!replacementReason.trim()) {
      errors.replacementReason = 'Alasan pergantian kaset wajib diisi';
    }

    if (!deliveryMethod) {
      const errorMsg = 'Metode pengiriman wajib dipilih';
      setError(errorMsg);
      toast({
        title: 'Validasi Gagal',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    if (deliveryMethod === 'COURIER') {
      if (courierService === 'OTHER') {
        if (!customCourierService.trim()) {
          errors.courierService = 'Nama jasa kurir wajib diisi';
        }
      } else if (!courierService) {
        errors.courierService = 'Jasa kurir wajib dipilih';
      }
      if (!trackingNumber.trim()) {
        errors.trackingNumber = 'Nomor resi wajib diisi';
      }
      if (!shippedDate) {
        const errorMsg = 'Tanggal pengiriman wajib diisi';
        setError(errorMsg);
        toast({
          title: 'Validasi Gagal',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: 'Validasi Gagal',
        description: 'Harap lengkapi semua field yang wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setError('');
    setSubmitting(true);

    try {
      const cassetteIds = selectedCassettes.map(c => c.id);

      const cassettesData = cassetteIds.map(cassetteId => ({
        cassetteSerialNumber: selectedCassettes.find(c => c.id === cassetteId)?.serialNumber,
        title: 'Permintaan Pergantian Kaset',
        description: replacementReason.trim(),
        priority: 'HIGH',
        requestReplacement: true,
        replacementReason: replacementReason.trim(),
      }));

      const machineId = selectedCassettes[0]?.machine?.id;

      const response = await api.post('/tickets/multi-cassette', {
        cassettes: cassettesData,
        machineId: machineId || undefined,
        deliveryMethod,
        courierService: deliveryMethod === 'COURIER' ? (courierService === 'OTHER' ? customCourierService : courierService) : undefined,
        trackingNumber: deliveryMethod === 'COURIER' ? trackingNumber.trim() : undefined,
        shippedDate: deliveryMethod === 'COURIER' ? (shippedDate ? new Date(shippedDate).toISOString() : undefined) : undefined,
        estimatedArrival: deliveryMethod === 'COURIER' ? (estimatedArrival ? new Date(estimatedArrival).toISOString() : undefined) : undefined,
        useOfficeAddress,
        senderAddress: !useOfficeAddress ? senderAddress.trim() : undefined,
        senderCity: !useOfficeAddress ? senderCity.trim() : undefined,
        senderProvince: !useOfficeAddress ? senderProvince.trim() : undefined,
        senderPostalCode: !useOfficeAddress ? senderPostalCode.trim() : undefined,
        senderContactName: !useOfficeAddress ? senderContactName.trim() : undefined,
        senderContactPhone: !useOfficeAddress ? senderContactPhone.trim() : undefined,
        requestReplacement: true,
        replacementReason: replacementReason.trim(),
      });

      const ticketNumber = response.data.ticketNumber;
      
      let successMessage = `Tiket ${ticketNumber} berhasil dibuat untuk pergantian ${cassetteIds.length} kaset!`;
      
      if (deliveryMethod === 'COURIER') {
        successMessage += ' Kaset sedang dalam perjalanan ke Repair Center.';
      }
      
      toast({
        title: 'Berhasil!',
        description: successMessage,
        variant: 'default',
      });
      
      setTimeout(() => {
        router.push('/tickets');
      }, 2000);
    } catch (err: any) {
      let errorMessage = 'Gagal membuat tiket. Silakan coba lagi.';
      
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast({
        title: 'Gagal Membuat Tiket',
        description: errorMessage,
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

  if (!isAuthenticated) {
    return null;
  }

  if (user?.userType !== 'PENGELOLA') {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <div>
                  <CardTitle>Akses Ditolak</CardTitle>
                  <CardDescription>
                    Hanya user pengelola yang dapat membuat permintaan pergantian kaset
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 overflow-x-hidden">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/service-orders/create')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pilihan Service Order
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border-2 border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200 dark:bg-slate-700 -z-10">
              <div 
                className="h-full bg-teal-600 dark:bg-teal-500 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center flex-1 relative z-10">
                  <button
                    onClick={() => {
                      if (step.number === 1 || (step.number === 2 && canProceedToStep2) || (step.number === 3 && canProceedToStep3)) {
                        setCurrentStep(step.number);
                      }
                    }}
                    disabled={step.number === 2 && !canProceedToStep2 || step.number === 3 && !canProceedToStep3}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all
                      ${isCompleted ? 'bg-teal-600 dark:bg-teal-500 text-white' : 
                        isCurrent ? 'bg-teal-600 dark:bg-teal-500 text-white ring-4 ring-teal-600/20 dark:ring-teal-500/20' : 
                        'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'} 
                      ${step.number === 2 && !canProceedToStep2 || step.number === 3 && !canProceedToStep3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <StepIcon className="h-6 w-6" />
                    )}
                  </button>
                  <p className={`text-xs mt-2 font-medium text-center ${isCurrent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Identifikasi Kaset */}
          {currentStep === 1 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Pilih Kaset SCRAPPED</CardTitle>
                    <CardDescription>Pilih kaset yang tidak layak pakai untuk diganti</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bank Filter for PENGELOLA users with multiple banks */}
                {isPengelola && banks.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="bank" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Pilih Bank <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId} required>
                      <SelectTrigger id="bank" className="h-12 text-base border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100">
                        <SelectValue placeholder="Pilih bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bankName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedBankId && (
                      <p className="text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Wajib pilih bank untuk melihat daftar kaset SCRAPPED
                      </p>
                    )}
                  </div>
                )}
                
                {/* Show selected bank info if only one bank */}
                {isPengelola && banks.length === 1 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Bank: {banks[0].bankName}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Menampilkan semua kaset SCRAPPED dari bank ini
                    </p>
                  </div>
                )}

                {/* Info Box */}
                <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    <strong>Info:</strong> Hanya menampilkan kaset dengan status <span className="font-mono font-semibold">SCRAPPED</span> yang dimiliki oleh pengelola Anda.
                  </p>
                </div>

                {/* Loading State */}
                {loadingScrappedCassettes && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-gray-600 dark:text-slate-400">Memuat daftar kaset SCRAPPED...</p>
                  </div>
                )}

                {/* Cassette List */}
                {!loadingScrappedCassettes && selectedBankId && (
                  <>
                    {scrappedCassettes.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            Daftar Kaset SCRAPPED
                          </p>
                          <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 px-2 py-1 rounded font-medium">
                            {selectedCassettes.length}/{MAX_CASSETTES} dipilih • {scrappedCassettes.length} total
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
                          {scrappedCassettes.map((cassette: any) => {
                            const isSelected = selectedCassettes.some(c => c.id === cassette.id);
                            const isDisabled = !isSelected && selectedCassettes.length >= MAX_CASSETTES;
                            
                            return (
                              <div
                                key={cassette.id}
                                onClick={() => !isDisabled && handleToggleCassette(cassette)}
                                className={`p-4 bg-white dark:bg-slate-800 border-2 rounded-lg transition-all ${
                                  isDisabled 
                                    ? 'border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed' 
                                    : isSelected 
                                      ? 'border-teal-400 dark:border-teal-600 bg-teal-50/70 dark:bg-teal-900/10 shadow-md cursor-pointer' 
                                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center pt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isDisabled}
                                      onChange={() => !isDisabled && handleToggleCassette(cassette)}
                                      className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="mb-2">
                                      <p className="text-xs text-gray-600 dark:text-slate-400 font-medium mb-0.5">Serial Number:</p>
                                      <p className="font-mono font-semibold text-base text-gray-900 dark:text-slate-100">
                                        {cassette.serialNumber}
                                      </p>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                          {cassette.cassetteType?.typeCode || 'N/A'}
                                        </span>
                                        {cassette.machine?.machineType && (
                                          <span className="font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                            {cassette.machine.machineType}
                                          </span>
                                        )}
                                      </div>
                                      {cassette.machine && (
                                        <p className="text-gray-600 dark:text-slate-400 truncate">
                                          <span className="font-medium">Mesin:</span> {cassette.machine.serialNumberManufacturer || 'N/A'}
                                        </p>
                                      )}
                                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                                        {cassette.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
                        <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                          Tidak ada kaset SCRAPPED
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Tidak ada kaset dengan status SCRAPPED untuk bank yang dipilih
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Selected Cassettes Summary */}
                {selectedCassettes.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">Kaset Terpilih</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCassettes.length} kaset akan diganti
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCassettes([])}
                      >
                        Reset Semua
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedToStep2}
                    className="min-w-[200px] bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Lanjut ke Alasan Pergantian
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Alasan Pergantian */}
          {currentStep === 2 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Alasan Pergantian Kaset</CardTitle>
                    <CardDescription>Jelaskan mengapa kaset tidak layak pakai dan perlu diganti</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Cassettes Summary */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Kaset yang Akan Diganti:</h4>
                  <div className="space-y-1">
                    {selectedCassettes.map(c => (
                      <p key={c.id} className="text-sm font-mono text-gray-900 dark:text-slate-200">• {c.serialNumber}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="replacementReason" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Alasan Kaset Tidak Layak Pakai <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                  </Label>
                  <Textarea
                    id="replacementReason"
                    value={replacementReason}
                    onChange={(e) => {
                      setReplacementReason(e.target.value);
                      handleFieldChange('replacementReason', e.target.value);
                    }}
                    onBlur={() => validateField('replacementReason', replacementReason)}
                    placeholder="Jelaskan alasan mengapa kaset tidak layak pakai dan perlu diganti. Contoh: Kaset rusak fisik parah, komponen utama tidak dapat diperbaiki, usia kaset sudah terlalu tua, dll."
                    rows={6}
                    className={`border-2 ${
                      fieldErrors.replacementReason 
                        ? 'border-red-500 dark:border-red-400' 
                        : 'border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500'
                    } text-gray-900 dark:text-slate-100`}
                    aria-invalid={fieldErrors.replacementReason ? 'true' : 'false'}
                  />
                  {fieldErrors.replacementReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.replacementReason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    💡 Berikan penjelasan yang jelas dan detail untuk memudahkan proses pergantian kaset.
                  </p>
                </div>

                <div className="pt-4 flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(1)}
                    className="min-w-[150px]"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedToStep3}
                    className="min-w-[200px] bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Lanjut ke Pengiriman
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Informasi Pengiriman */}
          {currentStep === 3 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Informasi Pengiriman</CardTitle>
                    <CardDescription>
                      Lengkapi informasi pengiriman kaset ke Repair Center
                    </CardDescription>
                  </div>
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-3 py-1 rounded-full font-semibold">
                    WAJIB
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Metode Pengiriman <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                  </Label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod} required>
                    <SelectTrigger id="deliveryMethod" className="h-12 text-base border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100">
                      <SelectValue placeholder="Pilih metode pengiriman" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELF_DELIVERY">🚗 Antar Mandiri</SelectItem>
                      <SelectItem value="COURIER">📦 Melalui Kurir</SelectItem>
                    </SelectContent>
                  </Select>
                  {!deliveryMethod && (
                    <p className="text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Wajib pilih metode pengiriman untuk melanjutkan
                    </p>
                  )}
                </div>

                {deliveryMethod === 'COURIER' && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      Detail Pengiriman Kurir
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="courierService" className="font-semibold text-gray-900 dark:text-slate-100">Jasa Kurir <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                        <Select 
                          value={courierService} 
                          onValueChange={(value) => {
                            setCourierService(value);
                            if (value !== 'OTHER') {
                              setCustomCourierService('');
                            }
                            if (value && value !== 'OTHER') {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.courierService;
                                return newErrors;
                              });
                            }
                            validateField('courierService', value);
                          }}
                        >
                          <SelectTrigger id="courierService" className={`h-12 border-2 ${
                            fieldErrors.courierService 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-slate-600'
                          } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}>
                            <SelectValue placeholder="Pilih jasa kurir" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JNE">JNE</SelectItem>
                            <SelectItem value="TIKI">TIKI</SelectItem>
                            <SelectItem value="POS_INDONESIA">Pos Indonesia</SelectItem>
                            <SelectItem value="JNT">JNT</SelectItem>
                            <SelectItem value="SICEPAT">SiCepat</SelectItem>
                            <SelectItem value="ANTERAJA">AnterAja</SelectItem>
                            <SelectItem value="OTHER">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldErrors.courierService && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {fieldErrors.courierService}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trackingNumber" className="font-semibold text-gray-900 dark:text-slate-100">Nomor Resi / AWB <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                        <Input
                          id="trackingNumber"
                          placeholder="JNE123456789"
                          value={trackingNumber}
                          onChange={(e) => handleFieldChange('trackingNumber', e.target.value, setTrackingNumber)}
                          onBlur={(e) => validateField('trackingNumber', e.target.value)}
                          required={deliveryMethod === 'COURIER'}
                          className={`h-12 font-mono border-2 ${
                            fieldErrors.trackingNumber 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-slate-600'
                          } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                          aria-invalid={fieldErrors.trackingNumber ? 'true' : 'false'}
                        />
                        {fieldErrors.trackingNumber && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {fieldErrors.trackingNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {courierService === 'OTHER' && (
                      <div className="space-y-2">
                        <Label htmlFor="customCourierService" className="font-semibold text-gray-900 dark:text-slate-100">Nama Jasa Kurir <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                        <Input
                          id="customCourierService"
                          placeholder="Masukkan nama jasa kurir"
                          value={customCourierService}
                          onChange={(e) => {
                            setCustomCourierService(e.target.value);
                            if (fieldErrors.courierService && e.target.value.trim()) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.courierService;
                                return newErrors;
                              });
                            }
                            validateField('customCourierService', e.target.value);
                          }}
                          onBlur={(e) => validateField('customCourierService', e.target.value)}
                          className={`h-12 border-2 ${
                            fieldErrors.courierService 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-slate-600'
                          } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                          aria-invalid={fieldErrors.courierService ? 'true' : 'false'}
                        />
                        {fieldErrors.courierService && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {fieldErrors.courierService}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shippedDate" className="font-semibold text-gray-900 dark:text-slate-100">Tanggal Pengiriman <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                        <Input
                          id="shippedDate"
                          type="date"
                          value={shippedDate}
                          onChange={(e) => setShippedDate(e.target.value)}
                          required={deliveryMethod === 'COURIER'}
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimatedArrival" className="font-semibold text-gray-900 dark:text-slate-100">Estimasi Tiba (Opsional)</Label>
                        <Input
                          id="estimatedArrival"
                          type="date"
                          value={estimatedArrival}
                          onChange={(e) => setEstimatedArrival(e.target.value)}
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Information */}
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Alamat Pengirim</h3>
                    {isPengelola && pengelolaInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useOfficeAddress"
                          checked={useOfficeAddress}
                          onChange={(e) => {
                            setUseOfficeAddress(e.target.checked);
                            if (e.target.checked) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.senderAddress;
                                delete newErrors.senderCity;
                                delete newErrors.senderContactName;
                                delete newErrors.senderContactPhone;
                                return newErrors;
                              });
                            }
                          }}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded border-gray-300 dark:border-slate-600"
                        />
                        <Label htmlFor="useOfficeAddress" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                          Gunakan alamat kantor
                        </Label>
                      </div>
                    )}
                  </div>

                  {!useOfficeAddress && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="senderAddress" className="font-semibold text-gray-900 dark:text-slate-100">Alamat Lengkap <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                        <Textarea
                          id="senderAddress"
                          value={senderAddress}
                          onChange={(e) => handleFieldChange('senderAddress', e.target.value, setSenderAddress)}
                          onBlur={(e) => validateField('senderAddress', e.target.value)}
                          placeholder="Jl. Sudirman No. 123"
                          rows={3}
                          className={`border-2 ${
                            fieldErrors.senderAddress 
                              ? 'border-red-500 dark:border-red-400' 
                              : 'border-gray-300 dark:border-slate-600'
                          } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                          aria-invalid={fieldErrors.senderAddress ? 'true' : 'false'}
                        />
                        {fieldErrors.senderAddress && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {fieldErrors.senderAddress}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="senderCity" className="font-semibold text-gray-900 dark:text-slate-100">Kota <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                          <Input
                            id="senderCity"
                            value={senderCity}
                            onChange={(e) => handleFieldChange('senderCity', e.target.value, setSenderCity)}
                            onBlur={(e) => validateField('senderCity', e.target.value)}
                            placeholder="Jakarta"
                            className={`h-12 border-2 ${
                              fieldErrors.senderCity 
                                ? 'border-red-500 dark:border-red-400' 
                                : 'border-gray-300 dark:border-slate-600'
                            } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                            aria-invalid={fieldErrors.senderCity ? 'true' : 'false'}
                          />
                          {fieldErrors.senderCity && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {fieldErrors.senderCity}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="senderProvince" className="font-semibold text-gray-900 dark:text-slate-100">Provinsi</Label>
                          <Input
                            id="senderProvince"
                            value={senderProvince}
                            onChange={(e) => setSenderProvince(e.target.value)}
                            placeholder="DKI Jakarta"
                            className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="senderPostalCode" className="font-semibold text-gray-900 dark:text-slate-100">Kode Pos</Label>
                        <Input
                          id="senderPostalCode"
                          value={senderPostalCode}
                          onChange={(e) => setSenderPostalCode(e.target.value)}
                          placeholder="10220"
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="senderContactName" className="font-semibold text-gray-900 dark:text-slate-100">Nama Kontak <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                          <Input
                            id="senderContactName"
                            value={senderContactName}
                            onChange={(e) => handleFieldChange('senderContactName', e.target.value, setSenderContactName)}
                            onBlur={(e) => validateField('senderContactName', e.target.value)}
                            placeholder="John Doe"
                            className={`h-12 border-2 ${
                              fieldErrors.senderContactName 
                                ? 'border-red-500 dark:border-red-400' 
                                : 'border-gray-300 dark:border-slate-600'
                            } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                            aria-invalid={fieldErrors.senderContactName ? 'true' : 'false'}
                          />
                          {fieldErrors.senderContactName && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {fieldErrors.senderContactName}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="senderContactPhone" className="font-semibold text-gray-900 dark:text-slate-100">No. Telepon <span className="text-red-600 dark:text-red-400 font-bold">*</span></Label>
                          <Input
                            id="senderContactPhone"
                            value={senderContactPhone}
                            onChange={(e) => handleFieldChange('senderContactPhone', e.target.value, setSenderContactPhone)}
                            onBlur={(e) => validateField('senderContactPhone', e.target.value)}
                            placeholder="081234567890"
                            className={`h-12 border-2 ${
                              fieldErrors.senderContactPhone 
                                ? 'border-red-500 dark:border-red-400' 
                                : 'border-gray-300 dark:border-slate-600'
                            } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                            aria-invalid={fieldErrors.senderContactPhone ? 'true' : 'false'}
                          />
                          {fieldErrors.senderContactPhone && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {fieldErrors.senderContactPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {useOfficeAddress && pengelolaInfo && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Alamat Kantor:</p>
                      <p className="text-sm text-green-800 dark:text-green-200">{pengelolaInfo.address}</p>
                      <p className="text-sm text-green-800 dark:text-green-200">{pengelolaInfo.city}, {pengelolaInfo.province}</p>
                      <p className="text-sm text-green-800 dark:text-green-200">Kontak: {pengelolaInfo.primaryContactName} - {pengelolaInfo.primaryContactPhone}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    className="min-w-[150px]"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit || submitting}
                    className="min-w-[200px] bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Buat Request Replacement
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
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Konfirmasi Permintaan Pergantian Kaset</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                Apakah Anda yakin ingin membuat permintaan pergantian untuk {selectedCassettes.length} kaset? 
                Kaset akan ditandai sebagai tidak layak pakai (SCRAPPED) setelah tiket selesai.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSubmit}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Ya, Buat Request
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </PageLayout>
  );
}

