import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Cassette {
  id: string;
  serialNumber: string;
  status: string;
  cassetteType?: {
    typeCode?: string;
  };
  customerBank?: {
    bankName?: string;
  };
  machine?: {
    id?: string;
    machineType?: string;
  };
}

interface AvailabilityInfo {
  activeTicket?: {
    ticketNumber: string;
    status: string;
  };
  activePM?: {
    pmNumber: string;
    status: string;
  };
}

interface MachineSearchResult {
  machines?: any[];
  cassettes?: Cassette[];
}

export function useCassetteSearch(
  searchMode: 'cassette' | 'machine',
  selectedBankId: string | null,
  isAuthenticated: boolean,
  MAX_CASSETTES: number,
) {
  const { toast } = useToast();
  const [cassetteSerialNumber, setCassetteSerialNumber] = useState('');
  const [machineSN, setMachineSN] = useState('');
  const [cassetteInfo, setCassetteInfo] = useState<Cassette | null>(null);
  const [machineSearchResults, setMachineSearchResults] = useState<MachineSearchResult | null>(null);
  const [searchingMachine, setSearchingMachine] = useState(false);
  const [searchedMachines, setSearchedMachines] = useState<string[]>([]);
  const [cassettesAvailability, setCassettesAvailability] = useState<Record<string, AvailabilityInfo>>({});
  const [error, setError] = useState('');

  // Search cassette by serial number
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
            const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(
              response.data.status,
            );

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

  // Search by machine SN
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
            setSearchedMachines((prev) => [...prev, machineSN.trim()]);
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
        const cassetteIds = machineSearchResults.cassettes!.map((c: any) => c.id);
        const response = await api.post('/cassettes/check-availability-batch', {
          cassetteIds,
        });

        // Response is a map: { [cassetteId]: availabilityData }
        setCassettesAvailability(response.data);
      } catch (err) {
        console.error('[Availability] Error loading batch availability:', err);
        // Fallback: set all as available if batch check fails
        const fallbackMap: Record<string, AvailabilityInfo> = {};
        machineSearchResults.cassettes!.forEach((cassette: any) => {
          fallbackMap[cassette.id] = { activeTicket: undefined, activePM: undefined };
        });
        setCassettesAvailability(fallbackMap);
      }
    };

    loadAvailabilityInfo();
  }, [machineSearchResults]);

  const clearSearch = useCallback(() => {
    setMachineSN('');
    setMachineSearchResults(null);
    setError('');
  }, []);

  const clearAll = useCallback(() => {
    setCassetteSerialNumber('');
    setMachineSN('');
    setCassetteInfo(null);
    setMachineSearchResults(null);
    setError('');
    setSearchedMachines([]);
    setCassettesAvailability({});
  }, []);

  return {
    cassetteSerialNumber,
    setCassetteSerialNumber,
    machineSN,
    setMachineSN,
    cassetteInfo,
    setCassetteInfo,
    machineSearchResults,
    setMachineSearchResults,
    searchingMachine,
    searchedMachines,
    cassettesAvailability,
    error,
    setError,
    clearSearch,
    clearAll,
  };
}

