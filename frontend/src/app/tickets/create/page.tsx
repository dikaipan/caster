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
import BarcodeScanner from '@/components/BarcodeScanner';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Package, 
  FileText, 
  Truck, 
  ScanBarcode,
  Loader2,
  ArrowRight,
  Check,
  Search,
  Cpu,
  Database,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCheck,
  Clock,
  Wrench,
  ArrowLeft
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreateTicketPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchMode, setSearchMode] = useState<'cassette' | 'machine'>('cassette');
  const [cassetteSerialNumber, setCassetteSerialNumber] = useState('');
  const [machineSN, setMachineSN] = useState('');
  const [cassetteInfo, setCassetteInfo] = useState<any>(null);
  const [machineSearchResults, setMachineSearchResults] = useState<any>(null);
  const [searchingMachine, setSearchingMachine] = useState(false);
  const [selectedCassettes, setSelectedCassettes] = useState<any[]>([]);
  const [searchedMachines, setSearchedMachines] = useState<string[]>([]);
  const [cassettesAvailability, setCassettesAvailability] = useState<Record<string, any>>({});
  const [showScanner, setShowScanner] = useState(false);
  const MAX_CASSETTES = 30;
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [banks, setBanks] = useState<any[]>([]);
  
  // Individual cassette details for multi-cassette ticket
  const [selectedCassetteDetails, setSelectedCassetteDetails] = useState<Array<{
    cassetteId: string;
    serialNumber: string;
    title: string;
    description: string;
    priority: string;
    affectedComponents: string[];
    wsid: string;
    errorCode: string;
  }>>([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [cassetteDetails, setCassetteDetails] = useState<{[key: string]: {
    errorCode: string;
    wsid: string;
    affectedComponents: string;
    expanded: boolean;
  }}>({});
  const [affectedComponents, setAffectedComponents] = useState<string[]>([]);
  const [wsid, setWsid] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [courierService, setCourierService] = useState('');
  const [customCourierService, setCustomCourierService] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippedDate, setShippedDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [pengelolaInfo, setPengelolaInfo] = useState<any>(null);
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
    { number: 2, title: 'Detail Masalah', icon: FileText },
    { number: 3, title: 'Pengiriman', icon: Truck },
  ];

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
          }
        } catch (err: any) {
          if (err.code !== 'ERR_NETWORK' && err.code !== 'ERR_CONNECTION_REFUSED') {
            console.error('Error fetching pengelola info:', err);
          }
        }
      }
    };

    if (isAuthenticated && user) {
      fetchPengelolaInfo();
    }
  }, [isAuthenticated, user]);

  // Fetch banks - filter by pengelola assignments if PENGELOLA user
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        if (user?.userType === 'PENGELOLA' && pengelolaInfo?.bankAssignments) {
          // For PENGELOLA: only show banks assigned to this pengelola
          // bankAssignments already includes customerBank from backend
          const assignedBanks = pengelolaInfo.bankAssignments
            .filter((assignment: any) => assignment.status === 'ACTIVE' && assignment.customerBank)
            .map((assignment: any) => assignment.customerBank);
          
          setBanks(assignedBanks);
          
          // Auto-select bank if only one bank assigned
          if (assignedBanks.length === 1) {
            setSelectedBankId(assignedBanks[0].id);
          }
        } else if (user?.userType === 'HITACHI') {
          // For HITACHI: show all banks
          const response = await api.get('/banks');
          setBanks(response.data || []);
        } else {
          setBanks([]);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
        setBanks([]);
      }
    };
    if (isAuthenticated) {
      // Wait for pengelolaInfo if PENGELOLA user
      if (user?.userType === 'PENGELOLA' && !pengelolaInfo) {
        return; // Wait for pengelolaInfo to be fetched first
      }
      fetchBanks();
    }
  }, [isAuthenticated, user, pengelolaInfo]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Auto-fill address from pengelola info when useOfficeAddress is checked
  useEffect(() => {
    if (useOfficeAddress && pengelolaInfo) {
      setSenderAddress(pengelolaInfo.address || '');
      setSenderCity(pengelolaInfo.city || '');
      setSenderProvince(pengelolaInfo.province || '');
      setSenderPostalCode(pengelolaInfo.postalCode || '');
    } else if (!useOfficeAddress && user?.userType === 'PENGELOLA') {
      // Clear address fields when unchecked
      setSenderAddress('');
      setSenderCity('');
      setSenderProvince('');
      setSenderPostalCode('');
    }
  }, [useOfficeAddress, pengelolaInfo, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchCassetteInfo = async () => {
      if (!cassetteSerialNumber.trim() || searchMode === 'machine') {
        setCassetteInfo(null);
        return;
      }

      try {
        const response = await api.get('/cassettes/search', {
          params: {
            serialNumber: cassetteSerialNumber.trim(),
            customerBankId: selectedBankId || undefined,
            _t: Date.now(),
          },
        });
        
        if (response.data) {
          // Check availability before adding to selection
          try {
            const availabilityResponse = await api.get(`/cassettes/${response.data.id}/check-availability`);
            const availabilityInfo = availabilityResponse.data;
            
            const hasActiveTicket = availabilityInfo?.activeTicket;
            const hasActivePM = availabilityInfo?.activePM;
            const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(response.data.status);
            
            if (hasActiveTicket || hasActivePM || statusInRepair) {
              const reason = hasActiveTicket 
                ? `Kaset ${response.data.serialNumber} memiliki tiket aktif: ${availabilityInfo.activeTicket.ticketNumber} (${availabilityInfo.activeTicket.status})`
                : hasActivePM
                ? `Kaset ${response.data.serialNumber} sedang dalam PM task: ${availabilityInfo.activePM.pmNumber} (${availabilityInfo.activePM.status})`
                : response.data.status === 'SCRAPPED'
                ? `Kaset ${response.data.serialNumber} sudah di-SCRAPPED dan tidak dapat digunakan lagi`
                : `Kaset ${response.data.serialNumber} sedang dalam proses perbaikan (Status: ${response.data.status})`;
              
              setError(reason + '. Kaset tidak dapat dipilih.');
              setCassetteInfo({
                ...response.data,
                availabilityInfo,
                isInProcess: true,
              });
              return;
            }
          } catch (availabilityErr) {
            // If availability check fails, still show cassette but log error
            console.error('Error checking availability:', availabilityErr);
          }
          
          setCassetteInfo(response.data);
          setError('');
          // Automatically add to selectedCassettes if not already selected
          setSelectedCassettes(prev => {
            const isAlreadySelected = prev.some(c => c.id === response.data.id);
            if (!isAlreadySelected && prev.length < MAX_CASSETTES) {
              // Initialize details for this cassette
              setCassetteDetails(prevDetails => ({
                ...prevDetails,
                [response.data.id]: {
                  errorCode: '',
                  wsid: '',
                  affectedComponents: '',
                  expanded: false,
                },
              }));
              return [...prev, response.data];
            }
            return prev;
          });
        } else {
          setCassetteInfo(null);
          setError(`Cassette dengan SN "${cassetteSerialNumber}" tidak ditemukan`);
        }
      } catch (err: any) {
        setCassetteInfo(null);
        if (err.response?.status === 404) {
          setError(`Cassette dengan SN "${cassetteSerialNumber}" tidak ditemukan`);
        } else {
          setError('Gagal memverifikasi kaset. Silakan coba lagi.');
        }
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCassetteInfo();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cassetteSerialNumber, isAuthenticated, searchMode, selectedBankId]);

  // Auto-search when machine SN is entered
  useEffect(() => {
    const searchByMachineSN = async () => {
      if (!machineSN.trim() || searchMode !== 'machine') {
        setMachineSearchResults(null);
        return;
      }

      // Check if this machine was already searched
      if (searchedMachines.includes(machineSN.trim())) {
        setError('Mesin ini sudah dicari. Masukkan SN mesin yang berbeda.');
        return;
      }

      setSearchingMachine(true);
      setError('');

      try {
        const response = await api.get('/cassettes/search-by-machine-sn', {
          params: {
            machineSN: machineSN.trim(),
            customerBankId: selectedBankId || undefined,
          },
        });

        if (response.data) {
          setMachineSearchResults(response.data);
          if (response.data.cassettes && response.data.cassettes.length === 0) {
            setError(`Tidak ada kaset di mesin dengan SN "${machineSN}"`);
          } else {
            setError('');
            // Mark this machine as searched
            setSearchedMachines(prev => [...prev, machineSN.trim()]);
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
  }, [machineSN, searchMode, isAuthenticated, searchedMachines, selectedBankId]);

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

  const handleToggleCassette = (cassette: any) => {
    // Check if cassette has active ticket or PM
    const availabilityInfo = cassettesAvailability[cassette.id];
    const hasActiveTicket = availabilityInfo?.activeTicket;
    const hasActivePM = availabilityInfo?.activePM;
    const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(cassette.status);
    
    if (hasActiveTicket || hasActivePM || statusInRepair) {
      // Don't allow selection if cassette is in process
      const reason = hasActiveTicket 
        ? `Kaset ${cassette.serialNumber} memiliki tiket aktif: ${availabilityInfo.activeTicket.ticketNumber} (${availabilityInfo.activeTicket.status})`
        : hasActivePM
        ? `Kaset ${cassette.serialNumber} sedang dalam PM task: ${availabilityInfo.activePM.pmNumber} (${availabilityInfo.activePM.status})`
        : cassette.status === 'SCRAPPED'
        ? `Kaset ${cassette.serialNumber} sudah di-SCRAPPED dan tidak dapat digunakan lagi`
        : `Kaset ${cassette.serialNumber} sedang dalam proses perbaikan (Status: ${cassette.status})`;
      
      toast({
        title: 'Kaset Tidak Dapat Dipilih',
        description: reason + '. Silakan tutup atau selesaikan proses yang ada terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedCassettes(prev => {
      const isSelected = prev.some(c => c.id === cassette.id);
      if (isSelected) {
        // Unselect - remove details too
        setCassetteDetails(prevDetails => {
          const newDetails = { ...prevDetails };
          delete newDetails[cassette.id];
          return newDetails;
        });
        // Remove from selectedCassetteDetails
        setSelectedCassetteDetails(prevDetails => 
          prevDetails.filter(d => d.cassetteId !== cassette.id)
        );
        return prev.filter(c => c.id !== cassette.id);
      } else {
        // Check max limit
        if (prev.length >= MAX_CASSETTES) {
          setError(`Maksimal ${MAX_CASSETTES} kaset per request`);
          return prev;
        }
        // Select - initialize details
        setCassetteDetails(prevDetails => ({
          ...prevDetails,
          [cassette.id]: {
            errorCode: '',
            wsid: '',
            affectedComponents: '',
            expanded: false,
          },
        }));
        // Add to selectedCassetteDetails with default values
        setSelectedCassetteDetails(prevDetails => [
          ...prevDetails,
          {
            cassetteId: cassette.id,
            serialNumber: cassette.serialNumber,
            title: title || 'Masalah kaset',
            description: description || 'Deskripsi masalah',
            priority: priority || 'MEDIUM',
            affectedComponents: [],
            wsid: '',
            errorCode: '',
          }
        ]);
        setError('');
        return [...prev, cassette];
      }
    });
  };

  const updateCassetteDetail = (cassetteId: string, field: string, value: string) => {
    setCassetteDetails(prev => ({
      ...prev,
      [cassetteId]: {
        ...prev[cassetteId],
        [field]: value,
      },
    }));
    
    // Also update selectedCassetteDetails
    setSelectedCassetteDetails(prevDetails => 
      prevDetails.map(detail => {
        if (detail.cassetteId === cassetteId) {
          if (field === 'affectedComponents') {
            // Parse comma-separated string to array
            return {
              ...detail,
              affectedComponents: value ? value.split(',').map(c => c.trim()).filter(c => c) : []
            };
          }
          return { ...detail, [field]: value };
        }
        return detail;
      })
    );
  };

  const toggleCassetteExpanded = (cassetteId: string) => {
    setCassetteDetails(prev => ({
      ...prev,
      [cassetteId]: {
        ...prev[cassetteId],
        expanded: !prev[cassetteId]?.expanded,
      },
    }));
  };

  const applyDetailsToAll = () => {
    if (selectedCassettes.length === 0) return;
    
    const firstCassetteId = selectedCassettes[0].id;
    const templateDetails = cassetteDetails[firstCassetteId];
    
    if (!templateDetails) return;

    const newDetails = { ...cassetteDetails };
    selectedCassettes.forEach(cassette => {
      newDetails[cassette.id] = {
        ...templateDetails,
        expanded: newDetails[cassette.id]?.expanded || false,
      };
    });
    
    setCassetteDetails(newDetails);
    toast({
      title: 'Berhasil!',
      description: 'Detail berhasil di-copy ke semua kaset!',
      variant: 'default',
    });
  };

  const handleClearSearch = () => {
    setMachineSN('');
    setMachineSearchResults(null);
    setError('');
  };

  const handleSelectCassette = (cassette: any) => {
    setCassetteSerialNumber(cassette.serialNumber);
    setCassetteInfo(cassette);
    setSearchMode('cassette');
    setMachineSearchResults(null);
    setSelectedCassettes([]);
    setError('');
    setFieldErrors({}); // Clear field errors when selecting new cassette
  };

  // Real-time field validation
  const validateField = (name: string, value: string | boolean) => {
    const errors: Record<string, string> = {};
    
    if (name === 'title' && !value.toString().trim()) {
      errors.title = 'Judul masalah wajib diisi';
    }
    
    if (name === 'description' && !value.toString().trim()) {
      errors.description = 'Deskripsi masalah wajib diisi';
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
        // If OTHER is selected, check customCourierService
        if (!customCourierService.trim()) {
          errors.courierService = 'Nama jasa kurir wajib diisi';
        }
      } else if (!value.toString() || value.toString() === '') {
        errors.courierService = 'Jasa kurir wajib dipilih';
      }
    }
    
    if (name === 'customCourierService' && deliveryMethod === 'COURIER' && courierService === 'OTHER') {
      if (!value.toString().trim()) {
        errors.courierService = 'Nama jasa kurir wajib diisi';
      }
    }
    
    // Update errors state
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

  // Clear field error when value changes
  const handleFieldChange = (name: string, value: string, setter: (value: string) => void) => {
    setter(value);
    // Clear error if field is now valid
    if (fieldErrors[name]) {
      validateField(name, value);
    }
  };

  // Auto-scroll to first error field
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      const firstErrorField = Object.keys(fieldErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }, 100);
      }
    }
  }, [fieldErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate bank is selected
    if (!selectedBankId) {
      toast({
        title: 'Error',
        description: 'Pilih bank terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    // Validate all cassettes are from the selected bank
    if (selectedCassettes.length > 0) {
      const allSameBank = selectedCassettes.every((c: any) => 
        c.customerBankId === selectedBankId
      );
      
      if (!allSameBank) {
        toast({
          title: 'Error',
          description: 'Semua cassette harus dari bank yang dipilih',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate all fields
    const errors: Record<string, string> = {};

    // Validate selected cassettes
    if (selectedCassettes.length === 0) {
      const errorMsg = 'Harap pilih minimal satu kaset';
      setError(errorMsg);
      toast({
        title: 'Validasi Gagal',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    // Validate title and description
    if (!title.trim()) {
      errors.title = 'Judul masalah wajib diisi';
    }
    if (!description.trim()) {
      errors.description = 'Deskripsi masalah wajib diisi';
    }

    // Validate delivery method
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

    // Validate address fields if not using office address
    if (!useOfficeAddress) {
      if (!senderAddress.trim()) {
        errors.senderAddress = 'Alamat pengirim wajib diisi';
      }
      if (!senderCity.trim()) {
        errors.senderCity = 'Kota pengirim wajib diisi';
      }
      if (!senderContactName.trim()) {
        errors.senderContactName = 'Nama kontak pengirim wajib diisi';
      }
      if (!senderContactPhone.trim()) {
        errors.senderContactPhone = 'No. telepon kontak wajib diisi';
      }
    }

    // Additional validation for COURIER
    if (deliveryMethod === 'COURIER') {
      if (courierService === 'OTHER') {
        // If OTHER is selected, customCourierService must be filled
        if (!customCourierService.trim()) {
          errors.courierService = 'Nama jasa kurir wajib diisi';
        }
      } else if (!courierService) {
        // If not OTHER, courierService must be selected
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

    // If there are field errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: 'Validasi Gagal',
        description: 'Harap lengkapi semua field yang wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    // If validation passes, show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setError('');
    setSubmitting(true);

    try {
      if (deliveryMethod === 'COURIER') {
        const finalCourierService = courierService === 'OTHER' ? customCourierService : courierService;
        if (!finalCourierService) {
          const errorMsg = 'Jasa kurir wajib dipilih';
          setError(errorMsg);
          toast({
            title: 'Validasi Gagal',
            description: errorMsg,
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        if (!trackingNumber.trim()) {
          const errorMsg = 'Nomor resi wajib diisi';
          setError(errorMsg);
          toast({
            title: 'Validasi Gagal',
            description: errorMsg,
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        if (!shippedDate) {
          const errorMsg = 'Tanggal pengiriman wajib diisi';
          setError(errorMsg);
          toast({
            title: 'Validasi Gagal',
            description: errorMsg,
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
      }

      // Prepare cassette details array for multi-cassette ticket
      // Build from selectedCassettes and their individual details
      const cassettesData = selectedCassettes.map(cassette => {
        const details = cassetteDetails[cassette.id] || {};
        const components = details.affectedComponents 
          ? details.affectedComponents.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
          : [];
        
        return {
          cassetteSerialNumber: cassette.serialNumber,
          title: title.trim() || 'Masalah kaset',
          description: description.trim() || 'Deskripsi masalah',
          priority: priority || 'MEDIUM',
          affectedComponents: components.length > 0 ? components : undefined,
          wsid: details.wsid?.trim() || undefined,
          errorCode: details.errorCode?.trim() || undefined,
        };
      });

      // Get machineId from the first cassette (if available)
      const machineId = selectedCassettes[0]?.machine?.id;

      // CREATE 1 TICKET WITH MULTIPLE CASSETTES
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
      });

      const ticketNumber = response.data.ticketNumber;
      
      let successMessage = `Tiket ${ticketNumber} berhasil dibuat dengan ${selectedCassettes.length} kaset!`;
      
      if (deliveryMethod === 'COURIER') {
        successMessage += ' Kaset sedang dalam perjalanan ke Repair Center.';
      }
      
      // Show success toast notification
      toast({
        title: 'Berhasil!',
        description: successMessage,
        variant: 'default',
      });
      
      // Redirect after short delay to allow user to see the toast
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
      
      // Show error toast for better visibility
      toast({
        title: 'Gagal Membuat Tiket',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanSuccess = (serialNumber: string) => {
    setCassetteSerialNumber(serialNumber);
    setShowScanner(false);
  };

  // Validation helpers
  // Note: cassetteInfo is automatically added to selectedCassettes when found
  const hasSelectedCassettes = selectedCassettes.length > 0;
  const canProceedToStep2 = hasSelectedCassettes;
  const canProceedToStep3 = canProceedToStep2 && title.trim() && description.trim();
  
  // Validate delivery method
  const hasDeliveryMethod = !!deliveryMethod;
  
  // Validate courier details (if COURIER is selected)
  const finalCourierService = courierService === 'OTHER' ? customCourierService.trim() : (courierService || '');
  const hasCourierDetails = deliveryMethod === 'COURIER' 
    ? (finalCourierService.length > 0 && trackingNumber.trim().length > 0 && !!shippedDate)
    : true;
  
  // Validate address (only if not using office address)
  const hasAddressInfo = useOfficeAddress || 
    (senderAddress.trim() && senderCity.trim() && senderContactName.trim() && senderContactPhone.trim());
  
  // Validate replacement reason if replacement is requested
  const canSubmit = canProceedToStep3 && hasDeliveryMethod && hasCourierDetails && hasAddressInfo;

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
                    Hanya user pengelola yang dapat membuat tiket masalah
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Anda saat ini login sebagai <strong>{user?.userType}</strong>. 
                Tiket masalah hanya dapat dibuat oleh user pengelola.
              </p>
              <Button onClick={() => router.push('/tickets')}>
                Kembali ke Daftar Tiket
              </Button>
            </CardContent>
        </Card>
      </div>
    </PageLayout>
    );
  }

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

        {/* Progress Steps */}
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
          {/* Step 1: Identifikasi Kaset */}
          {currentStep === 1 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Identifikasi Kaset</CardTitle>
                    <CardDescription>Cari kaset berdasarkan Serial Number kaset atau mesin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bank Filter */}
                <div className="space-y-2">
                  <Label htmlFor="bank" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Pilih Bank <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                  </Label>
                  <Select 
                    value={selectedBankId || ''} 
                    onValueChange={(value) => {
                      setSelectedBankId(value || null);
                      // Clear search results when bank changes
                      setCassetteInfo(null);
                      setMachineSearchResults(null);
                      setCassetteSerialNumber('');
                      setMachineSN('');
                      setError('');
                    }}
                    required
                    disabled={banks.length === 1 && selectedBankId === banks[0]?.id} // Disable if only one bank and already selected
                  >
                    <SelectTrigger id="bank">
                      <SelectValue placeholder={
                        banks.length === 0 
                          ? (user?.userType === 'PENGELOLA' ? "Tidak ada bank yang di-assign" : "Pilih Bank")
                          : banks.length === 1 && selectedBankId === banks[0]?.id
                          ? banks[0]?.bankName
                          : "Pilih Bank"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                          {user?.userType === 'PENGELOLA' ? "Tidak ada bank yang di-assign ke pengelola Anda" : "Tidak ada bank tersedia"}
                        </div>
                      ) : (
                        banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bankName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!selectedBankId && (
                    <p className="text-sm text-muted-foreground">
                      Pilih bank terlebih dahulu sebelum mencari cassette/machine
                    </p>
                  )}
                </div>

                <Tabs value={searchMode} onValueChange={(v) => {
                  setSearchMode(v as 'cassette' | 'machine');
                  setError('');
                  setCassetteInfo(null);
                  setMachineSearchResults(null);
                }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cassette" className="flex items-center gap-2" disabled={!selectedBankId}>
                      <Database className="h-4 w-4" />
                      Cari by SN Kaset
                    </TabsTrigger>
                    <TabsTrigger value="machine" className="flex items-center gap-2" disabled={!selectedBankId}>
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
                      <div className="flex gap-2">
                        <Input
                          id="cassetteSerialNumber"
                          placeholder="Contoh: RB-BNI-0001"
                          value={cassetteSerialNumber}
                          onChange={(e) => setCassetteSerialNumber(e.target.value)}
                          required
                          className="flex-1 font-mono text-lg h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => setShowScanner(true)}
                          className="px-6"
                        >
                          <ScanBarcode className="h-5 w-5 mr-2" />
                          Scan
                        </Button>
                      </div>
                      
                      {cassetteInfo ? (
                        cassetteInfo.isInProcess ? (
                          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Kaset Ditemukan - Sedang Dalam Proses</p>
                                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                  <div>
                                    <span className="text-orange-700 dark:text-orange-300 font-medium">Serial Number:</span>
                                    <p className="text-orange-900 dark:text-orange-100 font-mono">{cassetteInfo.serialNumber}</p>
                                  </div>
                                  <div>
                                    <span className="text-orange-700 dark:text-orange-300 font-medium">Tipe:</span>
                                    <p className="text-orange-900 dark:text-orange-100">{cassetteInfo.cassetteType?.typeCode || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-orange-700 dark:text-orange-300 font-medium">Bank:</span>
                                    <p className="text-orange-900 dark:text-orange-100">{cassetteInfo.customerBank?.bankName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-orange-700 dark:text-orange-300 font-medium">Status:</span>
                                    <p className="text-orange-900 dark:text-orange-100 font-semibold">{cassetteInfo.status}</p>
                                  </div>
                                </div>
                                {cassetteInfo.availabilityInfo?.activeTicket && (
                                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-800 mb-2">
                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium mb-1">
                                      <Wrench className="h-4 w-4" />
                                      <span>Tiket Aktif</span>
                                    </div>
                                    <p className="text-orange-600 dark:text-orange-500 font-mono text-sm">
                                      {cassetteInfo.availabilityInfo.activeTicket.ticketNumber}
                                    </p>
                                    <p className="text-orange-600 dark:text-orange-500 text-xs mt-0.5">
                                      Status: {cassetteInfo.availabilityInfo.activeTicket.status}
                                    </p>
                                  </div>
                                )}
                                {cassetteInfo.availabilityInfo?.activePM && (
                                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium mb-1">
                                      <Clock className="h-4 w-4" />
                                      <span>PM Task Aktif</span>
                                    </div>
                                    <p className="text-orange-600 dark:text-orange-500 font-mono text-sm">
                                      {cassetteInfo.availabilityInfo.activePM.pmNumber}
                                    </p>
                                    <p className="text-orange-600 dark:text-orange-500 text-xs mt-0.5">
                                      Status: {cassetteInfo.availabilityInfo.activePM.status}
                                    </p>
                                  </div>
                                )}
                                <p className="text-xs text-orange-700 dark:text-orange-400 mt-3">
                                  Kaset ini tidak dapat dipilih karena sedang dalam proses. Silakan tutup atau selesaikan proses yang ada terlebih dahulu.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-900 dark:text-green-100 mb-2">Kaset Ditemukan!</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-green-700 dark:text-green-300 font-medium">Serial Number:</span>
                                    <p className="text-green-900 dark:text-green-100 font-mono">{cassetteInfo.serialNumber}</p>
                                  </div>
                                  <div>
                                    <span className="text-green-700 dark:text-green-300 font-medium">Tipe:</span>
                                    <p className="text-green-900 dark:text-green-100">{cassetteInfo.cassetteType?.typeCode || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-green-700 dark:text-green-300 font-medium">Bank:</span>
                                    <p className="text-green-900 dark:text-green-100">{cassetteInfo.customerBank?.bankName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-green-700 dark:text-green-300 font-medium">Status:</span>
                                    <p className="text-green-900 dark:text-green-100 font-semibold">{cassetteInfo.status}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      ) : cassetteSerialNumber.trim() && error && searchMode === 'cassette' ? (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                          <Circle className="h-4 w-4" />
                          Masukkan atau scan Serial Number kaset
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab: Search by Machine SN */}
                  <TabsContent value="machine" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="machineSN" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Serial Number Mesin (6 digit terakhir)
                      </Label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            id="machineSN"
                            placeholder="Contoh: 071110"
                            value={machineSN}
                            onChange={(e) => setMachineSN(e.target.value)}
                            className="flex-1 font-mono text-lg h-12 pr-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500"
                            maxLength={20}
                          />
                          {searchingMachine && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                        {machineSearchResults && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearSearch}
                            className="w-full"
                          >
                            Cari Mesin Lain
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <p className="text-muted-foreground">
                          Kaset otomatis tampil saat Anda mengetik
                        </p>
                        <p className="font-medium text-primary">
                          {selectedCassettes.length}/{MAX_CASSETTES} dipilih
                        </p>
                      </div>

                      {/* Machine Search Results */}
                      {machineSearchResults && (
                        <div className="mt-4 space-y-4">
                          {/* Machine Info */}
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

                          {/* Cassette List with Checkboxes */}
                          {machineSearchResults.cassettes && machineSearchResults.cassettes.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-gray-900 dark:text-slate-100">
                                  Pilih Kaset dari Mesin Ini
                                </p>
                                {selectedCassettes.length >= MAX_CASSETTES && (
                                  <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 px-2 py-1 rounded font-medium">
                                    Maksimal tercapai
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                                {machineSearchResults.cassettes.map((cassette: any) => {
                                  const isSelected = selectedCassettes.some(c => c.id === cassette.id);
                                  const availabilityInfo = cassettesAvailability[cassette.id];
                                  
                                  // Check if cassette is in any active process
                                  const hasActiveTicket = availabilityInfo?.activeTicket;
                                  const hasActivePM = availabilityInfo?.activePM;
                                  const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(cassette.status);
                                  
                                  // Show "Dalam Proses" badge if any of these is true
                                  const isInProcess = hasActiveTicket || hasActivePM || statusInRepair;
                                  
                                  // Disable if: max reached (and not selected), OR cassette is in process
                                  const isDisabled = (!isSelected && selectedCassettes.length >= MAX_CASSETTES) || isInProcess;
                                  
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
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-mono font-semibold text-gray-900 dark:text-slate-100 mb-1">
                                            {cassette.serialNumber}
                                          </p>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                {cassette.cassetteType?.typeCode || 'N/A'}
                                              </span>
                                              <span className="font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                {cassette.machine?.machineType || 'N/A'}
                                              </span>
                                            </div>
                                            <p className="text-gray-600 dark:text-slate-400 truncate">
                                              <span className="font-medium">Bank:</span> {cassette.customerBank?.bankName}
                                            </p>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                              cassette.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                              cassette.status === 'BAD' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                                              cassette.status === 'SCRAPPED' ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400' :
                                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                            }`}>
                                              {cassette.status}
                                            </span>
                                            {isInProcess && (
                                              <div className="mt-1 space-y-1">
                                                {hasActiveTicket && (
                                                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
                                                    <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400 font-medium mb-1">
                                                      <Wrench className="h-3 w-3" />
                                                      <span>Tiket Aktif</span>
                                                    </div>
                                                    <p className="text-orange-600 dark:text-orange-500 font-mono text-[10px]">
                                                      {availabilityInfo.activeTicket.ticketNumber}
                                                    </p>
                                                    <p className="text-orange-600 dark:text-orange-500 text-[10px] mt-0.5">
                                                      Status: {availabilityInfo.activeTicket.status}
                                                    </p>
                                                  </div>
                                                )}
                                                {hasActivePM && (
                                                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
                                                    <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400 font-medium mb-1">
                                                      <Clock className="h-3 w-3" />
                                                      <span>PM Task Aktif</span>
                                                    </div>
                                                    <p className="text-orange-600 dark:text-orange-500 font-mono text-[10px]">
                                                      {availabilityInfo.activePM.pmNumber}
                                                    </p>
                                                    <p className="text-orange-600 dark:text-orange-500 text-[10px] mt-0.5">
                                                      Status: {availabilityInfo.activePM.status}
                                                    </p>
                                                  </div>
                                                )}
                                                {cassette.status === 'SCRAPPED' && (
                                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 text-xs rounded-full">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>Kaset SCRAPPED - Tidak Dapat Digunakan</span>
                                                  </div>
                                                )}
                                                {statusInRepair && !hasActiveTicket && !hasActivePM && cassette.status !== 'SCRAPPED' && (
                                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>Status: Sedang diperbaiki</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {selectedCassettes.length > 0 && (
                                <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 border-2 border-teal-200 dark:border-teal-800/50 rounded-lg">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <p className="text-sm text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {selectedCassettes.length} kaset dipilih
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                        Tiket akan dibuat terpisah untuk setiap kaset
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedCassettes.map((c: any) => (
                                          <span key={c.id} className="text-xs bg-white dark:bg-slate-700 border border-teal-300 dark:border-teal-700/50 px-2 py-1 rounded font-mono text-gray-900 dark:text-slate-200">
                                            {c.serialNumber}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedCassettes([])}
                                      className="text-xs"
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>
                              )}
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
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Selected Summary */}
                {(cassetteInfo || selectedCassettes.length > 0) && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">Kaset Terpilih</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCassettes.length > 0 
                            ? `${selectedCassettes.length}/${MAX_CASSETTES} kaset akan diperbaiki` 
                            : '1 kaset akan diperbaiki'}
                        </p>
                      </div>
                      {selectedCassettes.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCassettes([]);
                            setSearchedMachines([]);
                          }}
                        >
                          Reset Semua
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedToStep2}
                    className="min-w-[200px]"
                  >
                    Lanjut ke Detail Masalah
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Detail Masalah */}
          {currentStep === 2 && (
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Detail Masalah</CardTitle>
                    <CardDescription>
                      {selectedCassettes.length > 1 
                        ? `Isi detail umum dan spesifik untuk ${selectedCassettes.length} kaset`
                        : 'Jelaskan masalah yang ditemukan pada kaset'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Common Fields Section */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Detail Umum (Untuk Semua Kaset)</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Judul Masalah <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Contoh: Kaset macet di Slot 1"
                        value={title}
                        onChange={(e) => handleFieldChange('title', e.target.value, setTitle)}
                        onBlur={(e) => validateField('title', e.target.value)}
                        required
                        className={`text-lg h-12 bg-white dark:bg-slate-700 border-2 ${
                          fieldErrors.title 
                            ? 'border-red-500 dark:border-red-500 focus:border-red-500' 
                            : 'border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500'
                        } text-gray-900 dark:text-slate-100`}
                        aria-invalid={fieldErrors.title ? 'true' : 'false'}
                      />
                      {fieldErrors.title && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.title}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        Deskripsi Detail <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Jelaskan masalah secara detail. Sertakan informasi seperti kode error, gejala, slot yang bermasalah, dll."
                        value={description}
                        onChange={(e) => handleFieldChange('description', e.target.value, setDescription)}
                        onBlur={(e) => validateField('description', e.target.value)}
                        required
                        rows={4}
                        className={`text-base bg-white dark:bg-slate-700 border-2 ${
                          fieldErrors.description 
                            ? 'border-red-500 dark:border-red-500 focus:border-red-500' 
                            : 'border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500'
                        } text-gray-900 dark:text-slate-100`}
                        aria-invalid={fieldErrors.description ? 'true' : 'false'}
                      />
                      {fieldErrors.description && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-base font-semibold text-gray-900 dark:text-slate-100">Prioritas</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger id="priority" className="h-12 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">🟢 Rendah</SelectItem>
                          <SelectItem value="MEDIUM">🟡 Sedang</SelectItem>
                          <SelectItem value="HIGH">🟠 Tinggi</SelectItem>
                          <SelectItem value="CRITICAL">🔴 Kritis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Individual Cassette Details Section */}
                {selectedCassettes.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                          Detail Spesifik Per Kaset (Opsional)
                        </h3>
                      </div>
                      {selectedCassettes.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applyDetailsToAll}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Kaset 1 ke Semua
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {selectedCassettes.map((cassette, index) => {
                        const details = cassetteDetails[cassette.id] || {
                          errorCode: '',
                          wsid: '',
                          affectedComponents: '',
                          expanded: false,
                        };
                        const isExpanded = details.expanded;
                        const hasDetails = details.errorCode || details.wsid || details.affectedComponents;

                        return (
                          <div
                            key={cassette.id}
                            className={`border-2 rounded-lg overflow-hidden transition-all ${
                              isExpanded ? 'border-teal-500 dark:border-teal-600' : 'border-gray-200 dark:border-slate-700'
                            }`}
                          >
                            {/* Header */}
                            <button
                              type="button"
                              onClick={() => toggleCassetteExpanded(cassette.id)}
                              className="w-full p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-primary" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                                )}
                                <div className="text-left">
                                  <p className="font-semibold text-gray-900 dark:text-slate-100">
                                    Kaset {index + 1}: {cassette.serialNumber}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">
                                    {cassette.cassetteType?.typeCode} • {cassette.customerBank?.bankName}
                                  </p>
                                </div>
                              </div>
                              {hasDetails && (
                                <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded font-medium">
                                  <CheckCheck className="h-3 w-3" />
                                  Detail terisi
                                </span>
                              )}
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-700 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`errorCode-${cassette.id}`} className="font-semibold text-gray-900 dark:text-slate-100">
                                      Kode Error
                                    </Label>
                                    <Input
                                      id={`errorCode-${cassette.id}`}
                                      placeholder="Contoh: E101, E202"
                                      value={details.errorCode}
                                      onChange={(e) => updateCassetteDetail(cassette.id, 'errorCode', e.target.value)}
                                      className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`wsid-${cassette.id}`} className="font-semibold text-gray-900 dark:text-slate-100">
                                      WSID Mesin
                                    </Label>
                                    <Input
                                      id={`wsid-${cassette.id}`}
                                      placeholder="Contoh: WS-BNI-JKT-001"
                                      value={details.wsid}
                                      onChange={(e) => updateCassetteDetail(cassette.id, 'wsid', e.target.value)}
                                      className="font-mono bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`components-${cassette.id}`} className="font-semibold text-gray-900 dark:text-slate-100">
                                    Komponen Terpengaruh
                                  </Label>
                                  <Input
                                    id={`components-${cassette.id}`}
                                    placeholder="Contoh: Kaset RB-1, Sensor Unit (pisahkan dengan koma)"
                                    value={details.affectedComponents}
                                    onChange={(e) => updateCassetteDetail(cassette.id, 'affectedComponents', e.target.value)}
                                    className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      💡 Tip: Isi detail kaset pertama, lalu klik &quot;Copy Kaset 1 ke Semua&quot; untuk mempercepat pengisian
                    </p>
                  </div>
                )}


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
                    className="min-w-[200px]"
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
            <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
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
                            // Clear customCourierService if not OTHER
                            if (value !== 'OTHER') {
                              setCustomCourierService('');
                            }
                            // Clear error when selecting a valid option
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
                            // Clear error when user starts typing
                            if (fieldErrors.courierService && e.target.value.trim()) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.courierService;
                                return newErrors;
                              });
                            }
                          }}
                          onBlur={(e) => {
                            if (courierService === 'OTHER' && !e.target.value.trim()) {
                              setFieldErrors(prev => ({
                                ...prev,
                                courierService: 'Nama jasa kurir wajib diisi'
                              }));
                            }
                          }}
                          className={`h-12 border-2 ${
                            fieldErrors.courierService && courierService === 'OTHER'
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-slate-600'
                          } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
                          aria-invalid={fieldErrors.courierService && courierService === 'OTHER' ? 'true' : 'false'}
                        />
                        {fieldErrors.courierService && courierService === 'OTHER' && (
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
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimatedArrival" className="font-semibold text-gray-900 dark:text-slate-100">Estimasi Sampai</Label>
                        <Input
                          id="estimatedArrival"
                          type="date"
                          value={estimatedArrival}
                          onChange={(e) => setEstimatedArrival(e.target.value)}
                          min={shippedDate}
                          className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {deliveryMethod && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">Alamat Pengirim</h3>
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-2 py-1 rounded font-medium">
                        WAJIB DIISI
                      </span>
                    </div>

                    {pengelolaInfo?.address && (
                      <div className="flex items-center gap-2 mb-3">
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

                    {(
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="senderAddress" className="font-semibold text-gray-900 dark:text-slate-100">
                            Alamat Lengkap <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                          </Label>
                          <Textarea
                            id="senderAddress"
                            placeholder="Jl. Sudirman No. 123"
                            value={senderAddress}
                            onChange={(e) => handleFieldChange('senderAddress', e.target.value, setSenderAddress)}
                            onBlur={(e) => validateField('senderAddress', e.target.value)}
                            required={!useOfficeAddress}
                            rows={2}
                            disabled={useOfficeAddress}
                            className={`bg-white dark:bg-slate-700 border-2 ${
                              fieldErrors.senderAddress 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-300 dark:border-slate-600'
                            } text-gray-900 dark:text-slate-100`}
                            aria-invalid={fieldErrors.senderAddress ? 'true' : 'false'}
                          />
                          {fieldErrors.senderAddress && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {fieldErrors.senderAddress}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="senderCity" className="font-semibold text-gray-900 dark:text-slate-100">
                              Kota <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                            </Label>
                            <Input
                              id="senderCity"
                              placeholder="Jakarta"
                              value={senderCity}
                              onChange={(e) => handleFieldChange('senderCity', e.target.value, setSenderCity)}
                              onBlur={(e) => validateField('senderCity', e.target.value)}
                              required={!useOfficeAddress}
                              disabled={useOfficeAddress}
                              className={`bg-white dark:bg-slate-700 border-2 ${
                                fieldErrors.senderCity 
                                  ? 'border-red-500 dark:border-red-500' 
                                  : 'border-gray-300 dark:border-slate-600'
                              } text-gray-900 dark:text-slate-100`}
                              aria-invalid={fieldErrors.senderCity ? 'true' : 'false'}
                            />
                            {fieldErrors.senderCity && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                {fieldErrors.senderCity}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="senderProvince" className="font-semibold text-gray-900 dark:text-slate-100">Provinsi</Label>
                            <Input
                              id="senderProvince"
                              placeholder="DKI Jakarta"
                              value={senderProvince}
                              onChange={(e) => setSenderProvince(e.target.value)}
                              disabled={useOfficeAddress}
                              className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="senderContactName" className="font-semibold text-gray-900 dark:text-slate-100">
                              Nama Kontak <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                            </Label>
                            <Input
                              id="senderContactName"
                              placeholder="John Doe"
                              value={senderContactName}
                              onChange={(e) => handleFieldChange('senderContactName', e.target.value, setSenderContactName)}
                              onBlur={(e) => validateField('senderContactName', e.target.value)}
                              required={!useOfficeAddress}
                              disabled={useOfficeAddress}
                              className={`bg-white dark:bg-slate-700 border-2 ${
                                fieldErrors.senderContactName 
                                  ? 'border-red-500 dark:border-red-500' 
                                  : 'border-gray-300 dark:border-slate-600'
                              } text-gray-900 dark:text-slate-100`}
                              aria-invalid={fieldErrors.senderContactName ? 'true' : 'false'}
                            />
                            {fieldErrors.senderContactName && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                {fieldErrors.senderContactName}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="senderContactPhone" className="font-semibold text-gray-900 dark:text-slate-100">
                              No. Telepon <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                            </Label>
                            <Input
                              id="senderContactPhone"
                              placeholder="081234567890"
                              value={senderContactPhone}
                              onChange={(e) => handleFieldChange('senderContactPhone', e.target.value, setSenderContactPhone)}
                              onBlur={(e) => validateField('senderContactPhone', e.target.value)}
                              required={!useOfficeAddress}
                              disabled={useOfficeAddress}
                              className={`bg-white dark:bg-slate-700 border-2 ${
                                fieldErrors.senderContactPhone 
                                  ? 'border-red-500 dark:border-red-500' 
                                  : 'border-gray-300 dark:border-slate-600'
                              } text-gray-900 dark:text-slate-100`}
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
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
                    </div>
                  </div>
                )}


                {/* Validation Summary */}
                {!canSubmit && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-900 dark:text-yellow-300">
                        <p className="font-semibold mb-1">Lengkapi informasi berikut:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {!hasSelectedCassettes && (
                            <li>Pilih minimal 1 kaset</li>
                          )}
                          {!title.trim() && (
                            <li>Masukkan judul masalah</li>
                          )}
                          {!description.trim() && (
                            <li>Masukkan deskripsi masalah</li>
                          )}
                          {!deliveryMethod && (
                            <li>Pilih metode pengiriman</li>
                          )}
                          {deliveryMethod === 'COURIER' && !finalCourierService && (
                            <li>Pilih atau masukkan jasa kurir</li>
                          )}
                          {deliveryMethod === 'COURIER' && courierService === 'OTHER' && !customCourierService.trim() && (
                            <li>Masukkan nama jasa kurir (jika pilih Lainnya)</li>
                          )}
                          {deliveryMethod === 'COURIER' && !trackingNumber.trim() && (
                            <li>Masukkan nomor resi</li>
                          )}
                          {deliveryMethod === 'COURIER' && !shippedDate && (
                            <li>Pilih tanggal pengiriman</li>
                          )}
                          {!useOfficeAddress && !senderAddress.trim() && (
                            <li>Masukkan alamat pengirim</li>
                          )}
                          {!useOfficeAddress && !senderCity.trim() && (
                            <li>Masukkan kota pengirim</li>
                          )}
                          {!useOfficeAddress && !senderContactName.trim() && (
                            <li>Masukkan nama kontak</li>
                          )}
                          {!useOfficeAddress && !senderContactPhone.trim() && (
                            <li>Masukkan nomor telepon kontak</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    disabled={submitting}
                    className="min-w-[150px]"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting || !canSubmit}
                    className="min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canSubmit ? 'Lengkapi semua field yang wajib diisi' : ''}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Membuat Tiket...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Buat {selectedCassettes.length > 1 ? `${selectedCassettes.length} ` : ''}Tiket
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode Kaset</DialogTitle>
            <DialogDescription>
              Arahkan kamera ke barcode pada kaset
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={(err) => setError(err)}
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembuatan Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membuat ticket untuk <strong>{selectedCassettes.length} kaset</strong>?
              {deliveryMethod === 'COURIER' && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  ⚠️ Kaset akan dikirim ke Repair Center menggunakan kurir.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Ya, Buat Ticket'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
