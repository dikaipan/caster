'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  Upload,
  Download,
  Settings,
  BarChart3,
  Code,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  Edit,
  Trash2,
  Table,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DataManagementTab() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statsError, setStatsError] = useState('');

  // Import states
  const [jsonData, setJsonData] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // Backup states
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Maintenance states
  const [maintenanceAction, setMaintenanceAction] = useState('');
  const [maintenanceResult, setMaintenanceResult] = useState<any>(null);

  // Stats states
  const [dbStats, setDbStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Editor states
  const [editorMode, setEditorMode] = useState<'sql' | 'visual'>('visual');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  
  // Visual Editor states
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tablePagination, setTablePagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loadingTable, setLoadingTable] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    if (activeTab === 'stats' && isAuthenticated) {
      fetchDatabaseStats();
    }
    if (activeTab === 'backup' && isAuthenticated) {
      fetchBackupList();
    }
  }, [activeTab, isAuthenticated]);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    
    setLoadingTable(true);
    setError('');
    try {
      const response = await api.get(
        `/data-management/tables/${selectedTable}?page=${tablePagination.page}&limit=${tablePagination.limit}`
      );
      setTableData(response.data.data);
      setTablePagination((prev) => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.totalPages,
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch table data');
    } finally {
      setLoadingTable(false);
    }
  }, [selectedTable, tablePagination.page, tablePagination.limit]);

  useEffect(() => {
    if (activeTab === 'editor' && selectedTable && editorMode === 'visual') {
      fetchTableData();
    }
  }, [activeTab, selectedTable, tablePagination.page, editorMode, fetchTableData]);

  const handleEditRecord = async (record: any) => {
    try {
      const response = await api.get(`/data-management/tables/${selectedTable}/${record.id}`);
      setEditingRecord(record);
      setEditFormData(response.data);
      setIsEditDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load record');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !selectedTable) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await api.patch(`/data-management/tables/${selectedTable}/${editingRecord.id}`, {
        data: editFormData,
      });
      setSuccess('Record updated successfully!');
      setIsEditDialogOpen(false);
      fetchTableData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord || !selectedTable) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await api.delete(`/data-management/tables/${selectedTable}/${deletingRecord.id}`);
      setSuccess('Record deleted successfully!');
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      fetchTableData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (record: any) => {
    setDeletingRecord(record);
    setIsDeleteDialogOpen(true);
  };

  // Map database field names to user-friendly headers
  const getFieldHeader = (fieldName: string, tableName: string): string => {
    const headerMaps: Record<string, Record<string, string>> = {
      customers_banks: {
        id: 'ID',
        bankCode: 'Bank Code',
        bankName: 'Bank Name',
        status: 'Status',
        primaryContactName: 'Contact Name',
        primaryContactEmail: 'Contact Email',
        primaryContactPhone: 'Contact Phone',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
      },
      pengelola: {
        id: 'ID',
        pengelolaCode: 'Pengelola Code',
        companyName: 'Company Name',
        companyAbbreviation: 'Abbreviation',
        businessRegistrationNumber: 'Registration Number',
        address: 'Address',
        city: 'City',
        province: 'Province',
        primaryContactName: 'Contact Name',
        primaryContactEmail: 'Contact Email',
        primaryContactPhone: 'Contact Phone',
        website: 'Website',
        status: 'Status',
        notes: 'Notes',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
      },
      pengelola_users: {
        id: 'ID',
        pengelolaId: 'Pengelola ID',
        username: 'Username',
        email: 'Email',
        passwordHash: 'Password Hash',
        fullName: 'Full Name',
        phone: 'Phone',
        whatsappNumber: 'WhatsApp',
        role: 'Role',
        employeeId: 'Employee ID',
        canCreateTickets: 'Can Create Tickets',
        canCloseTickets: 'Can Close Tickets',
        canManageMachines: 'Can Manage Machines',
        assignedBranches: 'Assigned Branches',
        status: 'Status',
        lastLogin: 'Last Login',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        pengelola: 'Pengelola',
      },
      hitachi_users: {
        id: 'ID',
        username: 'Username',
        email: 'Email',
        passwordHash: 'Password Hash',
        fullName: 'Full Name',
        role: 'Role',
        department: 'Department',
        status: 'Status',
        lastLogin: 'Last Login',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
      },
      machines: {
        id: 'ID',
        serialNumberManufacturer: 'Serial Number',
        wsid: 'WSID',
        customerBankId: 'Bank ID',
        pengelolaId: 'Pengelola ID',
        branchCode: 'Branch Code',
        installationDate: 'Installation Date',
        status: 'Status',
        notes: 'Notes',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        customerBank: 'Bank',
        pengelola: 'Pengelola',
      },
      cassettes: {
        id: 'ID',
        serialNumber: 'Serial Number',
        cassetteTypeId: 'Type ID',
        customerBankId: 'Bank ID',
        status: 'Status',
        notes: 'Notes',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        cassetteType: 'Type',
        customerBank: 'Bank',
      },
      problem_tickets: {
        id: 'ID',
        ticketNumber: 'Ticket Number',
        cassetteId: 'Cassette ID',
        machineId: 'Machine ID',
        reportedBy: 'Reported By',
        title: 'Title',
        description: 'Description',
        priority: 'Priority',
        status: 'Status',
        affectedComponents: 'Affected Components',
        resolutionNotes: 'Resolution Notes',
        wsid: 'WSID',
        errorCode: 'Error Code',
        deliveryMethod: 'Delivery Method',
        courierService: 'Courier Service',
        trackingNumber: 'Tracking Number',
        reportedAt: 'Reported At',
        resolvedAt: 'Resolved At',
        closedAt: 'Closed At',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        machine: 'Machine',
        reporter: 'Reporter',
      },
      repair_tickets: {
        id: 'ID',
        cassetteId: 'Cassette ID',
        reportedIssue: 'Reported Issue',
        receivedAtRc: 'Received At RC',
        repairedBy: 'Repaired By',
        repairActionTaken: 'Repair Action',
        partsReplaced: 'Parts Replaced',
        qcPassed: 'QC Passed',
        completedAt: 'Completed At',
        status: 'Status',
        notes: 'Notes',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        cassette: 'Cassette',
        repairer: 'Repairer',
      },
    };

    return headerMaps[tableName]?.[fieldName] || fieldName;
  };

  const fetchDatabaseStats = async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const response = await api.get('/data-management/stats');
      setDbStats(response.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setStatsError(err.response?.data?.message || 'Failed to fetch database statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    setImportResult(null);

    try {
      const parsedData = JSON.parse(jsonData);
      const response = await api.post('/import/bulk', parsedData);
      setImportResult(response.data);
      setSuccess('Data imported successfully!');
      setJsonData('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/import/csv/template', {
        responseType: 'blob',
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Template CSV berhasil didownload!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal download template');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith('.json');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    if (!isJson && !isExcel && !isCsv) {
      setError('Please upload a valid JSON, Excel, or CSV file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isCsv) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/import/csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImportResult(response.data);
        setSuccess('CSV file imported successfully!');
      } else if (isExcel) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/import/excel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImportResult(response.data);
        setSuccess('Excel file imported successfully!');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            setJsonData(JSON.stringify(parsed, null, 2));
            setSuccess('JSON file loaded. Click Import to proceed.');
          } catch (err) {
            setError('Invalid JSON file format');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
        return;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/data-management/backup');
      setBackupStatus(response.data);
      setSuccess('Database backup created successfully!');
      // Refresh backup list
      fetchBackupList();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupList = async () => {
    try {
      const response = await api.get('/data-management/backups');
      if (response.data && response.data.length > 0) {
        setBackupStatus(response.data[0]); // Set latest backup
      }
    } catch (err: any) {
      console.error('Failed to fetch backup list:', err);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setError('Please select a backup file');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      
      const response = await api.post('/data-management/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess(response.data.message || 'Database restored successfully!');
      setRestoreFile(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore database');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenance = async (action: string) => {
    setError('');
    setSuccess('');
    setLoading(true);
    setMaintenanceAction(action);

    try {
      const response = await api.post('/data-management/maintenance', { action });
      setMaintenanceResult(response.data);
      setSuccess(response.data.message || `${action} completed successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/data-management/query', { query });
      setQueryResult(response.data);
      setSuccess(`Query executed successfully. ${response.data.affectedRows} rows returned.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Import</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Backup & Restore</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">DB Stats</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">DB Editor</span>
          </TabsTrigger>
        </TabsList>

        {/* Bulk Import Tab */}
        <TabsContent value="import" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Bulk Import Data</span>
              </CardTitle>
              <CardDescription>
                Import multiple machines, cassettes, and pengelola assignments from CSV, JSON, or Excel file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CSV Format Example */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-semibold text-sm mb-2 text-[#2563EB]">📋 Format CSV untuk Import:</h4>
                <p className="text-xs text-[#1E40AF] mb-2">
                  Format CSV harus memiliki kolom: <code className="bg-blue-100 px-1 rounded">machine_serial_number</code>, <code className="bg-blue-100 px-1 rounded">cassette_serial_number</code>, <code className="bg-blue-100 px-1 rounded">bank_code</code>, <code className="bg-blue-100 px-1 rounded">pengelola_code</code>
                </p>
                <div className="bg-white p-3 rounded border border-red-200">
                  <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
{`machine_serial_number,cassette_serial_number,bank_code,pengelola_code
HTCH-SRM100-2023-0001,RB-BNI-0001,BNI,PGL-TAG-001
HTCH-SRM100-2023-0002,RB-BNI-0002,BNI,PGL-TAG-001
HTCH-SRM100-2023-0003,RB-BNI-0003,BNI,PGL-ADV-001
HTCH-SRM100-2023-0004,AB-BNI-0001,BNI,PGL-TAG-001
HTCH-SRM100-2023-0005,RB-BNI-0004,BNI,PGL-ADV-001`}
                  </pre>
                </div>
                <p className="text-xs text-[#C5000F] mt-2">
                  <strong>Catatan:</strong> Bank dan Pengelola harus sudah ada di sistem sebelum import. Sistem akan otomatis:
                  <br />• Membuat/update mesin dengan SN mesin
                  <br />• Membuat/update kaset dengan SN kaset
                  <br />• Assign pengelola ke bank (jika belum ada)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload">Upload File (CSV, JSON, atau Excel)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Template CSV</span>
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#E60012] hover:file:bg-red-100"
                />
              </div>

              <div className="text-center text-sm text-muted-foreground">OR</div>

              <div className="space-y-2">
                <Label htmlFor="json-data">Paste JSON Data</Label>
                <Textarea
                  id="json-data"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='{ "banks": [...], "cassettes": [...] }'
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!jsonData.trim() || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>

              {importResult && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <h3 className="font-semibold mb-2">Import Results:</h3>
                  <pre className="text-xs overflow-auto">{JSON.stringify(importResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Restore Tab */}
        <TabsContent value="backup" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Backup Database</span>
                </CardTitle>
                <CardDescription>
                  Create a backup of the entire database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Backup will include all tables and data. This may take a few minutes.
                  </p>
                </div>

                {backupStatus && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-semibold text-green-800 mb-2">Latest Backup:</p>
                    <p className="text-xs text-green-700">File: {backupStatus.filename}</p>
                    <p className="text-xs text-green-700">Size: {backupStatus.size}</p>
                    <p className="text-xs text-green-700">
                      Created: {new Date(backupStatus.createdAt).toLocaleString()}
                    </p>
                    {backupStatus.filename && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          try {
                            const response = await api.get(`/data-management/backups/${backupStatus.filename}`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', backupStatus.filename);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (err) {
                            setError('Failed to download backup');
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleBackup}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Restore Database</span>
                </CardTitle>
                <CardDescription>
                  Restore database from a backup file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    <strong>Warning:</strong> This will replace all current data with the backup. This action cannot be undone!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restore-file">Select Backup File</Label>
                  <input
                    id="restore-file"
                    type="file"
                    accept=".json,.sql"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JSON (.json) or SQL (.sql)
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                )}

                <Button
                  onClick={handleRestore}
                  disabled={!restoreFile || loading}
                  variant="destructive"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Restore Database
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Database Maintenance</span>
              </CardTitle>
              <CardDescription>
                Perform maintenance operations on the database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  onClick={() => handleMaintenance('vacuum')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <RefreshCw className="h-6 w-6" />
                  <span>Vacuum Database</span>
                </Button>

                <Button
                  onClick={() => handleMaintenance('analyze')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Analyze Tables</span>
                </Button>

                <Button
                  onClick={() => handleMaintenance('reindex')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <Database className="h-6 w-6" />
                  <span>Reindex Database</span>
                </Button>

                <Button
                  onClick={() => handleMaintenance('clean logs')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <FileText className="h-6 w-6" />
                  <span>Clean Old Logs</span>
                </Button>
              </div>

              {maintenanceResult && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-semibold text-[#E60012]">
                    {maintenanceResult.success ? (
                      <CheckCircle2 className="h-4 w-4 inline mr-2 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 inline mr-2 text-red-600" />
                    )}
                    {maintenanceResult.message}
                  </p>
                  <p className="text-xs text-[#C5000F] mt-1">
                    {new Date(maintenanceResult.timestamp).toLocaleString()}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Database Statistics</span>
              </CardTitle>
              <CardDescription>
                View database size, table counts, and record statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
                </div>
              ) : statsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{statsError}</p>
                  <Button
                    onClick={fetchDatabaseStats}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : dbStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-[#E60012] mb-1">Total Tables</p>
                      <p className="text-2xl font-bold text-[#C5000F]">{dbStats.totalTables}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">Total Records</p>
                      <p className="text-2xl font-bold text-green-800">{dbStats.totalRecords}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-lg">
                      <p className="text-sm text-rose-600 mb-1">Database Size</p>
                      <p className="text-2xl font-bold text-rose-800">{dbStats.databaseSize}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 mb-1">Last Backup</p>
                      <p className="text-sm font-bold text-orange-800">
                        {dbStats.lastBackup ? new Date(dbStats.lastBackup).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Table Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Table Name</th>
                            <th className="text-right p-3 font-semibold">Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbStats.tables.map((table: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-mono text-sm">{table.name}</td>
                              <td className="p-3 text-right font-medium">{table.records.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Button
                    onClick={fetchDatabaseStats}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Statistics
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No statistics available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Editor Tab */}
        <TabsContent value="editor" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>Database Editor</span>
                  </CardTitle>
                  <CardDescription>
                    Edit database records using visual editor or SQL queries
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={editorMode === 'visual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditorMode('visual')}
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Visual Editor
                  </Button>
                  <Button
                    variant={editorMode === 'sql' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditorMode('sql')}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    SQL Query
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editorMode === 'visual' ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="table-select">Select Table</Label>
                        <Select value={selectedTable} onValueChange={setSelectedTable}>
                          <SelectTrigger id="table-select">
                            <SelectValue placeholder="Choose a table..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customers_banks">Customers Banks</SelectItem>
                            <SelectItem value="pengelola">Pengelola</SelectItem>
                            <SelectItem value="pengelola_users">Pengelola Users</SelectItem>
                            <SelectItem value="hitachi_users">Hitachi Users</SelectItem>
                            <SelectItem value="machines">Machines</SelectItem>
                            <SelectItem value="cassettes">Cassettes</SelectItem>
                            <SelectItem value="problem_tickets">Problem Tickets</SelectItem>
                            <SelectItem value="repair_tickets">Repair Tickets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedTable && (
                        <div className="pt-6">
                          <Button onClick={fetchTableData} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                      )}
                    </div>

                    {selectedTable && (
                      <>
                        {loadingTable ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
                          </div>
                        ) : tableData.length > 0 ? (
                          <>
                            <div className="border rounded-md overflow-auto max-h-[600px]">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    {Object.keys(tableData[0] || {}).map((key) => (
                                      <th key={key} className="p-2 text-left font-semibold border-b">
                                        {getFieldHeader(key, selectedTable)}
                                      </th>
                                    ))}
                                    <th className="p-2 text-left font-semibold border-b">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableData.map((row: any, idx: number) => (
                                    <tr key={row.id || idx} className="border-b hover:bg-gray-50">
                                      {Object.keys(row).map((key) => (
                                        <td key={key} className="p-2 max-w-xs truncate" title={String(row[key])}>
                                          {row[key] !== null && row[key] !== undefined
                                            ? typeof row[key] === 'object'
                                              ? JSON.stringify(row[key])
                                              : String(row[key])
                                            : 'NULL'}
                                        </td>
                                      ))}
                                      <td className="p-2">
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditRecord(row)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteDialog(row)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600">
                                Showing {((tablePagination.page - 1) * tablePagination.limit) + 1} to{' '}
                                {Math.min(tablePagination.page * tablePagination.limit, tablePagination.total)} of{' '}
                                {tablePagination.total} records
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTablePagination({ ...tablePagination, page: tablePagination.page - 1 })}
                                  disabled={tablePagination.page === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="px-3 py-1 text-sm">
                                  Page {tablePagination.page} of {tablePagination.totalPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTablePagination({ ...tablePagination, page: tablePagination.page + 1 })}
                                  disabled={tablePagination.page >= tablePagination.totalPages}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Table className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No data found in this table</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Edit Dialog */}
                  <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Edit Record</AlertDialogTitle>
                        <AlertDialogDescription>
                          Edit the record fields below. Fields marked with * are required.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 py-4">
                        {Object.keys(editFormData).map((key) => {
                          if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
                            return (
                              <div key={key} className="space-y-2">
                                <Label>{getFieldHeader(key, selectedTable)}</Label>
                                <Input value={String(editFormData[key] || '')} disabled />
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="space-y-2">
                              <Label htmlFor={key}>{getFieldHeader(key, selectedTable)}</Label>
                              <Input
                                id={key}
                                value={editFormData[key] !== null && editFormData[key] !== undefined ? String(editFormData[key]) : ''}
                                onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveEdit} disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Delete Dialog */}
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Record</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this record? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteRecord}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      <strong>Note:</strong> Only SELECT queries are allowed. Write operations are disabled for safety.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sql-query">SQL Query</Label>
                    <Textarea
                      id="sql-query"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="SELECT * FROM customers_banks LIMIT 10;"
                      className="font-mono text-sm min-h-[200px]"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{success}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleQuery}
                    disabled={!query.trim() || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Code className="mr-2 h-4 w-4" />
                        Execute Query
                      </>
                    )}
                  </Button>

                  {queryResult && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">Query Results</p>
                        <p className="text-xs text-gray-500">
                          Execution time: {queryResult.executionTime} • Rows: {queryResult.rows?.length || 0}
                        </p>
                      </div>
                      <div className="border rounded-md overflow-auto max-h-96">
                        <table className="w-full text-sm">
                          {queryResult.columns && queryResult.columns.length > 0 && (
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                {queryResult.columns.map((col: string, idx: number) => (
                                  <th key={idx} className="p-2 text-left font-semibold border-b">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {queryResult.rows && queryResult.rows.length > 0 ? (
                              queryResult.rows.map((row: any, rowIdx: number) => (
                                <tr key={rowIdx} className="border-b hover:bg-gray-50">
                                  {queryResult.columns.map((col: string, colIdx: number) => (
                                    <td key={colIdx} className="p-2">
                                      {row[col] !== null && row[col] !== undefined
                                        ? String(row[col])
                                        : 'NULL'}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={queryResult.columns?.length || 1} className="p-4 text-center text-gray-500">
                                  No results
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


