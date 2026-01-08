import { useState, useCallback } from 'react';

interface CassetteDetails {
  errorCode: string;
  wsid: string;
  affectedComponents: string;
  expanded: boolean;
}

export function useTicketForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [cassetteDetails, setCassetteDetails] = useState<Record<string, CassetteDetails>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateCassetteDetail = useCallback((cassetteId: string, field: string, value: string) => {
    setCassetteDetails((prev) => ({
      ...prev,
      [cassetteId]: {
        ...prev[cassetteId],
        [field]: value,
      },
    }));
  }, []);

  const toggleCassetteExpanded = useCallback((cassetteId: string) => {
    setCassetteDetails((prev) => ({
      ...prev,
      [cassetteId]: {
        ...prev[cassetteId],
        expanded: !prev[cassetteId]?.expanded,
      },
    }));
  }, []);

  const applyDetailsToAll = useCallback(
    (selectedCassettes: any[], cassetteDetails: Record<string, CassetteDetails>) => {
      if (selectedCassettes.length === 0) return;

      const firstCassetteId = selectedCassettes[0].id;
      const templateDetails = cassetteDetails[firstCassetteId];

      if (!templateDetails) return;

      const updatedDetails: Record<string, CassetteDetails> = { ...cassetteDetails };
      selectedCassettes.forEach((cassette) => {
        if (cassette.id !== firstCassetteId) {
          updatedDetails[cassette.id] = {
            ...templateDetails,
            expanded: cassetteDetails[cassette.id]?.expanded ?? false,
          };
        }
      });

      setCassetteDetails(updatedDetails);
    },
    [],
  );

  const validateField = useCallback((name: string, value: string | boolean) => {
    const errors: Record<string, string> = {};

    if (name === 'title' && !value.toString().trim()) {
      errors.title = 'Judul masalah wajib diisi';
    } else if (name === 'description' && !value.toString().trim()) {
      errors.description = 'Deskripsi masalah wajib diisi';
    } else if (name === 'senderAddress' && !value.toString().trim()) {
      errors.senderAddress = 'Alamat pengirim wajib diisi';
    } else if (name === 'senderCity' && !value.toString().trim()) {
      errors.senderCity = 'Kota pengirim wajib diisi';
    } else if (name === 'senderContactName' && !value.toString().trim()) {
      errors.senderContactName = 'Nama kontak pengirim wajib diisi';
    } else if (name === 'senderContactPhone' && !value.toString().trim()) {
      errors.senderContactPhone = 'No. telepon kontak wajib diisi';
    } else if (name === 'courierService' && !value.toString()) {
      errors.courierService = 'Jasa kurir wajib dipilih';
    } else if (name === 'trackingNumber' && !value.toString().trim()) {
      errors.trackingNumber = 'Nomor resi wajib diisi';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return false;
    } else {
      // Clear error for this field
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
      return true;
    }
  }, []);

  const handleFieldChange = useCallback(
    (name: string, value: string, setter: (value: string) => void) => {
      setter(value);
      // Clear error if field is now valid
      if (fieldErrors[name]) {
        validateField(name, value);
      }
    },
    [fieldErrors, validateField],
  );

  const initializeCassetteDetails = useCallback((cassetteId: string) => {
    setCassetteDetails((prev) => ({
      ...prev,
      [cassetteId]: {
        ...prev[cassetteId],
        errorCode: prev[cassetteId]?.errorCode ?? '',
        wsid: prev[cassetteId]?.wsid ?? '',
        affectedComponents: prev[cassetteId]?.affectedComponents ?? '',
        expanded: prev[cassetteId]?.expanded ?? false,
      },
    }));
  }, []);

  const removeCassetteDetails = useCallback((cassetteId: string) => {
    setCassetteDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[cassetteId];
      return newDetails;
    });
  }, []);

  return {
    // State
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    cassetteDetails,
    setCassetteDetails,
    fieldErrors,
    setFieldErrors,

    // Actions
    updateCassetteDetail,
    toggleCassetteExpanded,
    applyDetailsToAll,
    validateField,
    handleFieldChange,
    initializeCassetteDetails,
    removeCassetteDetails,
  };
}

