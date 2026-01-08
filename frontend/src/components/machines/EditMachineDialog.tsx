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
import { Loader2, Edit } from 'lucide-react';
import api from '@/lib/api';

interface EditMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  machine: any;
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

export default function EditMachineDialog({ open, onOpenChange, onSuccess, machine }: EditMachineDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  
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
    status: 'OPERATIONAL',
    notes: '',
  });

  useEffect(() => {
    if (open && machine) {
      // Load machine data
      setMachineData({
        customerBankId: machine.customerBankId || '',
        pengelolaId: machine.pengelolaId || '',
        machineCode: machine.machineCode || '',
        modelName: machine.modelName || '',
        serialNumberManufacturer: machine.serialNumberManufacturer || '',
        physicalLocation: machine.physicalLocation || '',
        branchCode: machine.branchCode || '',
        city: machine.city || '',
        province: machine.province || '',
        installationDate: machine.installationDate ? machine.installationDate.split('T')[0] : '',
        currentWsid: machine.currentWsid || '',
        status: machine.status || 'OPERATIONAL',
        notes: machine.notes || '',
      });
      fetchDropdownData();
    }
  }, [open, machine]);

  const fetchDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const [banksRes, pengelolaRes] = await Promise.all([
        api.get('/banks'),
        api.get('/pengelola'),
      ]);

      const banksData = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.data || [];
      const pengelolaData = Array.isArray(pengelolaRes.data) ? pengelolaRes.data : pengelolaRes.data?.data || [];

      setBanks(banksData);
      setPengelola(pengelolaData);
    } catch (error) {
      console.error('❌ Error fetching dropdown data:', error);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/machines/${machine.id}`, machineData);

      alert('✅ Machine updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating machine:', error);
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit className="h-6 w-6 text-[#2563EB] dark:text-teal-400" />
            Edit Machine
            {loadingDropdowns && (
              <Loader2 className="h-5 w-5 animate-spin text-[#2563EB] dark:text-teal-400" />
            )}
          </DialogTitle>
          <DialogDescription>
            Update machine information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="">Select Bank</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankCode} - {bank.bankName}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="">Select Pengelola</option>
                  {pengelola.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pengelolaCode} - {p.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Serial Number (SN Mesin)
                </label>
                <input
                  type="text"
                  disabled
                  value={machineData.serialNumberManufacturer}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                  title="Serial Number cannot be changed"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Serial Number is permanent and cannot be changed</p>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                  WSID
                </label>
                <input
                  type="text"
                  value={machineData.currentWsid}
                  onChange={(e) => setMachineData({ ...machineData, currentWsid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Status <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  required
                  value={machineData.status}
                  onChange={(e) => setMachineData({ ...machineData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="OPERATIONAL">Operational</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="UNDER_REPAIR">Under Repair</option>
                  <option value="DECOMMISSIONED">Decommissioned</option>
                </select>
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={machineData.notes}
                  onChange={(e) => setMachineData({ ...machineData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  rows={3}
                />
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
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Machine
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

