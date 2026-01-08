'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Bank {
  id: string;
  bankCode: string;
  bankName: string;
}

interface Pengelola {
  id: string;
  pengelolaCode: string;
  companyName: string;
}

interface CassetteType {
  id: string;
  typeCode: string;
  machineType: string; // SR or VS - machine compatibility
  description?: string;
}

export default function AddMachineDialog({ open, onOpenChange, onSuccess }: AddMachineDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  const [cassetteTypes, setCassetteTypes] = useState<CassetteType[]>([]);
  
  // Machine form data
  const [machineData, setMachineData] = useState({
    customerBankId: '',
    pengelolaId: '',
    machineCode: '',
    modelName: '',
    serialNumberManufacturer: '',
    physicalLocation: '',
    branchCode: '',
    city: '',
    province: '',
    installationDate: '',
    currentWsid: '',
    notes: '',
  });

  // Cassettes data (10 cassettes)
  const [cassettes, setCassettes] = useState<Array<{
    serialNumber: string;
    cassetteTypeId: string;
    usageType: 'MAIN' | 'BACKUP';
    notes: string;
  }>>(
    Array(10).fill(null).map((_, index) => ({
      serialNumber: '',
      cassetteTypeId: '',
      usageType: index < 5 ? 'MAIN' : 'BACKUP',
      notes: '',
    }))
  );

  useEffect(() => {
    if (open) {
      fetchDropdownData();
    }
  }, [open]);

  // Auto-detect cassette code from serial number
  const detectCassetteType = (serialNumber: string): string => {
    if (!serialNumber || !cassetteTypes.length) return '';
    
    const snUpper = serialNumber.toUpperCase();
    
    // Try to find cassette code in serial number
    for (const type of cassetteTypes) {
      const typeCodeUpper = type.typeCode.toUpperCase();
      
      // Check if serial number contains the cassette code
      if (snUpper.includes(typeCodeUpper)) {
        console.log(`🔍 Auto-detected: ${serialNumber} → Code: ${type.typeCode} (Machine Type: ${type.machineType})`);
        return type.id;
      }
    }
    
    console.log(`⚠️ Could not auto-detect cassette code for: ${serialNumber}`);
    return '';
  };

  const fetchDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      console.log('🔄 Fetching dropdown data...');
      const [banksRes, pengelolaRes, typesRes] = await Promise.all([
        api.get('/banks'),
        api.get('/pengelola'),
        api.get('/cassettes/types'),
      ]);

      console.log('📊 Banks response:', banksRes.data);
      console.log('📊 Pengelola response:', pengelolaRes.data);
      console.log('📊 Cassette types response:', typesRes.data);

      const banksData = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.data || [];
      const pengelolaData = Array.isArray(pengelolaRes.data) ? pengelolaRes.data : pengelolaRes.data?.data || [];
      const typesData = Array.isArray(typesRes.data) ? typesRes.data : typesRes.data?.data || [];

      console.log('✅ Banks count:', banksData.length);
      console.log('✅ Pengelola count:', pengelolaData.length);
      console.log('✅ Cassette types count:', typesData.length);

      setBanks(banksData);
      setPengelola(pengelolaData);
      setCassetteTypes(typesData);
    } catch (error) {
      console.error('❌ Error fetching dropdown data:', error);
      alert('Error loading dropdown data. Please check console.');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create machine first
      const machineResponse = await api.post('/machines', machineData);
      const createdMachine = machineResponse.data;

      console.log('✅ Machine created:', createdMachine);

      // 2. Create all 10 cassettes for this machine
      const cassettePromises = cassettes
        .filter(c => c.serialNumber.trim()) // Only create if serial number is filled
        .map(cassette =>
          api.post('/cassettes', {
            serialNumber: cassette.serialNumber,
            cassetteTypeId: cassette.cassetteTypeId,
            customerBankId: machineData.customerBankId,
            machineId: createdMachine.id,
            usageType: cassette.usageType,
            status: 'OK',
            notes: cassette.notes,
          })
        );

      const cassetteResults = await Promise.all(cassettePromises);
      console.log(`✅ Created ${cassetteResults.length} cassettes`);

      // Show success toast (if available) or use onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating machine:', error);
      // Error will be handled by parent component or toast
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMachineData({
      customerBankId: '',
      pengelolaId: '',
      machineCode: '',
      modelName: '',
      serialNumberManufacturer: '',
      physicalLocation: '',
      branchCode: '',
      city: '',
      province: '',
      installationDate: '',
      currentWsid: '',
      notes: '',
    });
    setCassettes(
      Array(10).fill(null).map((_, index) => ({
        serialNumber: '',
        cassetteTypeId: '',
        usageType: index < 5 ? 'MAIN' : 'BACKUP',
        notes: '',
      }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plus className="h-6 w-6 text-[#2563EB] dark:text-teal-400" />
            Add New Machine & Cassettes
            {loadingDropdowns && (
              <Loader2 className="h-5 w-5 animate-spin text-[#2563EB] dark:text-teal-400" />
            )}
          </DialogTitle>
          <DialogDescription>
            Create a new machine with 10 cassettes (5 MAIN + 5 BACKUP).
            {loadingDropdowns && <span className="text-[#2563EB] dark:text-teal-400"> • Loading form data...</span>}
            {!loadingDropdowns && <span className="text-green-600 dark:text-green-400"> • Cassette code (AB/RB/URJB) will be auto-detected from Serial Number</span>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* MACHINE SECTION */}
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg border border-blue-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">Machine Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Bank */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Bank <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  required
                  disabled={loadingDropdowns}
                  value={machineData.customerBankId}
                  onChange={(e) => setMachineData({ ...machineData, customerBankId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="">
                    {loadingDropdowns ? 'Loading banks...' : banks.length === 0 ? 'No banks found' : 'Select Bank'}
                  </option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankCode} - {bank.bankName}
                    </option>
                  ))}
                </select>
                {!loadingDropdowns && banks.length === 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">⚠️ No banks available. Please add banks first.</p>
                )}
              </div>

              {/* Pengelola */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Pengelola <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  required
                  disabled={loadingDropdowns}
                  value={machineData.pengelolaId}
                  onChange={(e) => setMachineData({ ...machineData, pengelolaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="">
                    {loadingDropdowns ? 'Loading pengelola...' : pengelola.length === 0 ? 'No pengelola found' : 'Select Pengelola'}
                  </option>
                  {pengelola.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pengelolaCode} - {p.companyName}
                    </option>
                  ))}
                </select>
                {!loadingDropdowns && pengelola.length === 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">⚠️ No pengelola available. Please add pengelola first.</p>
                )}
              </div>

              {/* Serial Number Manufacturer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Serial Number (SN Mesin) <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={machineData.serialNumberManufacturer}
                  onChange={(e) => setMachineData({ ...machineData, serialNumberManufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., 74UEA43N03-069520"
                />
              </div>

              {/* Machine Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Machine Code <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={machineData.machineCode}
                  onChange={(e) => setMachineData({ ...machineData, machineCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., BNI-JKT-M001"
                />
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Model Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Select
                  value={machineData.modelName}
                  onValueChange={(value) => setMachineData({ ...machineData, modelName: value })}
                  required
                >
                  <SelectTrigger className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                    <SelectValue placeholder="Pilih model mesin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SR7500">SR7500</SelectItem>
                    <SelectItem value="SR7500VS">SR7500VS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Physical Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Physical Location <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={machineData.physicalLocation}
                  onChange={(e) => setMachineData({ ...machineData, physicalLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., BNI Cabang Sudirman"
                />
              </div>

              {/* Branch Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Branch Code
                </label>
                <input
                  type="text"
                  value={machineData.branchCode}
                  onChange={(e) => setMachineData({ ...machineData, branchCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., BNI-JKT-SUDIRMAN"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={machineData.city}
                  onChange={(e) => setMachineData({ ...machineData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., Jakarta"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={machineData.province}
                  onChange={(e) => setMachineData({ ...machineData, province: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., DKI Jakarta"
                />
              </div>

              {/* Installation Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Installation Date
                </label>
                <input
                  type="date"
                  value={machineData.installationDate}
                  onChange={(e) => setMachineData({ ...machineData, installationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>

              {/* WSID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  WSID (Optional)
                </label>
                <input
                  type="text"
                  value={machineData.currentWsid}
                  onChange={(e) => setMachineData({ ...machineData, currentWsid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="e.g., WS-BNI-JKT-001"
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={machineData.notes}
                  onChange={(e) => setMachineData({ ...machineData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          {/* CASSETTES SECTION */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg border border-green-200 dark:border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Cassettes (10 Total)</h3>
              <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs max-w-md">
                <p className="font-semibold text-[#2563EB] dark:text-teal-400 mb-1">ℹ️ Cassette Info:</p>
                <ul className="text-[#1E40AF] dark:text-slate-300 space-y-1">
                  <li>• <strong>Code:</strong> AB, RB, atau URJB (auto-detected dari SN)</li>
                  <li>• <strong>Machine Type:</strong> SR atau VS (kompatibilitas mesin)</li>
                  <li>• <strong>Contoh:</strong> AB → untuk mesin VS, URJB → untuk mesin SR</li>
                </ul>
              </div>
            </div>
            
            {/* MAIN Cassettes */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-green-700 dark:text-green-400 mb-3">MAIN Cassettes (5)</h4>
              <div className="space-y-3">
                {cassettes.slice(0, 5).map((cassette, index) => (
                  <div key={`main-${index}`} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 dark:bg-green-500 text-white text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Serial Number <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cassette.serialNumber}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index].serialNumber = e.target.value;
                          
                          // Auto-detect cassette type from serial number
                          const detectedTypeId = detectCassetteType(e.target.value);
                          if (detectedTypeId) {
                            newCassettes[index].cassetteTypeId = detectedTypeId;
                          }
                          
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="e.g., 76UWAB2SW754319"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Cassette Code <span className="text-red-500 dark:text-red-400">*</span>
                        {cassette.cassetteTypeId && cassette.serialNumber && (
                          <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">✓ Auto-detected</span>
                        )}
                      </label>
                      <select
                        required
                        disabled={loadingDropdowns}
                        value={cassette.cassetteTypeId}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index].cassetteTypeId = e.target.value;
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 text-sm disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      >
                        <option value="">
                          {loadingDropdowns ? 'Loading...' : cassetteTypes.length === 0 ? 'No types' : 'Select Code'}
                        </option>
                        {cassetteTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.typeCode} (Machine Type: {type.machineType})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={cassette.notes}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index].notes = e.target.value;
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BACKUP Cassettes */}
            <div>
              <h4 className="text-md font-semibold text-sky-700 dark:text-sky-400 mb-3">BACKUP Cassettes (5)</h4>
              <div className="space-y-3">
                {cassettes.slice(5, 10).map((cassette, index) => (
                  <div key={`backup-${index}`} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0EA5E9] dark:bg-cyan-500 text-white text-sm font-bold">
                        {index + 6}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Serial Number <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cassette.serialNumber}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index + 5].serialNumber = e.target.value;
                          
                          // Auto-detect cassette type from serial number
                          const detectedTypeId = detectCassetteType(e.target.value);
                          if (detectedTypeId) {
                            newCassettes[index + 5].cassetteTypeId = detectedTypeId;
                          }
                          
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="e.g., 76UWRB2SB894550"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Cassette Code <span className="text-red-500 dark:text-red-400">*</span>
                        {cassette.cassetteTypeId && cassette.serialNumber && (
                          <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">✓ Auto-detected</span>
                        )}
                      </label>
                      <select
                        required
                        disabled={loadingDropdowns}
                        value={cassette.cassetteTypeId}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index + 5].cassetteTypeId = e.target.value;
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 text-sm disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      >
                        <option value="">
                          {loadingDropdowns ? 'Loading...' : cassetteTypes.length === 0 ? 'No types' : 'Select Code'}
                        </option>
                        {cassetteTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.typeCode} (Machine Type: {type.machineType})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={cassette.notes}
                        onChange={(e) => {
                          const newCassettes = [...cassettes];
                          newCassettes[index + 5].notes = e.target.value;
                          setCassettes(newCassettes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-teal-600 dark:to-cyan-600 dark:hover:from-teal-700 dark:hover:to-cyan-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Machine & Cassettes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

