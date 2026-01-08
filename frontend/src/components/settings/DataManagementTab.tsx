'use client';

import { useEffect, useState } from 'react';
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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  Activity,
  Server,
  AlertOctagon,
  Cpu,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
    message: string;
    progress: number;
  }>({
    status: 'idle',
    message: '',
    progress: 0,
  });

  // Backup states
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Maintenance states
  const [maintenanceAction, setMaintenanceAction] = useState('');
  const [maintenanceResult, setMaintenanceResult] = useState<any>(null);

  // Stats states
  const [dbStats, setDbStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Monitoring states
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Delete machines and cassettes states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    if (activeTab === 'stats' && isAuthenticated) {
      fetchDatabaseStats();
    }
    if (activeTab === 'backup' && isAuthenticated) {
      fetchBackupList();
    }
  }, [activeTab, isAuthenticated]);


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

  // Helper to safely extract status
  const getStatus = (data: any, key: string) => {
    if (!data) return 'unknown';
    // Terminus v10+ structure (info/error/details)
    return data?.info?.[key]?.status || data?.details?.[key]?.status || data?.error?.[key]?.status || 'down';
  };

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await api.get('/health');
      setHealthData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch health check', err);
      // Terminus returns 503 Service Unavailable if any check fails
      // But it still returns the JSON body with details
      if (err.response && err.response.data) {
        setHealthData(err.response.data);
      } else {
        setHealthData({ status: 'error', details: { error: { status: 'down', message: 'Backend unreachable' } } });
      }
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monitoring' && isAuthenticated) {
      fetchSystemHealth();
    }
  }, [activeTab, isAuthenticated]);

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

  const handleDownloadExcelTemplate = async () => {
    try {
      const response = await api.get('/import/excel/template', {
        responseType: 'blob',
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Template Excel berhasil didownload!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal download template Excel');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith('.json');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    if (!isJson && !isExcel && !isCsv) {
      setError('Please upload a valid JSON, Excel, or CSV file');
      setSelectedFile(null);
      return;
    }

    setError('');
    setSuccess('');
    setImportResult(null);

    // For JSON files, load content into textarea
    if (isJson) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          setJsonData(JSON.stringify(parsed, null, 2));
          setSelectedFile(null); // JSON doesn't need file state
          setSuccess('JSON file loaded. Click Import to proceed.');
        } catch (err) {
          setError('Invalid JSON file format');
          setSelectedFile(null);
        }
      };
      reader.readAsText(file);
    } else {
      // For Excel/CSV, store file for manual import
      setSelectedFile(file);
      setSuccess(`File "${file.name}" selected. Click Import to proceed.`);
    }
  };

  const handleImportFile = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    setLoading(true);
    setError('');
    setSuccess('');
    setImportResult(null);
    setImportProgress({
      status: 'uploading',
      message: 'Uploading file...',
      progress: 10,
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setImportProgress({
        status: 'processing',
        message: 'Processing file...',
        progress: 30,
      });

      let response;
      if (isCsv) {
        response = await api.post('/import/csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setImportProgress({
                status: 'processing',
                message: `Uploading CSV file... ${percentCompleted}%`,
                progress: 10 + (percentCompleted * 0.3),
              });
            }
          },
        });
      } else if (isExcel) {
        response = await api.post('/import/excel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setImportProgress({
                status: 'processing',
                message: `Uploading Excel file... ${percentCompleted}%`,
                progress: 10 + (percentCompleted * 0.3),
              });
            }
          },
        });
      }

      setImportProgress({
        status: 'processing',
        message: 'Importing data to database...',
        progress: 70,
      });

      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!response) {
        throw new Error('Unsupported file type');
      }

      setImportResult(response.data);

      // Calculate success/failure stats
      const result = response.data;
      const totalRecords =
        (result.banks?.total || 0) +
        (result.cassettes?.total || 0) +
        (result.machines?.total || 0);
      const successfulRecords =
        (result.banks?.successful || 0) +
        (result.cassettes?.successful || 0) +
        (result.machines?.successful || 0);
      const failedRecords =
        (result.banks?.failed || 0) +
        (result.cassettes?.failed || 0) +
        (result.machines?.failed || 0);

      // Check if no records were processed at all
      if (totalRecords === 0) {
        setImportProgress({
          status: 'error',
          message: `❌ No data found in file. Please check your file format.`,
          progress: 0,
        });
        setError('No data found in file. Please check your file format and ensure it contains valid data.');
        setImportResult(null);
      } else if (successfulRecords === 0 && failedRecords > 0) {
        // All records failed
        setImportProgress({
          status: 'error',
          message: `❌ Import failed! All ${failedRecords} records failed to import.`,
          progress: 0,
        });
        setError(`Import failed! All ${failedRecords} records failed to import. Please check the error details below.`);
      } else if (result.success && failedRecords === 0 && successfulRecords > 0) {
        // All successful
        setImportProgress({
          status: 'completed',
          message: `✅ Import completed successfully! ${successfulRecords} records imported.`,
          progress: 100,
        });
        setSuccess(`✅ Import completed successfully! ${successfulRecords} records imported.`);
      } else if (failedRecords > 0 && successfulRecords > 0) {
        // Partial success
        setImportProgress({
          status: 'completed',
          message: `⚠️ Import completed with errors. ${successfulRecords} succeeded, ${failedRecords} failed.`,
          progress: 100,
        });
        setSuccess(`⚠️ Import completed with errors. ${successfulRecords} succeeded, ${failedRecords} failed.`);
      } else {
        // Unknown state
        setImportProgress({
          status: 'error',
          message: `❌ Import completed but no records were processed.`,
          progress: 0,
        });
        setError('Import completed but no records were processed. Please check your file format.');
      }

      // Clear file selection after successful import
      setSelectedFile(null);
      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err: any) {
      setImportProgress({
        status: 'error',
        message: `❌ Import failed: ${err.response?.data?.message || 'Unknown error'}`,
        progress: 0,
      });
      setError(err.response?.data?.message || 'Failed to import file');
    } finally {
      setLoading(false);
      // Reset progress after 3 seconds
      setTimeout(() => {
        setImportProgress({
          status: 'idle',
          message: '',
          progress: 0,
        });
      }, 3000);
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

  const handleDeleteAllMachinesAndCassettes = async () => {
    setDeleting(true);
    setError('');
    setSuccess('');
    setDeleteResult(null);

    try {
      const response = await api.delete('/data-management/machines-cassettes');
      setDeleteResult(response.data);
      setSuccess(response.data.message);
      setShowDeleteDialog(false);
      // Refresh stats if on stats tab
      if (activeTab === 'stats') {
        fetchDatabaseStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menghapus data mesin dan kaset');
      setDeleteResult({ success: false, message: err.response?.data?.message || 'Operation failed' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: Scrollable horizontal list. Desktop: 5-column grid */}
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap flex md:grid md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl touch-pan-x snap-x">
          <TabsTrigger value="import" className="flex-shrink-0 flex items-center space-x-2 min-w-[140px] md:min-w-0 snap-start h-10 md:h-9">
            <Upload className="h-4 w-4" />
            <span>Bulk Import</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex-shrink-0 flex items-center space-x-2 min-w-[140px] md:min-w-0 snap-start h-10 md:h-9">
            <Download className="h-4 w-4" />
            <span>Backup & Restore</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-shrink-0 flex items-center space-x-2 min-w-[140px] md:min-w-0 snap-start h-10 md:h-9">
            <Settings className="h-4 w-4" />
            <span>Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-shrink-0 flex items-center space-x-2 min-w-[140px] md:min-w-0 snap-start h-10 md:h-9">
            <BarChart3 className="h-4 w-4" />
            <span>DB Stats</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex-shrink-0 flex items-center space-x-2 min-w-[140px] md:min-w-0 snap-start h-10 md:h-9">
            <Activity className="h-4 w-4" />
            <span>System Health</span>
          </TabsTrigger>
        </TabsList>


        {/* Monitoring / System Health Tab */}
        <TabsContent value="monitoring" className="mt-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Overall Status */}
            <Card className="col-span-full border-0 shadow-lg bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <Activity className="h-6 w-6 text-blue-600" />
                  <span>System Health Status</span>
                </CardTitle>
                <CardDescription className="text-base">Real-time monitoring of application services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full ${healthData?.status === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-semibold text-xl uppercase tracking-wide">{healthData?.status || 'UNKNOWN'}</span>
                  </div>
                  <Button variant="outline" size="default" onClick={fetchSystemHealth} disabled={healthLoading} className="w-full sm:w-auto h-12 sm:h-10 text-base">
                    {healthLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Database Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Database className={`h-8 w-8 ${getStatus(healthData, 'database') === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                  <div>
                    <p className="text-2xl font-bold">{getStatus(healthData, 'database') === 'up' ? 'Operational' : 'Down'}</p>
                    <p className="text-xs text-slate-400">Prisma Connection</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Memory Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Server className={`h-8 w-8 ${getStatus(healthData, 'memory_heap') === 'up' ? 'text-green-500' : 'text-yellow-500'}`} />
                  <div>
                    <p className="text-2xl font-bold">{getStatus(healthData, 'memory_heap') === 'up' ? 'Healthy' : 'High Load'}</p>
                    <p className="text-xs text-slate-400">Heap Allocation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sentry Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Error Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertOctagon className={`h-8 w-8 ${getStatus(healthData, 'sentry') === 'up' ? 'text-purple-500' : 'text-slate-300'}`} />
                  <div>
                    <p className="text-2xl font-bold">{getStatus(healthData, 'sentry') === 'up' ? 'Active' : 'Inactive'}</p>
                    <p className="text-xs text-slate-400">Exception Monitoring</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Test Area */}
            <Card className="col-span-full border-red-200 bg-red-50 dark:bg-red-900/10">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Test Monitoring Alerts
                </CardTitle>
                <CardDescription>Trigger simulated errors to verify alerting systems (Sentry/Winston)</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button variant="destructive" onClick={() => { throw new Error("Frontend Test Error"); }}>
                  Throw Frontend Error
                </Button>
              </CardContent>
            </Card>

            <div className="col-span-full mt-4">
              <details>
                <summary className="cursor-pointer text-xs text-slate-500">Debug Raw Health Data</summary>
                <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 text-xs rounded overflow-auto">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </TabsContent>

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
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">📋 Format CSV untuk Import:</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  Format CSV harus memiliki kolom: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-blue-900 dark:text-blue-200">machine_serial_number</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-blue-900 dark:text-blue-200">cassette_serial_number</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-blue-900 dark:text-blue-200">bank_code</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-blue-900 dark:text-blue-200">pengelola_code</code>
                </p>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-red-200 dark:border-red-800">
                  <pre className="text-xs font-mono text-gray-700 dark:text-slate-300 overflow-x-auto">
                    {`machine_serial_number,cassette_serial_number,bank_code,pengelola_code
HTCH-SRM100-2023-0001,RB-BNI-0001,BNI,PGL-TAG-001
HTCH-SRM100-2023-0002,RB-BNI-0002,BNI,PGL-TAG-001
HTCH-SRM100-2023-0003,RB-BNI-0003,BNI,PGL-ADV-001
HTCH-SRM100-2023-0004,AB-BNI-0001,BNI,PGL-TAG-001
HTCH-SRM100-2023-0005,RB-BNI-0004,BNI,PGL-ADV-001`}
                  </pre>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  <strong>Catatan:</strong> Bank dan Pengelola harus sudah ada di sistem sebelum import. Sistem akan otomatis:
                  <br />• Membuat/update mesin dengan SN mesin
                  <br />• Membuat/update kaset dengan SN kaset
                  <br />• Assign pengelola ke bank (jika belum ada)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload">Upload File (CSV, JSON, atau Excel)</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={handleDownloadTemplate}
                      className="flex items-center justify-center space-x-2 h-12 sm:h-10 w-full sm:w-auto active:scale-95 transition-transform"
                    >
                      <Download className="h-5 w-5" />
                      <span>Template CSV</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={handleDownloadExcelTemplate}
                      className="flex items-center justify-center space-x-2 h-12 sm:h-10 w-full sm:w-auto active:scale-95 transition-transform"
                    >
                      <Download className="h-5 w-5" />
                      <span>Template Excel</span>
                    </Button>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 dark:file:bg-red-900/30 file:text-red-600 dark:file:text-red-400 hover:file:bg-red-100 dark:hover:file:bg-red-900/50"
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

              {/* Progress Bar */}
              {importProgress.status !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-300">
                      {importProgress.message}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      {importProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${importProgress.status === 'error'
                        ? 'bg-red-600 dark:bg-red-500'
                        : importProgress.status === 'completed'
                          ? 'bg-green-600 dark:bg-green-500'
                          : 'bg-blue-600 dark:bg-blue-500'
                        }`}
                      style={{ width: `${importProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
                </div>
              )}

              <Button
                onClick={jsonData.trim() ? handleImport : handleImportFile}
                disabled={(!jsonData.trim() && !selectedFile) || loading}
                className="w-full h-12 text-base font-medium shadow-md transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing Import...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Start Import Data
                  </>
                )}
              </Button>

              {importResult && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-slate-100 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                    Import Results
                  </h3>

                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {importResult.banks && (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Banks</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                            {importResult.banks.successful || 0}
                            {importResult.banks.failed > 0 && (
                              <span className="text-sm text-red-600 dark:text-red-400 ml-1">
                                / {importResult.banks.total} ({importResult.banks.failed} failed)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {importResult.cassettes && (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Cassettes</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                            {importResult.cassettes.successful || 0}
                            {importResult.cassettes.failed > 0 && (
                              <span className="text-sm text-red-600 dark:text-red-400 ml-1">
                                / {importResult.cassettes.total} ({importResult.cassettes.failed} failed)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {importResult.machines && (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Machines</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                            {importResult.machines.successful || 0}
                            {importResult.machines.failed > 0 && (
                              <span className="text-sm text-red-600 dark:text-red-400 ml-1">
                                / {importResult.machines.total} ({importResult.machines.failed} failed)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</p>
                        {(() => {
                          const totalRecords =
                            (importResult.banks?.total || 0) +
                            (importResult.cassettes?.total || 0) +
                            (importResult.machines?.total || 0);
                          const successfulRecords =
                            (importResult.banks?.successful || 0) +
                            (importResult.cassettes?.successful || 0) +
                            (importResult.machines?.successful || 0);
                          const failedRecords =
                            (importResult.banks?.failed || 0) +
                            (importResult.cassettes?.failed || 0) +
                            (importResult.machines?.failed || 0);

                          if (totalRecords === 0) {
                            return <p className="text-lg font-bold text-red-600 dark:text-red-400">❌ No Data</p>;
                          } else if (successfulRecords === 0 && failedRecords > 0) {
                            return <p className="text-lg font-bold text-red-600 dark:text-red-400">❌ Failed</p>;
                          } else if (failedRecords > 0) {
                            return <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">⚠️ Partial</p>;
                          } else if (importResult.success && successfulRecords > 0) {
                            return <p className="text-lg font-bold text-green-600 dark:text-green-400">✅ Success</p>;
                          } else {
                            return <p className="text-lg font-bold text-red-600 dark:text-red-400">❌ Failed</p>;
                          }
                        })()}
                      </div>
                    </div>

                    {/* Failed Records Details */}
                    {importResult.banks?.failed > 0 && importResult.banks.results && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                          Failed Banks ({importResult.banks.failed}):
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {(Array.isArray(importResult.banks.results) ? importResult.banks.results : [])
                            .filter((r: any) => !r.success)
                            .slice(0, 10)
                            .map((r: any, idx: number) => (
                              <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                                • {r.bankCode || r.bankName || 'Unknown'}: {r.error}
                              </p>
                            ))}
                          {Array.isArray(importResult.banks.results) && importResult.banks.results.filter((r: any) => !r.success).length > 10 && (
                            <p className="text-xs text-red-600 dark:text-red-400 italic">
                              ... and {importResult.banks.results.filter((r: any) => !r.success).length - 10} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {importResult.cassettes?.failed > 0 && importResult.cassettes.results && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                          Failed Cassettes ({importResult.cassettes.failed}):
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {(Array.isArray(importResult.cassettes.results) ? importResult.cassettes.results : [])
                            .filter((r: any) => !r.success)
                            .slice(0, 10)
                            .map((r: any, idx: number) => (
                              <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                                • {r.serialNumber || 'Unknown'}: {r.error}
                              </p>
                            ))}
                          {Array.isArray(importResult.cassettes.results) && importResult.cassettes.results.filter((r: any) => !r.success).length > 10 && (
                            <p className="text-xs text-red-600 dark:text-red-400 italic">
                              ... and {importResult.cassettes.results.filter((r: any) => !r.success).length - 10} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {importResult.machines?.failed > 0 && importResult.machines.results && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                          Failed Machines ({importResult.machines.failed}):
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {(Array.isArray(importResult.machines.results) ? importResult.machines.results : [])
                            .filter((r: any) => !r.success)
                            .slice(0, 10)
                            .map((r: any, idx: number) => (
                              <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                                • {r.serialNumber || 'Unknown'}: {r.error}
                              </p>
                            ))}
                          {Array.isArray(importResult.machines.results) && importResult.machines.results.filter((r: any) => !r.success).length > 10 && (
                            <p className="text-xs text-red-600 dark:text-red-400 italic">
                              ... and {importResult.machines.results.filter((r: any) => !r.success).length - 10} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Full JSON (Collapsible) */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100">
                        View Full JSON Response
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent text-gray-800 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 max-h-64">
                        {JSON.stringify(importResult, null, 2)}
                      </pre>
                    </details>
                  </div>
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
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Backup will include all tables and data. This may take a few minutes.
                  </p>
                </div>

                {backupStatus && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Latest Backup:</p>
                    <p className="text-xs text-green-700 dark:text-green-400">File: {backupStatus.filename}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Size: {backupStatus.size}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">
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
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">
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
                    className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 dark:file:bg-red-900/30 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 dark:hover:file:bg-red-900/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JSON (.json) or SQL (.sql)
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
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

              {/* Delete All Machines and Cassettes Section */}
              <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
                    Hapus Semua Data Mesin dan Kaset
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                  <strong>PERINGATAN:</strong> Operasi ini akan menghapus SEMUA data mesin dan kaset beserta data terkait (tickets, repairs, deliveries, dll). 
                  Operasi ini TIDAK DAPAT DIBATALKAN. Pastikan Anda telah membuat backup sebelum melanjutkan.
                </p>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading || deleting}
                  variant="destructive"
                  className="w-full"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="h-4 w-4 mr-2" />
                      Hapus Semua Mesin dan Kaset
                    </>
                  )}
                </Button>

                {deleteResult && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md">
                    <p className="text-sm font-semibold mb-2">
                      {deleteResult.success ? (
                        <span className="text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4 inline mr-2" />
                          {deleteResult.message}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4 inline mr-2" />
                          {deleteResult.message}
                        </span>
                      )}
                    </p>
                    {deleteResult.deletedCounts && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <p><strong>Data yang dihapus:</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Mesin: {deleteResult.deletedCounts.machines}</li>
                          <li>Kaset: {deleteResult.deletedCounts.cassettes}</li>
                          <li>Tickets: {deleteResult.deletedCounts.problemTickets}</li>
                          <li>Repairs: {deleteResult.deletedCounts.repairTickets}</li>
                          <li>Deliveries: {deleteResult.deletedCounts.cassetteDeliveries}</li>
                          <li>Returns: {deleteResult.deletedCounts.cassetteReturns}</li>
                          <li>PM Details: {deleteResult.deletedCounts.pmCassetteDetails}</li>
                          <li>Ticket Details: {deleteResult.deletedCounts.ticketCassetteDetails}</li>
                          <li>Machine History: {deleteResult.deletedCounts.machineIdentifierHistory}</li>
                          <li>Preventive Maintenances: {deleteResult.deletedCounts.preventiveMaintenances}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmation Dialog */}
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertOctagon className="h-5 w-5" />
                      Konfirmasi Penghapusan
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p className="font-semibold text-red-700 dark:text-red-300">
                          Anda yakin ingin menghapus SEMUA data mesin dan kaset?
                        </p>
                        <div>
                          Operasi ini akan menghapus:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Semua mesin (machines)</li>
                          <li>Semua kaset (cassettes)</li>
                          <li>Semua tickets masalah (problem tickets)</li>
                          <li>Semua repair tickets</li>
                          <li>Semua deliveries dan returns</li>
                          <li>Semua preventive maintenance records</li>
                          <li>Dan semua data terkait lainnya</li>
                        </ul>
                        <p className="font-bold text-red-600 dark:text-red-400 mt-4">
                          ⚠️ PERINGATAN: Operasi ini TIDAK DAPAT DIBATALKAN!
                        </p>
                        <p className="text-sm mt-2">
                          Pastikan Anda telah membuat backup sebelum melanjutkan.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllMachinesAndCassettes}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Menghapus...
                        </>
                      ) : (
                        'Ya, Hapus Semua Data'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {maintenanceResult && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {maintenanceResult.success ? (
                      <CheckCircle2 className="h-4 w-4 inline mr-2 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 inline mr-2 text-red-600 dark:text-red-400" />
                    )}
                    {maintenanceResult.message}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    {new Date(maintenanceResult.timestamp).toLocaleString()}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
                </div>
              )}

              {/* Delete All Machines and Cassettes Section */}
              <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
                    Hapus Semua Data Mesin dan Kaset
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                  <strong>PERINGATAN:</strong> Operasi ini akan menghapus SEMUA data mesin dan kaset beserta data terkait (tickets, repairs, deliveries, dll). 
                  Operasi ini TIDAK DAPAT DIBATALKAN. Pastikan Anda telah membuat backup sebelum melanjutkan.
                </p>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading || deleting}
                  variant="destructive"
                  className="w-full"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="h-4 w-4 mr-2" />
                      Hapus Semua Mesin dan Kaset
                    </>
                  )}
                </Button>

                {deleteResult && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md">
                    <p className="text-sm font-semibold mb-2">
                      {deleteResult.success ? (
                        <span className="text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4 inline mr-2" />
                          {deleteResult.message}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4 inline mr-2" />
                          {deleteResult.message}
                        </span>
                      )}
                    </p>
                    {deleteResult.deletedCounts && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <p><strong>Data yang dihapus:</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Mesin: {deleteResult.deletedCounts.machines}</li>
                          <li>Kaset: {deleteResult.deletedCounts.cassettes}</li>
                          <li>Tickets: {deleteResult.deletedCounts.problemTickets}</li>
                          <li>Repairs: {deleteResult.deletedCounts.repairTickets}</li>
                          <li>Deliveries: {deleteResult.deletedCounts.cassetteDeliveries}</li>
                          <li>Returns: {deleteResult.deletedCounts.cassetteReturns}</li>
                          <li>PM Details: {deleteResult.deletedCounts.pmCassetteDetails}</li>
                          <li>Ticket Details: {deleteResult.deletedCounts.ticketCassetteDetails}</li>
                          <li>Machine History: {deleteResult.deletedCounts.machineIdentifierHistory}</li>
                          <li>Preventive Maintenances: {deleteResult.deletedCounts.preventiveMaintenances}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">{statsError}</p>
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
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400 mb-1">Total Tables</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{dbStats.totalTables}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total Records</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{dbStats.totalRecords}</p>
                    </div>
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                      <p className="text-sm text-rose-600 dark:text-rose-400 mb-1">Database Size</p>
                      <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{dbStats.databaseSize}</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Last Backup</p>
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {dbStats.lastBackup ? new Date(dbStats.lastBackup).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-slate-100">Table Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-slate-300">Table Name</th>
                            <th className="text-right p-3 font-semibold text-gray-700 dark:text-slate-300">Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(dbStats.tables) ? dbStats.tables : []).map((table: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800">
                              <td className="p-3 font-mono text-sm text-gray-900 dark:text-slate-100">{table.name}</td>
                              <td className="p-3 text-right font-medium text-gray-900 dark:text-slate-100">{table.records.toLocaleString()}</td>
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
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-slate-600" />
                  <p>No statistics available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}


