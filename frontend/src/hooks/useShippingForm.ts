import { useState, useEffect } from 'react';

interface PengelolaInfo {
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export function useShippingForm(
  pengelolaInfo: PengelolaInfo | null,
  userType?: string,
) {
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [courierService, setCourierService] = useState('');
  const [customCourierService, setCustomCourierService] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippedDate, setShippedDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [useOfficeAddress, setUseOfficeAddress] = useState(false);
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderProvince, setSenderProvince] = useState('');
  const [senderPostalCode, setSenderPostalCode] = useState('');
  const [senderContactName, setSenderContactName] = useState('');
  const [senderContactPhone, setSenderContactPhone] = useState('');

  // Auto-fill address from pengelola info when useOfficeAddress is checked
  useEffect(() => {
    if (useOfficeAddress && pengelolaInfo) {
      setSenderAddress(pengelolaInfo.address || '');
      setSenderCity(pengelolaInfo.city || '');
      setSenderProvince(pengelolaInfo.province || '');
      setSenderPostalCode(pengelolaInfo.postalCode || '');
    } else if (!useOfficeAddress && userType === 'PENGELOLA') {
      // Clear address fields when unchecked
      setSenderAddress('');
      setSenderCity('');
      setSenderProvince('');
      setSenderPostalCode('');
    }
  }, [useOfficeAddress, pengelolaInfo, userType]);

  const finalCourierService = courierService === 'OTHER' ? customCourierService.trim() : courierService || '';

  const hasDeliveryMethod = !!deliveryMethod;
  const hasCourierDetails =
    deliveryMethod === 'COURIER'
      ? finalCourierService.length > 0 && trackingNumber.trim().length > 0 && !!shippedDate
      : true;
  const hasAddressInfo =
    useOfficeAddress ||
    (senderAddress.trim() && senderCity.trim() && senderContactName.trim() && senderContactPhone.trim());

  return {
    // State
    deliveryMethod,
    setDeliveryMethod,
    courierService,
    setCourierService,
    customCourierService,
    setCustomCourierService,
    trackingNumber,
    setTrackingNumber,
    shippedDate,
    setShippedDate,
    estimatedArrival,
    setEstimatedArrival,
    useOfficeAddress,
    setUseOfficeAddress,
    senderAddress,
    setSenderAddress,
    senderCity,
    setSenderCity,
    senderProvince,
    setSenderProvince,
    senderPostalCode,
    setSenderPostalCode,
    senderContactName,
    setSenderContactName,
    senderContactPhone,
    setSenderContactPhone,

    // Computed
    finalCourierService,
    hasDeliveryMethod,
    hasCourierDetails,
    hasAddressInfo,
  };
}

