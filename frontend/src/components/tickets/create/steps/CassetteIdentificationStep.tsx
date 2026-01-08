'use client';

import { Database, Cpu, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ScanBarcode, AlertCircle } from 'lucide-react';
import CassetteInfoCard from '../CassetteInfoCard';
import MachineSearchResults from '../MachineSearchResults';
import CassetteSelectionList from '../CassetteSelectionList';
import { Loader2 } from 'lucide-react';

interface Bank {
  id: string;
  bankName: string;
}

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

interface CassetteIdentificationStepProps {
  selectedBankId: string | null;
  banks: Bank[];
  user: any;
  searchMode: 'cassette' | 'machine';
  cassetteSerialNumber: string;
  machineSN: string;
  cassetteInfo: any;
  error: string;
  machineSearchResults: any;
  selectedCassettes: Cassette[];
  cassettesAvailability: Record<string, any>;
  MAX_CASSETTES: number;
  searchingMachine: boolean;
  searchedMachines: any[];
  onBankChange: (bankId: string | null) => void;
  onSearchModeChange: (mode: 'cassette' | 'machine') => void;
  onCassetteSerialNumberChange: (value: string) => void;
  onMachineSNChange: (value: string) => void;
  onToggleCassette: (cassette: Cassette) => void;
  onClearSearch: () => void;
  onShowScanner: () => void;
  onResetAll: () => void;
  onProceedToStep2: () => void;
  canProceedToStep2: boolean;
}

export default function CassetteIdentificationStep({
  selectedBankId,
  banks,
  user,
  searchMode,
  cassetteSerialNumber,
  machineSN,
  cassetteInfo,
  error,
  machineSearchResults,
  selectedCassettes,
  cassettesAvailability,
  MAX_CASSETTES,
  searchingMachine,
  onBankChange,
  onSearchModeChange,
  onCassetteSerialNumberChange,
  onMachineSNChange,
  onToggleCassette,
  onClearSearch,
  onShowScanner,
  onResetAll,
  onProceedToStep2,
  canProceedToStep2,
}: CassetteIdentificationStepProps) {
  // Ensure banks is always an array
  const safeBanks = Array.isArray(banks) ? banks : [];

  const handleBankChange = (value: string) => {
    onBankChange(value || null);
  };

  const handleSearchModeChange = (value: string) => {
    onSearchModeChange(value as 'cassette' | 'machine');
  };

  return (
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
            onValueChange={handleBankChange}
            required
            disabled={safeBanks.length === 1 && selectedBankId === safeBanks[0]?.id}
          >
            <SelectTrigger id="bank">
              <SelectValue
                placeholder={
                  safeBanks.length === 0
                    ? user?.userType === 'PENGELOLA'
                      ? 'Tidak ada bank yang di-assign'
                      : 'Pilih Bank'
                    : safeBanks.length === 1 && selectedBankId === safeBanks[0]?.id
                      ? safeBanks[0]?.bankName
                      : 'Pilih Bank'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {safeBanks.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                  {user?.userType === 'PENGELOLA'
                    ? 'Tidak ada bank yang di-assign ke pengelola Anda'
                    : 'Tidak ada bank tersedia'}
                </div>
              ) : (
                safeBanks.map((bank) => (
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

        <Tabs
          value={searchMode}
          onValueChange={handleSearchModeChange}
        >
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
              <Label
                htmlFor="cassetteSerialNumber"
                className="text-base font-semibold text-gray-900 dark:text-slate-100"
              >
                Serial Number Kaset <span className="text-red-600 dark:text-red-400 font-bold">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cassetteSerialNumber"
                  placeholder="Contoh: RB-BNI-0001"
                  value={cassetteSerialNumber}
                  onChange={(e) => onCassetteSerialNumberChange(e.target.value)}
                  required
                  className="flex-1 font-mono text-lg h-12 border-2 border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500"
                />
                <Button type="button" variant="outline" size="lg" onClick={onShowScanner} className="px-6">
                  <ScanBarcode className="h-5 w-5 mr-2" />
                  Scan
                </Button>
              </div>

              <CassetteInfoCard
                cassetteInfo={cassetteInfo}
                error={error}
                cassetteSerialNumber={cassetteSerialNumber}
                searchMode={searchMode}
              />
            </div>
          </TabsContent>

          {/* Tab: Search by Machine SN */}
          <TabsContent value="machine" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label
                htmlFor="machineSN"
                className="text-base font-semibold text-gray-900 dark:text-slate-100"
              >
                Serial Number Mesin (6 digit terakhir)
              </Label>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="machineSN"
                    placeholder="Contoh: 071110"
                    value={machineSN}
                    onChange={(e) => onMachineSNChange(e.target.value)}
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
                  <Button type="button" variant="outline" size="sm" onClick={onClearSearch} className="w-full">
                    Cari Mesin Lain
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="text-muted-foreground">Kaset otomatis tampil saat Anda mengetik</p>
                <p className="font-medium text-primary">
                  {selectedCassettes.length}/{MAX_CASSETTES} dipilih
                </p>
              </div>

              {/* Machine Search Results */}
              <MachineSearchResults
                machineSearchResults={machineSearchResults}
                selectedCassettes={selectedCassettes}
                cassettesAvailability={cassettesAvailability}
                MAX_CASSETTES={MAX_CASSETTES}
                onToggleCassette={onToggleCassette}
                onClearSearch={onClearSearch}
              />

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
                <Button type="button" variant="outline" size="sm" onClick={onResetAll}>
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
            onClick={onProceedToStep2}
            disabled={!canProceedToStep2}
            className="min-w-[200px]"
          >
            Lanjut ke Detail Masalah
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

