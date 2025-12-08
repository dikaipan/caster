'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Monitor,
  Disc,
  Building2,
  Search,
} from 'lucide-react';

export default function AssignmentsTab() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('machines');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Machines assignment
  const [machines, setMachines] = useState<any[]>([]);
  const [pengelola, setPengelola] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [isAssignMachineDialogOpen, setIsAssignMachineDialogOpen] = useState(false);
  const [assignMachineForm, setAssignMachineForm] = useState({ pengelolaId: '' });
  const [machineSearch, setMachineSearch] = useState('');

  // Cassettes assignment (through bank-pengelola)
  const [cassettes, setCassettes] = useState<any[]>([]);
  const [bankPengelolaAssignments, setBankPengelolaAssignments] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedPengelolaForBank, setSelectedPengelolaForBank] = useState('');
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState('');
  const [machinesForBranch, setMachinesForBranch] = useState<any[]>([]);
  const [assignedCassetteCount, setAssignedCassetteCount] = useState<string>('');
  const [isAssignBankPengelolaDialogOpen, setIsAssignBankPengelolaDialogOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
      fetchPengelola();
      fetchBanks();
      if (activeTab === 'machines') {
        fetchMachines();
      } else if (activeTab === 'cassettes') {
        fetchCassettes();
        fetchBankPengelolaAssignments();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, user?.role]);

  useEffect(() => {
    // Fetch machines when bank is selected to show available branches
    if (selectedBank) {
      const fetchMachinesForBank = async () => {
        try {
          const response = await api.get('/machines');
          const bankMachines = response.data.filter((m: any) => m.customerBankId === selectedBank);
          setMachinesForBranch(bankMachines);
          
          // Extract unique branch codes
          const branches = Array.from(new Set(
            bankMachines
              .map((m: any) => m.branchCode)
              .filter((b: string) => b)
          )) as string[];
          
          // Pre-fill assigned branches if editing existing assignment
          if (bankPengelolaAssignments.length > 0) {
            const existing = bankPengelolaAssignments.find(
              (a) => a.customerBankId === selectedBank && a.pengelolaId === selectedPengelolaForBank
            );
            if (existing && existing.assignedBranches) {
              setAssignedBranches(Array.isArray(existing.assignedBranches) ? existing.assignedBranches : []);
            }
          }
        } catch (err) {
          console.error('Error fetching machines:', err);
        }
      };
      fetchMachinesForBank();
    } else {
      setMachinesForBranch([]);
      setAssignedBranches([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBank, bankPengelolaAssignments, selectedPengelolaForBank]);

  const fetchMachines = async () => {
    try {
      const params = machineSearch.trim() ? { params: { search: machineSearch.trim() } } : {};
      const response = await api.get('/machines', params);
      setMachines(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching machines:', err);
      setMachines([]);
    }
  };

  const fetchPengelola = async () => {
    try {
      const response = await api.get('/pengelola');
      setPengelola(response.data);
    } catch (err: any) {
      console.error('Error fetching pengelola:', err);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (err: any) {
      console.error('Error fetching banks:', err);
    }
  };

  const fetchCassettes = async () => {
    try {
      const response = await api.get('/cassettes');
      setCassettes(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching cassettes:', err);
      setCassettes([]); // Ensure cassettes is always an array even on error
    }
  };

  const fetchBankPengelolaAssignments = async () => {
    try {
      // Get all banks with their pengelola assignments
      const banksResponse = await api.get('/banks');
      const assignments: any[] = [];
      
      for (const bank of banksResponse.data) {
        if (bank.pengelolaAssignments && bank.pengelolaAssignments.length > 0) {
          bank.pengelolaAssignments.forEach((assignment: any) => {
            assignments.push({
              ...assignment,
              pengelola: assignment.pengelola || {},
              bank: bank,
              customerBank: bank,
            });
          });
        }
      }
      
      setBankPengelolaAssignments(assignments);
    } catch (err: any) {
      console.error('Error fetching bank-pengelola assignments:', err);
    }
  };

  const handleAssignMachine = async () => {
    if (!selectedMachine || !assignMachineForm.pengelolaId) {
      setError('Please select a pengelola');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.patch(`/machines/${selectedMachine.id}`, {
        pengelolaId: assignMachineForm.pengelolaId,
      });
      setSuccess('Machine assigned to pengelola successfully!');
      setIsAssignMachineDialogOpen(false);
      setSelectedMachine(null);
      setAssignMachineForm({ pengelolaId: '' });
      fetchMachines();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign machine to pengelola');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBankPengelola = async () => {
    if (!selectedBank || !selectedPengelolaForBank) {
      setError('Please select both bank and pengelola');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Check if assignment already exists
      const existing = bankPengelolaAssignments.find(
        (a) => a.customerBankId === selectedBank && a.pengelolaId === selectedPengelolaForBank
      );

      if (existing) {
        setError('This bank-pengelola assignment already exists');
        setLoading(false);
        return;
      }

      // Create bank-pengelola assignment with assigned branches and cassette count
      const payload: any = {};
      if (assignedBranches.length > 0) {
        payload.assignedBranches = assignedBranches;
      }
      if (assignedCassetteCount && assignedCassetteCount.trim() !== '' && Number(assignedCassetteCount) > 0) {
        payload.assignedCassetteCount = Number(assignedCassetteCount);
      }

      await api.post(`/banks/${selectedBank}/pengelola/${selectedPengelolaForBank}`, payload);
      
      let infoText = '';
      if (assignedCassetteCount && assignedCassetteCount.trim() !== '' && Number(assignedCassetteCount) > 0) {
        infoText = ` dengan ${assignedCassetteCount} kaset`;
      }
      if (assignedBranches.length > 0) {
        infoText += ` untuk branch: ${assignedBranches.join(', ')}`;
      } else if (!assignedCassetteCount || assignedCassetteCount.trim() === '') {
        infoText = ' (semua kaset dari bank)';
      }
      
      setSuccess(`Bank assigned to pengelola successfully${infoText}!`);
      setIsAssignBankPengelolaDialogOpen(false);
      setSelectedBank('');
      setSelectedPengelolaForBank('');
      setAssignedBranches([]);
      setBranchInput('');
      setAssignedCassetteCount('');
      fetchBankPengelolaAssignments();
      fetchCassettes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign bank to pengelola');
    } finally {
      setLoading(false);
    }
  };

  const addBranch = () => {
    if (branchInput.trim() && !assignedBranches.includes(branchInput.trim())) {
      setAssignedBranches([...assignedBranches, branchInput.trim()]);
      setBranchInput('');
    }
  };

  const removeBranch = (branch: string) => {
    setAssignedBranches(assignedBranches.filter((b) => b !== branch));
  };

  const openAssignMachineDialog = (machine: any) => {
    setSelectedMachine(machine);
    setAssignMachineForm({ pengelolaId: machine.pengelolaId || '' });
    setIsAssignMachineDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="machines" className="flex items-center space-x-2">
            <Monitor className="h-4 w-4" />
            <span>Assign Machines</span>
          </TabsTrigger>
          <TabsTrigger value="cassettes" className="flex items-center space-x-2">
            <Disc className="h-4 w-4" />
            <span>Assign Cassettes (via Bank)</span>
          </TabsTrigger>
        </TabsList>

        {/* Assign Machines Tab */}
        <TabsContent value="machines" className="mt-6">
          <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Assign Machines to Pengelola</span>
              </CardTitle>
              <CardDescription>
                Assign individual machines to pengelola for maintenance and service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine-search">Search Machines</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="machine-search"
                      placeholder="Search by Serial Number, Machine Code, or Branch Code..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={fetchMachines} variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {machines.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-slate-600" />
                  <p>No machines found</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/95 dark:bg-slate-700/95 backdrop-blur-sm sticky top-0 z-10">
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Serial Number</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Machine Code</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Bank</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Current Pengelola</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Branch</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                      {machines && machines.length > 0 ? machines.map((machine, index) => (
                        <tr key={machine.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                        }`}>
                          <td className="p-3 font-mono text-gray-900 dark:text-slate-100">{machine.serialNumberManufacturer}</td>
                          <td className="p-3 text-gray-900 dark:text-slate-100">{machine.machineCode || 'N/A'}</td>
                          <td className="p-3 text-gray-900 dark:text-slate-100">{machine.customerBank?.bankName || 'N/A'}</td>
                          <td className="p-3">
                            {machine.pengelola?.companyName ? (
                              <span className="text-gray-900 dark:text-slate-100">{machine.pengelola.companyName}</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">Not Assigned</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-900 dark:text-slate-100">{machine.branchCode || 'N/A'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                machine.status === 'OPERATIONAL'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : machine.status === 'MAINTENANCE'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              }`}
                            >
                              {machine.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignMachineDialog(machine)}
                            >
                              {machine.pengelola ? 'Reassign' : 'Assign'}
                            </Button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Monitor className="h-12 w-12 text-gray-300 dark:text-slate-600" />
                              <p>No machines found</p>
                              <p className="text-sm">Try adjusting your search or add new machines</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assign Cassettes Tab */}
        <TabsContent value="cassettes" className="mt-6">
          <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Disc className="h-5 w-5" />
                    <span>Assign Cassettes to Pengelola (via Bank Assignment)</span>
                  </CardTitle>
                  <CardDescription>
                    Assign banks to pengelola. Anda dapat membatasi pengelola untuk mengelola branch tertentu saja, atau biarkan kosong untuk mengelola semua branch.
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAssignBankPengelolaDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
                  <Building2 className="h-4 w-4 mr-2" />
                  Assign Bank to Pengelola
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Cassettes are assigned to pengelola through bank assignments. 
                  When you assign a bank to a pengelola, all cassettes belonging to that bank become accessible to the pengelola.
                </p>
              </div>

              {bankPengelolaAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-slate-600" />
                  <p>No bank-pengelola assignments found</p>
                  <p className="text-sm mt-2">Click &quot;Assign Bank to Pengelola&quot; to create an assignment</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/95 dark:bg-slate-700/95 backdrop-blur-sm sticky top-0 z-10">
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Bank</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Pengelola</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Assignment Info</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Contract Number</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Current Cassettes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                      {bankPengelolaAssignments.map((assignment, index) => {
                        const bankCassettes = Array.isArray(cassettes) 
                          ? cassettes.filter(
                              (c) => c.customerBankId === (assignment.customerBankId || assignment.bank?.id || assignment.customerBank?.id)
                            )
                          : [];
                        const branches = assignment.assignedBranches
                          ? (Array.isArray(assignment.assignedBranches) ? assignment.assignedBranches : [])
                          : [];
                        
                        // Parse assignedCassetteCount from notes
                        let assignedCount = 0;
                        try {
                          if (assignment.notes) {
                            const notesData = JSON.parse(assignment.notes);
                            assignedCount = notesData.assignedCassetteCount || 0;
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }
                        
                        return (
                          <tr key={assignment.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-800/50'
                          }`}>
                            <td className="p-3 text-gray-900 dark:text-slate-100">
                              {assignment.bank?.bankName || assignment.customerBank?.bankName || 'N/A'}
                            </td>
                            <td className="p-3 text-gray-900 dark:text-slate-100">
                              {assignment.pengelola?.companyName || 'N/A'}
                            </td>
                            <td className="p-3 text-gray-900 dark:text-slate-100">
                              {assignedCount > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    Maksimal: {assignedCount} kaset
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-slate-400">
                                    Saat ini: {bankCassettes.length} kaset
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600 dark:text-slate-400">Semua kaset</span>
                              )}
                              {branches.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs text-gray-600 dark:text-slate-400">Branches:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {branches.map((branch: string) => (
                                      <span key={branch} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded text-xs">
                                        {branch}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-gray-900 dark:text-slate-100">{assignment.contractNumber || 'N/A'}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  assignment.status === 'ACTIVE'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {assignment.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-gray-900 dark:text-slate-100">{bankCassettes.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Machine Dialog */}
      <Dialog open={isAssignMachineDialogOpen} onOpenChange={setIsAssignMachineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Machine to Pengelola</DialogTitle>
            <DialogDescription>
              Select a pengelola to assign this machine to. The pengelola will be responsible for maintenance and service.
            </DialogDescription>
          </DialogHeader>
          {selectedMachine && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-slate-100">Machine Details:</p>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Serial: <span className="font-mono text-gray-900 dark:text-slate-100">{selectedMachine.serialNumberManufacturer}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Code: {selectedMachine.machineCode || 'N/A'}
                </p>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Bank: {selectedMachine.customerBank?.bankName || 'N/A'}
                </p>
                {selectedMachine.pengelola && (
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    Current Pengelola: <span className="font-medium text-gray-900 dark:text-slate-100">{selectedMachine.pengelola.companyName}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pengelola-select">Select Pengelola *</Label>
                <Select
                  value={assignMachineForm.pengelolaId}
                  onValueChange={(value) => setAssignMachineForm({ pengelolaId: value })}
                >
                  <SelectTrigger id="pengelola-select">
                    <SelectValue placeholder="Choose a pengelola..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pengelola.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.companyName} ({p.pengelolaCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignMachineDialogOpen(false);
                setSelectedMachine(null);
                setAssignMachineForm({ pengelolaId: '' });
                setError('');
                setSuccess('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignMachine} disabled={loading || !assignMachineForm.pengelolaId} className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Machine'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Bank to Pengelola Dialog */}
      <Dialog open={isAssignBankPengelolaDialogOpen} onOpenChange={setIsAssignBankPengelolaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Bank to Pengelola</DialogTitle>
            <DialogDescription>
              Assign a bank to a pengelola. All cassettes belonging to this bank will be accessible to the pengelola.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-select">Select Bank *</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger id="bank-select">
                  <SelectValue placeholder="Choose a bank..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName} ({bank.bankCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pengelola-bank-select">Select Pengelola *</Label>
              <Select value={selectedPengelolaForBank} onValueChange={setSelectedPengelolaForBank}>
                <SelectTrigger id="pengelola-bank-select">
                  <SelectValue placeholder="Choose a pengelola..." />
                </SelectTrigger>
                <SelectContent>
                  {pengelola.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.companyName} ({p.pengelolaCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBank && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cassette-count">Jumlah Kaset yang Di-assign (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Masukkan jumlah kaset yang akan di-assign ke pengelola ini. Contoh: 700 kaset. Kosongkan jika pengelola mengelola semua kaset dari bank.
                  </p>
                  <Input
                    id="cassette-count"
                    type="number"
                    min="1"
                    placeholder="e.g., 700"
                    value={assignedCassetteCount}
                    onChange={(e) => {
                      setAssignedCassetteCount(e.target.value);
                    }}
                    className="max-w-xs"
                  />
                  {assignedCassetteCount && Number(assignedCassetteCount) > 0 && (
                    <p className="text-xs text-blue-600">
                      Pengelola akan mengelola maksimal {assignedCassetteCount} kaset dari bank ini.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch-assignment">Assign Specific Branches (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Kosongkan jika pengelola mengelola semua branch. Isi branch codes jika pengelola hanya mengelola branch tertentu.
                  </p>
                
                  <div className="flex gap-2">
                    <Input
                      id="branch-assignment"
                      placeholder="e.g., BNI-JKT-SUDIRMAN"
                      value={branchInput}
                      onChange={(e) => setBranchInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBranch();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addBranch}>
                      Add
                    </Button>
                  </div>

                  {machinesForBranch.length > 0 && (
                    <div className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs text-gray-600 dark:text-slate-400">
                      <p className="font-semibold mb-1 text-gray-900 dark:text-slate-100">Available branches from machines:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(machinesForBranch.map((m: any) => m.branchCode).filter(Boolean))).map((branch: string) => (
                          <button
                            key={branch}
                            type="button"
                            onClick={() => {
                              if (!assignedBranches.includes(branch)) {
                                setAssignedBranches([...assignedBranches, branch]);
                              }
                            }}
                            className="px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-xs text-gray-900 dark:text-slate-100"
                          >
                            {branch}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignedBranches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignedBranches.map((branch) => (
                        <span
                          key={branch}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-sm"
                        >
                          {branch}
                          <button
                            type="button"
                            onClick={() => removeBranch(branch)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedBank && selectedPengelolaForBank && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> {pengelola.find((p) => p.id === selectedPengelolaForBank)?.companyName} akan mengelola cassettes dari{' '}
                  {banks.find((b) => b.id === selectedBank)?.bankName}
                  {assignedCassetteCount && assignedCassetteCount.trim() !== '' && Number(assignedCassetteCount) > 0
                    ? ` (maksimal ${assignedCassetteCount} kaset)`
                    : ' (semua kaset)'}
                  {assignedBranches.length > 0
                    ? ` untuk branch: ${assignedBranches.join(', ')}`
                    : ''}.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignBankPengelolaDialogOpen(false);
                setSelectedBank('');
                setSelectedPengelolaForBank('');
                setAssignedBranches([]);
                setBranchInput('');
                setAssignedCassetteCount('');
                setError('');
                setSuccess('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignBankPengelola}
              disabled={loading || !selectedBank || !selectedPengelolaForBank}
              className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Bank to Pengelola'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
