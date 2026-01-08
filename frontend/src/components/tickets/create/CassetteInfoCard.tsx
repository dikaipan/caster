'use client';

import { AlertCircle, CheckCircle2, Circle, Clock, Wrench } from 'lucide-react';

interface CassetteInfo {
  id: string;
  serialNumber: string;
  status: string;
  cassetteType?: {
    typeCode?: string;
    typeName?: string;
  };
  customerBank?: {
    bankName?: string;
  };
  isInProcess?: boolean;
  availabilityInfo?: {
    activeTicket?: {
      ticketNumber: string;
      status: string;
    };
    activePM?: {
      pmNumber: string;
      status: string;
    };
  };
}

interface CassetteInfoCardProps {
  cassetteInfo: CassetteInfo | null;
  error?: string;
  cassetteSerialNumber: string;
  searchMode: 'cassette' | 'machine';
}

export default function CassetteInfoCard({
  cassetteInfo,
  error,
  cassetteSerialNumber,
  searchMode,
}: CassetteInfoCardProps) {
  // Show error state
  if (cassetteSerialNumber.trim() && error && searchMode === 'cassette') {
    return (
      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Show cassette info if found
  if (cassetteInfo) {
    // In process state (has active ticket/PM or in repair)
    if (cassetteInfo.isInProcess) {
      return (
        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                Kaset Ditemukan - Sedang Dalam Proses
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-orange-700 dark:text-orange-300 font-medium">Serial Number:</span>
                  <p className="text-orange-900 dark:text-orange-100 font-mono">{cassetteInfo.serialNumber}</p>
                </div>
                <div>
                  <span className="text-orange-700 dark:text-orange-300 font-medium">Tipe:</span>
                  <p className="text-orange-900 dark:text-orange-100">
                    {cassetteInfo.cassetteType?.typeCode || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-orange-700 dark:text-orange-300 font-medium">Bank:</span>
                  <p className="text-orange-900 dark:text-orange-100">
                    {cassetteInfo.customerBank?.bankName || 'N/A'}
                  </p>
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
                Kaset ini tidak dapat dipilih karena sedang dalam proses. Silakan tutup atau selesaikan proses yang
                ada terlebih dahulu.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Success state (cassette found and available)
    return (
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
                <p className="text-green-900 dark:text-green-100">
                  {cassetteInfo.cassetteType?.typeCode || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300 font-medium">Bank:</span>
                <p className="text-green-900 dark:text-green-100">
                  {cassetteInfo.customerBank?.bankName || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300 font-medium">Status:</span>
                <p className="text-green-900 dark:text-green-100 font-semibold">{cassetteInfo.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no cassette info, no error)
  return (
    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
      <Circle className="h-4 w-4" />
      Masukkan atau scan Serial Number kaset
    </p>
  );
}

