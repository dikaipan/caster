'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Monitor,
  Disc,
  Filter,
  X,
  Loader2,
  Package,
  Plus,
  Edit,
  MapPin,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import AddMachineDialog from '@/components/machines/AddMachineDialog';
import EditMachineDialog from '@/components/machines/EditMachineDialog';

export default function ResourcesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'cassettes');
  
  // Cassettes State
  const [cassettes, setCassettes] = useState<any[]>([]);
  const [loadingCassettes, setLoadingCassettes] = useState(true);
  const [cassetteSearchTerm, setCassetteSearchTerm] = useState('');
  const [cassetteStatusFilter, setCassetteStatusFilter] = useState<string>('all');
  const [cassetteCurrentPage, setCassetteCurrentPage] = useState(1);
  const [cassetteItemsPerPage, setCassetteItemsPerPage] = useState(50); // Increased from 20 to 50
  const [cassetteTotal, setCassetteTotal] = useState(0);
  const [cassetteTotalPages, setCassetteTotalPages] = useState(1);
  
  // Machines State
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [machineStatusFilter, setMachineStatusFilter] = useState<string>('all');
  const [machineCurrentPage, setMachineCurrentPage] = useState(1);
  const [machineItemsPerPage, setMachineItemsPerPage] = useState(20);
  const [machineTotal, setMachineTotal] = useState(0);
  const [machineTotalPages, setMachineTotalPages] = useState(0);
  
  // Machine Cassettes Dialog
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machineCassettes, setMachineCassettes] = useState<any[]>([]);
  const [cassetteDialogOpen, setCassetteDialogOpen] = useState(false);
  const [loadingMachineCassettes, setLoadingMachineCassettes] = useState(false);
  
  // Machine Dialogs
  const [addMachineDialogOpen, setAddMachineDialogOpen] = useState(false);
  const [editMachineDialogOpen, setEditMachineDialogOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<any>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch Cassettes with pagination
  useEffect(() => {
    const fetchCassettes = async () => {
      if (activeTab !== 'cassettes') return;
      
      try {
        setLoadingCassettes(true);
        const params: any = {
          page: cassetteCurrentPage,
          limit: cassetteItemsPerPage,
        };
        
        if (cassetteSearchTerm.trim()) {
          params.keyword = cassetteSearchTerm.trim();
        }
        
        const response = await api.get('/cassettes', { params });
        
        let allCassettes: any[] = [];
        if (Array.isArray(response.data)) {
          allCassettes = response.data;
          setCassetteTotal(response.data.length);
          setCassetteTotalPages(Math.ceil(response.data.length / cassetteItemsPerPage));
        } else if (response.data.data) {
          allCassettes = response.data.data;
          setCassetteTotal(response.data.pagination?.total || 0);
          setCassetteTotalPages(response.data.pagination?.totalPages || 1);
        }
        
        setCassettes(allCassettes);
      } catch (error) {
        console.error('Error fetching cassettes:', error);
      } finally {
        setLoadingCassettes(false);
      }
    };

    if (isAuthenticated) {
      fetchCassettes();
    }
  }, [isAuthenticated, activeTab, cassetteCurrentPage, cassetteItemsPerPage, cassetteSearchTerm]);

  // Fetch Machines
  useEffect(() => {
    const fetchMachines = async () => {
      if (activeTab !== 'machines') return;
      
      try {
        setLoadingMachines(true);
        const params: any = {
          page: machineCurrentPage,
          limit: machineItemsPerPage,
        };
        
        if (machineSearchTerm.trim()) {
          params.search = machineSearchTerm.trim();
        }
        
        const response = await api.get('/machines', { params });
        
        if (Array.isArray(response.data)) {
          setMachines(response.data);
          setMachineTotal(response.data.length);
          setMachineTotalPages(Math.ceil(response.data.length / machineItemsPerPage));
        } else {
          setMachines(response.data?.data || []);
          setMachineTotal(response.data?.pagination?.total || 0);
          setMachineTotalPages(response.data?.pagination?.totalPages || 0);
        }
      } catch (error) {
        console.error('Error fetching machines:', error);
        setMachines([]);
      } finally {
        setLoadingMachines(false);
      }
    };

    if (isAuthenticated) {
      const timeoutId = setTimeout(fetchMachines, 300); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, activeTab, machineSearchTerm, machineCurrentPage, machineItemsPerPage]);

  // Reset pagination on search/filter change
  useEffect(() => {
    setCassetteCurrentPage(1);
  }, [cassetteSearchTerm, cassetteStatusFilter]);

  useEffect(() => {
    setMachineCurrentPage(1);
  }, [machineSearchTerm, machineStatusFilter, machineItemsPerPage]);

  // Fetch cassettes for selected machine
  const fetchMachineCassettes = async (machine: any) => {
    setSelectedMachine(machine);
    setCassetteDialogOpen(true);
    setLoadingMachineCassettes(true);
    
    try {
      const response = await api.get(`/cassettes/by-machine/${machine.id}`);
      const cassetteData = response.data?.cassettes || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      
      const sortedCassettes = cassetteData.sort((a: any, b: any) => {
        if (a.usageType === 'MAIN' && b.usageType === 'BACKUP') return -1;
        if (a.usageType === 'BACKUP' && b.usageType === 'MAIN') return 1;
        return 0;
      });
      
      setMachineCassettes(sortedCassettes);
    } catch (error) {
      console.error('Error fetching cassettes:', error);
      setMachineCassettes([]);
    } finally {
      setLoadingMachineCassettes(false);
    }
  };

  const handleCloseCassetteDialog = () => {
    setCassetteDialogOpen(false);
    setSelectedMachine(null);
    setMachineCassettes([]);
  };

  const handleMachineAdded = () => {
    // Refresh machines list
    setMachineCurrentPage(1);
  };

  const handleMachineUpdated = () => {
    // Refresh machines list
    setMachineCurrentPage(1);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading resources...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Status colors
  const getCassetteStatusColor = (status: string) => {
    const colors = {
      OK: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      BAD: 'bg-rose-100 text-rose-700 border-rose-200',
      IN_TRANSIT_TO_RC: 'bg-amber-100 text-amber-700 border-amber-200',
      IN_REPAIR: 'bg-orange-100 text-orange-700 border-orange-200',
      IN_TRANSIT_TO_PENGELOLA: 'bg-purple-100 text-purple-700 border-purple-200',
      SCRAPPED: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getMachineStatusColor = (status: string) => {
    const colors = {
      OPERATIONAL: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      MAINTENANCE: 'bg-amber-100 text-amber-700 border-amber-200',
      UNDER_REPAIR: 'bg-rose-100 text-rose-700 border-rose-200',
      DECOMMISSIONED: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Filter cassettes
  const filteredCassettes = cassettes.filter((cassette) => {
    const matchesSearch = !cassetteSearchTerm.trim() || 
      cassette.serialNumber?.toLowerCase().includes(cassetteSearchTerm.toLowerCase()) ||
      cassette.cassetteType?.typeCode?.toLowerCase().includes(cassetteSearchTerm.toLowerCase()) ||
      cassette.customerBank?.bankName?.toLowerCase().includes(cassetteSearchTerm.toLowerCase());
    
    const matchesStatus = cassetteStatusFilter === 'all' || cassette.status === cassetteStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate cassettes (use filtered length for local pagination)
  const filteredCassetteTotalPages = Math.ceil(filteredCassettes.length / cassetteItemsPerPage);
  const cassetteStartIndex = (cassetteCurrentPage - 1) * cassetteItemsPerPage;
  const cassetteEndIndex = cassetteStartIndex + cassetteItemsPerPage;
  const paginatedCassettes = filteredCassettes.slice(cassetteStartIndex, cassetteEndIndex);

  // Filter machines
  const filteredMachines = machineStatusFilter === 'all' 
    ? machines 
    : machines.filter(m => m.status === machineStatusFilter);

  // Status counts
  const cassetteStatusCounts = cassettes.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const machineStatusCounts = machines.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-end flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <TrendingUp className="h-4 w-4 mr-2" />
              {cassettes.length + machines.length} Total Assets
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="cassettes" className="text-base">
            <Disc className="h-4 w-4 mr-2" />
            Cassettes ({cassettes.length})
          </TabsTrigger>
          <TabsTrigger value="machines" className="text-base">
            <Monitor className="h-4 w-4 mr-2" />
            Machines ({machines.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== CASSETTES TAB ===== */}
        <TabsContent value="cassettes" className="space-y-6">
          {/* Status Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { status: 'OK', label: 'Operational', icon: '✓', color: 'emerald' },
              { status: 'BAD', label: 'Faulty', icon: '✕', color: 'rose' },
              { status: 'IN_TRANSIT_TO_RC', label: 'In Transit', icon: '→', color: 'amber' },
              { status: 'IN_REPAIR', label: 'In Repair', icon: '⚙', color: 'orange' },
              { status: 'IN_TRANSIT_TO_PENGELOLA', label: 'Returning', icon: '←', color: 'purple' },
              { status: 'SCRAPPED', label: 'Scrapped', icon: '🗑', color: 'gray' },
            ].map(({ status, label, icon, color }) => (
              <Card 
                key={status}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  cassetteStatusFilter === status ? `ring-2 ring-${color}-500` : ''
                }`}
                onClick={() => setCassetteStatusFilter(cassetteStatusFilter === status ? 'all' : status)}
              >
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl">{icon}</div>
                    <p className="text-2xl font-bold">{cassetteStatusCounts[status] || 0}</p>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by serial number, type, or bank..."
                    value={cassetteSearchTerm}
                    onChange={(e) => setCassetteSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {cassetteStatusFilter !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCassetteStatusFilter('all')}
                      className="h-11"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filter
                    </Button>
                  )}
                  <Select
                    value={cassetteItemsPerPage.toString()}
                    onValueChange={(value) => {
                      setCassetteItemsPerPage(Number(value));
                      setCassetteCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cassettes Table */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5 text-primary" />
                  Cassettes Inventory
                  <Badge variant="secondary" className="ml-2">
                    {filteredCassettes.length} items
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCassettes ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCassettes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Disc className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No cassettes found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cassetteSearchTerm || cassetteStatusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'No cassettes available in the system'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-semibold text-sm">Serial Number</th>
                          <th className="text-left p-4 font-semibold text-sm">Type</th>
                          <th className="text-left p-4 font-semibold text-sm">Bank</th>
                          <th className="text-left p-4 font-semibold text-sm">Usage</th>
                          <th className="text-left p-4 font-semibold text-sm">Status</th>
                          <th className="text-left p-4 font-semibold text-sm">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCassettes.map((cassette, index) => (
                          <tr
                            key={cassette.id}
                            className={`border-b hover:bg-muted/30 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                            }`}
                          >
                            <td className="p-4">
                              <span className="font-mono font-semibold text-sm">
                                {cassette.serialNumber}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {cassette.cassetteType?.typeCode || 'N/A'}
                                </span>
                                {cassette.cassetteType?.typeName && (
                                  <span className="text-xs text-muted-foreground">
                                    {cassette.cassetteType.typeName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {cassette.customerBank?.bankName || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {cassette.usageType && (
                                <Badge variant="outline" className="text-xs">
                                  {cassette.usageType}
                                </Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge className={`${getCassetteStatusColor(cassette.status)} border`}>
                                {cassette.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-xs text-muted-foreground max-w-xs truncate block">
                                {cassette.notes || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredCassetteTotalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{cassetteStartIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(cassetteEndIndex, filteredCassettes.length)}</span> of{' '}
                        <span className="font-medium">{filteredCassettes.length}</span> cassettes
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCassetteCurrentPage(cassetteCurrentPage - 1)}
                          disabled={cassetteCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="text-sm font-medium px-4">
                          Page {cassetteCurrentPage} of {filteredCassetteTotalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCassetteCurrentPage(cassetteCurrentPage + 1)}
                          disabled={cassetteCurrentPage >= filteredCassetteTotalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MACHINES TAB ===== */}
        <TabsContent value="machines" className="space-y-6">
          {/* Status Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { status: 'OPERATIONAL', label: 'Operational', icon: '✓', color: 'emerald' },
              { status: 'MAINTENANCE', label: 'Maintenance', icon: '⚙', color: 'amber' },
              { status: 'UNDER_REPAIR', label: 'Under Repair', icon: '🔧', color: 'rose' },
              { status: 'DECOMMISSIONED', label: 'Decommissioned', icon: '✕', color: 'gray' },
            ].map(({ status, label, icon, color }) => (
              <Card 
                key={status}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  machineStatusFilter === status ? `ring-2 ring-${color}-500` : ''
                }`}
                onClick={() => setMachineStatusFilter(machineStatusFilter === status ? 'all' : status)}
              >
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl">{icon}</div>
                    <p className="text-2xl font-bold">{machineStatusCounts[status] || 0}</p>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by serial number, model, location..."
                    value={machineSearchTerm}
                    onChange={(e) => setMachineSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {machineStatusFilter !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMachineStatusFilter('all')}
                      className="h-11"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filter
                    </Button>
                  )}
                  {user?.userType === 'HITACHI' && user?.role === 'SUPER_ADMIN' && (
                    <Button
                      onClick={() => setAddMachineDialogOpen(true)}
                      className="h-11"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Machine
                    </Button>
                  )}
                  <Select
                    value={machineItemsPerPage.toString()}
                    onValueChange={(value) => {
                      setMachineItemsPerPage(Number(value));
                      setMachineCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Machines Table/Grid */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Monitor className="h-5 w-5 text-primary" />
                  Machines Inventory
                  <Badge variant="secondary" className="ml-2">
                    {machineTotal} items
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingMachines ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMachines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Monitor className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No machines found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {machineSearchTerm || machineStatusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'No machines available in the system'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMachines.map((machine) => (
                      <Card key={machine.id} className="hover:shadow-lg transition-all border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold mb-1">
                                {machine.modelName}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground font-mono">
                                SN: {machine.serialNumberManufacturer}
                              </p>
                            </div>
                            <Badge className={`${getMachineStatusColor(machine.status)} border text-xs`}>
                              {machine.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                              <span className="truncate">{machine.customerBank?.bankName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">
                                {machine.physicalLocation}
                                {machine.branchCode && ` (${machine.branchCode})`}
                              </span>
                            </div>
                            {machine.installationDate && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Installed: {new Date(machine.installationDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchMachineCassettes(machine)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              View Cassettes
                            </Button>
                            {user?.userType === 'HITACHI' && user?.role === 'SUPER_ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMachineToEdit(machine);
                                  setEditMachineDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {machineTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{((machineCurrentPage - 1) * machineItemsPerPage) + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(machineCurrentPage * machineItemsPerPage, machineTotal)}</span> of{' '}
                        <span className="font-medium">{machineTotal}</span> machines
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMachineCurrentPage(machineCurrentPage - 1)}
                          disabled={machineCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="text-sm font-medium px-4">
                          Page {machineCurrentPage} of {machineTotalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMachineCurrentPage(machineCurrentPage + 1)}
                          disabled={machineCurrentPage >= machineTotalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Machine Cassettes Dialog */}
      <Dialog open={cassetteDialogOpen} onOpenChange={handleCloseCassetteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Cassettes in Machine
            </DialogTitle>
            <DialogDescription>
              {selectedMachine && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-foreground">{selectedMachine.modelName}</p>
                  <p className="text-sm">SN: {selectedMachine.serialNumberManufacturer}</p>
                  <p className="text-sm">{selectedMachine.physicalLocation}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingMachineCassettes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : machineCassettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cassettes found in this machine</p>
            </div>
          ) : (
            <div className="space-y-3">
              {machineCassettes.map((cassette) => (
                <Card key={cassette.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold">{cassette.serialNumber}</span>
                          {cassette.usageType && (
                            <Badge variant="outline" className="text-xs">
                              {cassette.usageType}
                            </Badge>
                          )}
                          <Badge className={`${getCassetteStatusColor(cassette.status)} border text-xs`}>
                            {cassette.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Type: {cassette.cassetteType?.typeCode || 'N/A'}</span>
                          <span>•</span>
                          <span>{cassette.customerBank?.bankName || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Machine Dialog */}
      {user?.userType === 'HITACHI' && user?.role === 'SUPER_ADMIN' && (
        <>
          <AddMachineDialog
            open={addMachineDialogOpen}
            onOpenChange={setAddMachineDialogOpen}
            onSuccess={handleMachineAdded}
          />
          <EditMachineDialog
            open={editMachineDialogOpen}
            onOpenChange={setEditMachineDialogOpen}
            machine={machineToEdit}
            onSuccess={handleMachineUpdated}
          />
        </>
      )}
    </PageLayout>
  );
}

