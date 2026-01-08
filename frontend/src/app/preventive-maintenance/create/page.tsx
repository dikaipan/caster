'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CalendarCheck,
  Package,
  MapPin,
  Loader2,
  CheckCircle2,
  X,
  Search,
  AlertCircle,
  Check,
  ArrowRight,
  FileText,
  Cpu,
  Database,
} from 'lucide-react';

export default function CreatePMPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search states matching Create Ticket
  const [searchMode, setSearchMode] = useState<'cassette' | 'machine'>('cassette');
  const [cassetteSerialNumber, setCassetteSerialNumber] = useState('');
  const [machineSN, setMachineSN] = useState('');
  const [cassetteInfo, setCassetteInfo] = useState<any>(null);
  const [machineSearchResults, setMachineSearchResults] = useState<any>(null);
  const [searchingMachine, setSearchingMachine] = useState(false);
  const [selectedCassettes, setSelectedCassettes] = useState<any[]>([]);
  const [cassettesAvailability, setCassettesAvailability] = useState<Record<string, any>>({});
  const MAX_CASSETTES = 30;

  // PM Form Data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ROUTINE');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [assignedEngineer, setAssignedEngineer] = useState('');
  const [nextPmInterval, setNextPmInterval] = useState(90);
  const [notes, setNotes] = useState('');
  
  // Location & Contact
  const [location, setLocation] = useState('PENGELOLA_LOCATION');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationProvince, setLocationProvince] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [useOfficeAddress, setUseOfficeAddress] = useState(false);
  const [pengelolaInfo, setPengelolaInfo] = useState<any>(null);
  
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isPengelola = user?.userType === 'PENGELOLA';
  const isHitachi = user?.userType === 'HITACHI';

  const steps = [
    { number: 1, title: 'Pilih Kaset', icon: Package },
    { number: 2, title: 'Detail PM', icon: FileText },
    { number: 3, title: 'Lokasi & Kontak', icon: MapPin },
  ];

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch engineers for Hitachi
        if (isHitachi) {
          const engResponse = await api.get('/users/engineers');
          setEngineers(engResponse.data);
        }

        // Fetch pengelola info for PENGELOLA user
        if (isPengelola && user?.pengelolaId) {
          const pengelolaResponse = await api.get(`/pengelola/${user.pengelolaId}`);
          if (pengelolaResponse.data) {
            setPengelolaInfo(pengelolaResponse.data);
            // Auto-fill contact name and phone from user profile
            if (user.fullName) {
              setContactName(user.fullName);
            }
            if (user.phone) {
              setContactPhone(user.phone);
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        if (err.code !== 'ERR_NETWORK' && err.code !== 'ERR_CONNECTION_REFUSED') {
          setError(err.response?.data?.message || 'Gagal memuat data');
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isHitachi, isPengelola, user]);

  // Note: Type selection is handled by user directly via Select component
  // Backend will correctly handle the type based on user role and selected value

  // Auto-fill address from pengelola info when useOfficeAddress is checked
  useEffect(() => {
    if (useOfficeAddress && pengelolaInfo) {
      setLocationAddress(pengelolaInfo.address || '');
      setLocationCity(pengelolaInfo.city || '');
      setLocationProvince(pengelolaInfo.province || '');
      setLocationPostalCode(pengelolaInfo.postalCode || '');
    } else if (!useOfficeAddress && isPengelola) {
      // Clear address fields when unchecked
      setLocationAddress('');
      setLocationCity('');
      setLocationProvince('');
      setLocationPostalCode('');
    }
  }, [useOfficeAddress, pengelolaInfo, isPengelola]);

  // Auto-search cassette by SN
  useEffect(() => {
    if (!isAuthenticated || searchMode !== 'cassette') return;

    const searchBySN = async () => {
      if (!cassetteSerialNumber.trim()) {
        setCassetteInfo(null);
        return;
      }

      try {
        const response = await api.get('/cassettes/search', {
          params: { serialNumber: cassetteSerialNumber.trim() },
        });

        if (response.data) {
          setCassetteInfo(response.data);
          setError('');
        }
      } catch (err: any) {
        setCassetteInfo(null);
        if (err.response?.status === 404) {
          setError(`Kaset dengan SN "${cassetteSerialNumber}" tidak ditemukan.`);
        } else {
          setError(err.response?.data?.message || 'Gagal mencari kaset. Silakan coba lagi.');
        }
      }
    };

    const timeoutId = setTimeout(() => {
      searchBySN();
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [cassetteSerialNumber, searchMode, isAuthenticated]);

  // Auto-search machine by SN
  useEffect(() => {
    if (!isAuthenticated || searchMode !== 'machine') return;

    const searchByMachineSN = async () => {
      if (!machineSN.trim()) {
        setMachineSearchResults(null);
        return;
      }

      setSearchingMachine(true);
      setError('');

      try {
        const response = await api.get('/cassettes/search-by-machine-sn', {
          params: { machineSN: machineSN.trim() },
        });

        if (response.data) {
          setMachineSearchResults(response.data);
          if (response.data.cassettes && response.data.cassettes.length === 0) {
            setError(`Tidak ada kaset di mesin dengan SN "${machineSN}"`);
          } else {
            setError('');
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Gagal mencari kaset. Silakan coba lagi.');
        setMachineSearchResults(null);
      } finally {
        setSearchingMachine(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchByMachineSN();
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [machineSN, searchMode, isAuthenticated]);

  // Load availability info for all cassettes when machine search results change
  useEffect(() => {
    if (!machineSearchResults?.cassettes || machineSearchResults.cassettes.length === 0) {
      setCassettesAvailability({});
      return;
    }

    const loadAvailabilityInfo = async () => {
      try {
        // Use batch endpoint to check all cassettes at once
        const cassetteIds = machineSearchResults.cassettes.map((c: any) => c.id);
        const response = await api.post('/cassettes/check-availability-batch', {
          cassetteIds,
        });

        // Response is a map: { [cassetteId]: availabilityData }
        setCassettesAvailability(response.data);
      } catch (err) {
        console.error('[Availability] Error loading batch availability:', err);
        // Fallback: set all as available if batch check fails
        const fallbackMap: Record<string, any> = {};
        machineSearchResults.cassettes.forEach((cassette: any) => {
          fallbackMap[cassette.id] = { available: true };
        });
        setCassettesAvailability(fallbackMap);
      }
    };

    loadAvailabilityInfo();
  }, [machineSearchResults]);

  const handleToggleCassette = async (cassette: any) => {
    const isSelected = selectedCassettes.some(c => c.id === cassette.id);
    
    if (isSelected) {
      // Unselect cassette
      setError('');
      setSelectedCassettes(prev => prev.filter(c => c.id !== cassette.id));
      return;
    }
    
    // Check max limit
    if (selectedCassettes.length >= MAX_CASSETTES) {
      setError(`Maksimal ${MAX_CASSETTES} kaset per PM task`);
      return;
    }
    
    // Add cassette to selection (no warning popup)
    setSelectedCassettes(prev => [...prev, cassette]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (selectedCassettes.length === 0 && !cassetteInfo) {
      setError('Pilih minimal 1 kaset');
      return;
    }

    if (!title.trim()) {
      setError('Judul PM wajib diisi');
      return;
    }

    if (!description.trim()) {
      setError('Deskripsi PM wajib diisi');
      return;
    }

    if (!scheduledDate.trim()) {
      setError('Tanggal terjadwal wajib diisi');
      return;
    }

    if (!contactName.trim()) {
      setError('Nama kontak wajib diisi');
      return;
    }

    if (!contactPhone.trim()) {
      setError('No. telepon kontak wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const cassetteIds = cassetteInfo 
        ? [cassetteInfo.id] 
        : selectedCassettes.map(c => c.id);

      const payload = {
        cassetteIds,
        type,
        title: title.trim(),
        description: description.trim(),
        scheduledDate,
        scheduledTime: scheduledTime || undefined,
        location,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        locationAddress: locationAddress || undefined,
        locationCity: locationCity || undefined,
        locationProvince: locationProvince || undefined,
        locationPostalCode: locationPostalCode || undefined,
        assignedEngineer: assignedEngineer || undefined,
        nextPmInterval,
        notes: notes || undefined,
      };

      await api.post('/preventive-maintenance', payload);
      setSuccess('PM Task berhasil dibuat!');
      
      setTimeout(() => {
        router.push('/preventive-maintenance');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating PM:', err);
      setError(err.response?.data?.message || 'Gagal membuat PM task');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    // PM feature is disabled - redirect all users
    if (!isLoading && isAuthenticated) {
      router.push('/service-orders/create');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!isPengelola && !isHitachi) {
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
                    Hanya Pengelola dan Hitachi yang dapat membuat PM Task
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Anda saat ini login sebagai <strong>{user?.userType}</strong>. 
                PM Task hanya dapat dibuat oleh Pengelola atau Hitachi.
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Kembali ke Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Validation helpers
  const hasSelectedCassettes = (cassetteInfo !== null) || selectedCassettes.length > 0;
  const canProceedToStep2 = hasSelectedCassettes;
  const canProceedToStep3 = canProceedToStep2 && title.trim() && description.trim() && scheduledDate.trim();
  const canSubmit = canProceedToStep3 && contactName.trim() && contactPhone.trim();

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
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

        {/* Progress Steps - EXACT SAME as Create Ticket */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute left-0 right-0 top-5 h-1 bg-gray-200 dark:bg-slate-700 -z-10">
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
                <div key={step.number} className="flex flex-col items-center flex-1">
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
                      ${(step.number === 2 && canProceedToStep2) || (step.number === 3 && canProceedToStep3) || step.number === 1 ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'}
                    `}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                  </button>
                  <span className={`text-sm mt-2 font-medium ${isCurrent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Pilih Kaset - EXACT SAME as Create Ticket Step 1 */}
          {currentStep === 1 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Pilih Kaset</CardTitle>
                    <CardDescription>Cari kaset berdasarkan Serial Number kaset atau mesin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={searchMode} onValueChange={(v) => {
                  setSearchMode(v as 'cassette' | 'machine');
                  setError('');
                  setCassetteInfo(null);
                  setMachineSearchResults(null);
                }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cassette" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Cari by SN Kaset
                    </TabsTrigger>
                    <TabsTrigger value="machine" className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Cari by SN Mesin
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab: Search by Cassette SN */}
                  <TabsContent value="cassette" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cassetteSerialNumber" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Serial Number Kaset <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                      </Label>
                      <Input
                        id="cassetteSerialNumber"
                        placeholder="Contoh: RB-BNI-0001"
                        value={cassetteSerialNumber}
                        onChange={(e) => setCassetteSerialNumber(e.target.value)}
                        className="font-mono text-lg h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Cassette Info Display */}
                    {cassetteInfo && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <h4 className="font-semibold text-green-900 dark:text-green-100">Kaset Ditemukan</h4>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700 dark:text-slate-300">
                                <span className="font-medium">Serial Number:</span> {cassetteInfo.serialNumber}
                              </p>
                              <p className="text-gray-700 dark:text-slate-300">
                                <span className="font-medium">Bank:</span> {cassetteInfo.bankName || '-'}
                              </p>
                              <p className="text-gray-700 dark:text-slate-300">
                                <span className="font-medium">Status:</span> {cassetteInfo.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && searchMode === 'cassette' && !cassetteInfo && cassetteSerialNumber.trim() && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Search by Machine SN */}
                  <TabsContent value="machine" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="machineSN" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Serial Number Mesin (6 digit terakhir)
                      </Label>
                      <div className="relative">
                        <Input
                          id="machineSN"
                          placeholder="Contoh: 071110"
                          value={machineSN}
                          onChange={(e) => setMachineSN(e.target.value)}
                          className="font-mono text-lg h-12 pr-10 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                        />
                        {searchingMachine && (
                          <Loader2 className="absolute right-3 top-3 h-6 w-6 animate-spin text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Machine Search Results */}
                    {machineSearchResults && (
                      <div className="space-y-4">
                        {/* Machine Info Box */}
                        {machineSearchResults.machines && machineSearchResults.machines.length > 0 && (
                          <div className="p-4 bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                <p className="font-semibold text-gray-900 dark:text-slate-100">
                                  Mesin Ditemukan
                                </p>
                              </div>
                              <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-2 py-1 rounded font-medium">
                                {machineSearchResults.cassettes?.length || 0} kaset tersedia
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {machineSearchResults.machines.map((machine: any) => (
                                <div key={machine.id} className="p-3 bg-white dark:bg-slate-900/50 rounded border border-gray-300 dark:border-slate-600 text-sm">
                                  <p className="font-mono font-semibold text-gray-900 dark:text-slate-100">{machine.serialNumber}</p>
                                  <p className="text-gray-700 dark:text-slate-300">{machine.bank?.bankName} - {machine.location}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cassette List */}
                        {machineSearchResults.cassettes && machineSearchResults.cassettes.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900 dark:text-slate-100">
                                Pilih Kaset dari Mesin Ini
                              </h4>
                              <Badge variant="secondary">
                                {selectedCassettes.length}/{MAX_CASSETTES} dipilih
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {machineSearchResults.cassettes.map((cassette: any) => {
                            const isSelected = selectedCassettes.some(c => c.id === cassette.id);
                            const availabilityInfo = cassettesAvailability[cassette.id];
                            
                            // Check if cassette is in any active process
                            const hasActiveTicket = availabilityInfo?.activeTicket;
                            const hasActivePM = availabilityInfo?.activePM;
                            const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP'].includes(cassette.status);
                            
                            // Show "Dalam Proses" badge if any of these is true
                            const isInProcess = hasActiveTicket || hasActivePM || statusInRepair;
                            
                            return (
                              <button
                                key={cassette.id}
                                type="button"
                                onClick={() => handleToggleCassette(cassette)}
                                className={`p-3 border-2 rounded-lg text-left transition-all ${
                                  isSelected
                                    ? 'border-teal-400 bg-teal-50/70 dark:bg-teal-900/10'
                                    : isInProcess
                                    ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10'
                                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-slate-500'
                                  }`}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono font-semibold text-gray-900 dark:text-slate-100 truncate">{cassette.serialNumber}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                        {cassette.cassetteType?.typeCode || 'N/A'}
                                      </span>
                                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                        {cassette.machine?.machineType || 'N/A'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate mt-0.5">
                                      {cassette.bankName} • {cassette.status}
                                    </p>
                                    {isInProcess && (
                                      <div className="mt-1 space-y-1">
                                        {hasActiveTicket && (
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                            <FileText className="h-3 w-3" />
                                            <span>Proses RP</span>
                                          </div>
                                        )}
                                        {hasActivePM && (
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                            <CalendarCheck className="h-3 w-3" />
                                            <span>Proses PM</span>
                                          </div>
                                        )}
                                        {statusInRepair && !hasActiveTicket && !hasActivePM && (
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>Status: Sedang diperbaiki</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                                Tidak ada kaset ditemukan untuk mesin ini
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {error && searchMode === 'machine' && !machineSearchResults && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Error Messages */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                  <Button
                    type="button"
                    onClick={() => {
                      if (canProceedToStep2) {
                        setCurrentStep(2);
                        setError('');
                      } else {
                        setError('Pilih minimal 1 kaset untuk melanjutkan');
                      }
                    }}
                    disabled={!canProceedToStep2}
                    className="px-6 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Lanjut
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Detail PM - MATCHING Create Ticket Style */}
          {currentStep === 2 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Detail PM</CardTitle>
                    <CardDescription>Informasi detail preventive maintenance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Cassettes Summary */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Kaset Dipilih:</h4>
                  <div className="space-y-1">
                    {cassetteInfo ? (
                      <p className="text-sm font-mono text-gray-900 dark:text-slate-200">• {cassetteInfo.serialNumber}</p>
                    ) : (
                      selectedCassettes.map(c => (
                        <p key={c.id} className="text-sm font-mono text-gray-900 dark:text-slate-200">• {c.serialNumber}</p>
                      ))
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Judul PM <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Preventive Maintenance Rutin Q1 2024"
                      className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Deskripsi <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan tujuan dan scope PM..."
                      rows={4}
                      className="border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                {/* Type & Schedule */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Tipe PM <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="type" className="h-12 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isHitachi ? (
                          <>
                            <SelectItem value="ROUTINE">Rutin (Terjadwal Otomatis)</SelectItem>
                            <SelectItem value="ON_DEMAND_HITACHI">On Demand - Hitachi</SelectItem>
                            <SelectItem value="EMERGENCY">Darurat</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="ROUTINE">Rutin (Terjadwal Otomatis)</SelectItem>
                            <SelectItem value="ON_DEMAND_PENGELOLA">On Demand - Permintaan Pengelola</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {type === 'ROUTINE' && 'PM rutin akan terjadwal otomatis berdasarkan interval'}
                      {type === 'ON_DEMAND_HITACHI' && 'PM permintaan manual dari Hitachi'}
                      {type === 'ON_DEMAND_PENGELOLA' && 'PM permintaan manual dari Pengelola'}
                      {type === 'EMERGENCY' && 'PM darurat dengan prioritas tinggi'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="scheduledDate" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Tanggal PM <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                {/* Interval PM (only for ROUTINE) */}
                {type === 'ROUTINE' && (
                  <div>
                    <Label htmlFor="nextPmInterval" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      Interval PM Berikutnya (hari) <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="nextPmInterval"
                        type="number"
                        min="1"
                        max="365"
                        value={nextPmInterval}
                        onChange={(e) => setNextPmInterval(parseInt(e.target.value) || 90)}
                        className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                        placeholder="90"
                        required
                      />
                      <div className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                        hari
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Interval dalam hari untuk PM berikutnya (default: 90 hari / 3 bulan)
                    </p>
                  </div>
                )}

                {/* Assigned Engineer (Hitachi only) */}
                {isHitachi && (
                  <div>
                    <Label htmlFor="assignedEngineer" className="text-base font-semibold text-gray-900 dark:text-slate-100">Assign Engineer</Label>
                    <Select value={assignedEngineer} onValueChange={setAssignedEngineer}>
                      <SelectTrigger id="assignedEngineer" className="h-12 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100">
                        <SelectValue placeholder="Pilih engineer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {engineers.map(eng => (
                          <SelectItem key={eng.id} value={eng.id}>
                            {eng.name} - {eng.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-base font-semibold text-gray-900 dark:text-slate-100">Catatan Tambahan</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan atau instruksi khusus..."
                    rows={3}
                    className="border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                  />
                </div>

                {/* Error Messages */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      if (canProceedToStep3) {
                        setCurrentStep(3);
                        setError('');
                      } else {
                        setError('Lengkapi Title dan Description untuk melanjutkan');
                      }
                    }}
                    disabled={!canProceedToStep3}
                    className="px-6 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Lanjut
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Lokasi & Kontak - MATCHING Create Ticket Style */}
          {currentStep === 3 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Lokasi & Kontak</CardTitle>
                    <CardDescription>Informasi lokasi dan kontak untuk pelaksanaan PM</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Informasi Kontak</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Nama Kontak <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nama PIC di lokasi"
                        className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactPhone" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        No. Telepon <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                      </Label>
                      <Input
                        id="contactPhone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="08xx-xxxx-xxxx"
                        className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address Info */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Alamat Lokasi</h3>
                    {isPengelola && pengelolaInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useOfficeAddress"
                          checked={useOfficeAddress}
                          onChange={(e) => setUseOfficeAddress(e.target.checked)}
                          className="h-4 w-4 text-primary rounded border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary"
                        />
                        <Label htmlFor="useOfficeAddress" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                          Gunakan alamat kantor
                        </Label>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="locationAddress" className="text-base font-semibold text-gray-900 dark:text-slate-100">Alamat Lengkap</Label>
                      <Textarea
                        id="locationAddress"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Alamat lengkap lokasi PM"
                        rows={3}
                        className="border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                        disabled={useOfficeAddress}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="locationCity" className="text-base font-semibold text-gray-900 dark:text-slate-100">Kota</Label>
                        <Input
                          id="locationCity"
                          value={locationCity}
                          onChange={(e) => setLocationCity(e.target.value)}
                          placeholder="Jakarta"
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                          disabled={useOfficeAddress}
                        />
                      </div>

                      <div>
                        <Label htmlFor="locationProvince" className="text-base font-semibold text-gray-900 dark:text-slate-100">Provinsi</Label>
                        <Input
                          id="locationProvince"
                          value={locationProvince}
                          onChange={(e) => setLocationProvince(e.target.value)}
                          placeholder="DKI Jakarta"
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                          disabled={useOfficeAddress}
                        />
                      </div>

                      <div>
                        <Label htmlFor="locationPostalCode" className="text-base font-semibold text-gray-900 dark:text-slate-100">Kode Pos</Label>
                        <Input
                          id="locationPostalCode"
                          value={locationPostalCode}
                          onChange={(e) => setLocationPostalCode(e.target.value)}
                          placeholder="10110"
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500 text-gray-900 dark:text-slate-100"
                          disabled={useOfficeAddress}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-800 dark:text-green-300 font-semibold">{success}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons - Di dalam CardContent */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Kembali
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.back()}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Batal
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className="px-6 bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canSubmit ? 'Lengkapi semua field yang wajib diisi (Judul, Deskripsi, Tanggal PM, Nama Kontak, No. Telepon)' : ''}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Buat PM Task
                      </>
                    )}
                  </Button>
                  {!canSubmit && currentStep === 3 && (
                    <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Field yang masih perlu dilengkapi:</p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-400 list-disc list-inside space-y-0.5">
                        {!hasSelectedCassettes && <li>Pilih minimal 1 kaset</li>}
                        {!title.trim() && <li>Judul PM</li>}
                        {!description.trim() && <li>Deskripsi PM</li>}
                        {!scheduledDate.trim() && <li>Tanggal PM</li>}
                        {!contactName.trim() && <li>Nama Kontak</li>}
                        {!contactPhone.trim() && <li>No. Telepon Kontak</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </form>
      </div>
    </PageLayout>
  );
}
