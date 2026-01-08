import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

export function useMultiCassetteSelection(
  MAX_CASSETTES: number,
  cassettesAvailability: Record<string, AvailabilityInfo>,
  initializeDetails: (cassetteId: string) => void,
  removeDetails: (cassetteId: string) => void,
) {
  const { toast } = useToast();
  const [selectedCassettes, setSelectedCassettes] = useState<Cassette[]>([]);

  const handleToggleCassette = useCallback(
    (cassette: Cassette) => {
      // Check if cassette has active ticket or PM
      const availabilityInfo = cassettesAvailability[cassette.id];
      const hasActiveTicket = availabilityInfo?.activeTicket;
      const hasActivePM = availabilityInfo?.activePM;
      const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(
        cassette.status,
      );

      if (hasActiveTicket || hasActivePM || statusInRepair) {
        // Don't allow selection if cassette is in process
        const reason = hasActiveTicket
          ? `Kaset ${cassette.serialNumber} memiliki tiket aktif: ${availabilityInfo.activeTicket!.ticketNumber} (${availabilityInfo.activeTicket!.status})`
          : hasActivePM
            ? `Kaset ${cassette.serialNumber} sedang dalam PM task: ${availabilityInfo.activePM!.pmNumber} (${availabilityInfo.activePM!.status})`
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

      setSelectedCassettes((prev) => {
        const isSelected = prev.some((c) => c.id === cassette.id);
        if (isSelected) {
          // Unselect - remove details too
          removeDetails(cassette.id);
          return prev.filter((c) => c.id !== cassette.id);
        } else {
          // Check max limit
          if (prev.length >= MAX_CASSETTES) {
            toast({
              title: 'Maksimal Tercapai',
              description: `Maksimal ${MAX_CASSETTES} kaset per request`,
              variant: 'destructive',
            });
            return prev;
          }
          // Select - initialize details
          initializeDetails(cassette.id);
          return [...prev, cassette];
        }
      });
    },
    [MAX_CASSETTES, cassettesAvailability, initializeDetails, removeDetails, toast],
  );

  const addCassette = useCallback(
    (cassette: Cassette) => {
      setSelectedCassettes((prev) => {
        const isAlreadySelected = prev.some((c) => c.id === cassette.id);
        if (!isAlreadySelected && prev.length < MAX_CASSETTES) {
          initializeDetails(cassette.id);
          return [...prev, cassette];
        }
        return prev;
      });
    },
    [MAX_CASSETTES, initializeDetails],
  );

  const removeCassette = useCallback(
    (cassetteId: string) => {
      setSelectedCassettes((prev) => prev.filter((c) => c.id !== cassetteId));
      removeDetails(cassetteId);
    },
    [removeDetails],
  );

  const clearAll = useCallback(() => {
    selectedCassettes.forEach((c) => removeDetails(c.id));
    setSelectedCassettes([]);
  }, [selectedCassettes, removeDetails]);

  return {
    selectedCassettes,
    setSelectedCassettes,
    handleToggleCassette,
    addCassette,
    removeCassette,
    clearAll,
  };
}

