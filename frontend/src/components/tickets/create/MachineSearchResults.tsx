'use client';

import { Cpu, AlertCircle, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Cassette {
  id: string;
  serialNumber: string;
  status: string;
  cassetteType?: {
    typeCode?: string;
  };
  machine?: {
    machineType?: string;
  };
  customerBank?: {
    bankName?: string;
  };
}

interface Machine {
  id: string;
  serialNumber: string;
  bank?: {
    bankName?: string;
  };
  location?: string;
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

interface MachineSearchResultsProps {
  machineSearchResults: {
    machines?: Machine[];
    cassettes?: Cassette[];
  } | null;
  selectedCassettes: Cassette[];
  cassettesAvailability: Record<string, AvailabilityInfo>;
  MAX_CASSETTES: number;
  onToggleCassette: (cassette: Cassette) => void;
  onClearSearch: () => void;
}

export default function MachineSearchResults({
  machineSearchResults,
  selectedCassettes,
  cassettesAvailability,
  MAX_CASSETTES,
  onToggleCassette,
  onClearSearch,
}: MachineSearchResultsProps) {
  if (!machineSearchResults) {
    return null;
  }

  const handleToggle = (cassette: Cassette) => {
    const availabilityInfo = cassettesAvailability[cassette.id];
    const hasActiveTicket = !!availabilityInfo?.activeTicket;
    const hasActivePM = !!availabilityInfo?.activePM;
    const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(
      cassette.status,
    );

    if (hasActiveTicket || hasActivePM || statusInRepair) {
      return; // Prevent selection
    }

    onToggleCassette(cassette);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Machine Info */}
      {machineSearchResults.machines && machineSearchResults.machines.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <p className="font-semibold text-gray-900 dark:text-slate-100">Mesin Ditemukan</p>
            </div>
            <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-2 py-1 rounded font-medium">
              {machineSearchResults.cassettes?.length || 0} kaset tersedia
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {machineSearchResults.machines.map((machine) => (
              <div
                key={machine.id}
                className="p-3 bg-white dark:bg-slate-900/50 rounded border border-gray-300 dark:border-slate-600 text-sm"
              >
                <p className="font-mono font-semibold text-gray-900 dark:text-slate-100">{machine.serialNumber}</p>
                <p className="text-gray-700 dark:text-slate-300">
                  {machine.bank?.bankName} - {machine.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cassette List with Checkboxes */}
      {machineSearchResults.cassettes && machineSearchResults.cassettes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-slate-100">Pilih Kaset dari Mesin Ini</p>
            {selectedCassettes.length >= MAX_CASSETTES && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 px-2 py-1 rounded font-medium">
                Maksimal tercapai
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {machineSearchResults.cassettes.map((cassette) => {
              const isSelected = selectedCassettes.some((c) => c.id === cassette.id);
              const availabilityInfo = cassettesAvailability[cassette.id];

              // Check if cassette is in any active process
              const hasActiveTicket = !!availabilityInfo?.activeTicket;
              const hasActivePM = !!availabilityInfo?.activePM;
              const statusInRepair = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(
                cassette.status,
              );

              // Show "Dalam Proses" badge if any of these is true
              const isInProcess = hasActiveTicket || hasActivePM || statusInRepair;

              // Disable if: max reached (and not selected), OR cassette is in process
              const isDisabled = (!isSelected && selectedCassettes.length >= MAX_CASSETTES) || isInProcess;

              return (
                <div
                  key={cassette.id}
                  onClick={() => !isDisabled && handleToggle(cassette)}
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
                        onChange={() => !isDisabled && handleToggle(cassette)}
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
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            cassette.status === 'OK'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : cassette.status === 'BAD'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                : cassette.status === 'SCRAPPED'
                                  ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          }`}
                        >
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
                                  {availabilityInfo.activeTicket!.ticketNumber}
                                </p>
                                <p className="text-orange-600 dark:text-orange-500 text-[10px] mt-0.5">
                                  Status: {availabilityInfo.activeTicket!.status}
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
                                  {availabilityInfo.activePM!.pmNumber}
                                </p>
                                <p className="text-orange-600 dark:text-orange-500 text-[10px] mt-0.5">
                                  Status: {availabilityInfo.activePM!.status}
                                </p>
                              </div>
                            )}
                            {cassette.status === 'SCRAPPED' && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 text-xs rounded-full">
                                <AlertCircle className="h-3 w-3" />
                                <span>Kaset SCRAPPED - Tidak Dapat Digunakan</span>
                              </div>
                            )}
                            {statusInRepair &&
                              !hasActiveTicket &&
                              !hasActivePM &&
                              cassette.status !== 'SCRAPPED' && (
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
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-center">
          <p className="text-gray-600 dark:text-slate-400">Tidak ada kaset ditemukan untuk mesin ini</p>
        </div>
      )}
    </div>
  );
}

