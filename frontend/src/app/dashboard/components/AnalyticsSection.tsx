import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Activity,
    AlertCircle,
    Disc,
    Download,
    Filter,
    Info,
    Loader2,
    Package,
    Receipt,
    Users,
    Wrench,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { CassetteAnalyticsSection } from './CassetteAnalyticsSection';

// Dynamically import chart components to reduce initial bundle size
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

interface AnalyticsSectionProps {
    user: any;
    isHitachi: boolean;
}

export function AnalyticsSection({ user, isHitachi }: AnalyticsSectionProps) {
    const [operationalMetrics, setOperationalMetrics] = useState<any>(null);
    const [cassetteAnalytics, setCassetteAnalytics] = useState<any>(null);
    const [repairAnalytics, setRepairAnalytics] = useState<any>(null);
    const [soAnalytics, setSoAnalytics] = useState<any>(null);
    const [pengelolaComparison, setPengelolaComparison] = useState<any[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [metricsInsightOpen, setMetricsInsightOpen] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [selectedPengelolaId, setSelectedPengelolaId] = useState<string>('');
    const [banks, setBanks] = useState<any[]>([]);
    const [pengelolaList, setPengelolaList] = useState<any[]>([]);

    // Set default date range (last 90 days to get more data)
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90); // Changed from 30 to 90 days to get more data
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    }, []);

    // Load banks and pengelola for filter
    useEffect(() => {
        if (isHitachi) {
            api.get('/banks').then(res => {
                setBanks(res.data || []);
            }).catch(() => { });

            api.get('/pengelola').then(res => {
                setPengelolaList(res.data || []);
            }).catch(() => { });
        }
    }, [isHitachi]);

    // Load analytics data
    const loadAnalytics = useCallback(async () => {
        // Allow loading without date filter (will show all data)
        // If dates are provided, use them; otherwise, don't send date params
        setLoadingAnalytics(true);
        setAnalyticsError(null);

        try {
            const params: any = {};

            // Only add date params if both dates are provided
            if (startDate && endDate) {
                params.startDate = new Date(startDate).toISOString();
                params.endDate = new Date(endDate).toISOString();
            }
            if (selectedBankId) {
                params.bankId = selectedBankId;
            }
            if (selectedPengelolaId) {
                params.pengelolaId = selectedPengelolaId;
            }

            const [opMetrics, cassAnalytics, repAnalytics, soAnalyticsData, pengelolaComp] = await Promise.all([
                api.get('/analytics/operational-metrics', { params }).catch((err) => {
                    console.error('Error fetching operational-metrics:', err);
                    return { data: null };
                }),
                api.get('/analytics/cassette-analytics', { params }).catch((err) => {
                    console.error('Error fetching cassette-analytics:', err);
                    return { data: null };
                }),
                api.get('/analytics/repair-analytics', { params }).catch((err) => {
                    console.error('Error fetching repair-analytics:', err);
                    return { data: null };
                }),
                api.get('/analytics/service-order-analytics', { params }).catch((err) => {
                    console.error('Error fetching service-order-analytics:', err);
                    return { data: null };
                }),
                api.get('/analytics/pengelola-comparison', { params }).catch((err) => {
                    console.error('Error fetching pengelola-comparison:', err);
                    return { data: [] };
                }),
            ]);

            // Log for debugging
            console.log('[Analytics] Loaded data:', {
                operationalMetrics: opMetrics.data ? 'OK' : 'null',
                cassetteAnalytics: cassAnalytics.data ? 'OK' : 'null',
                repairAnalytics: repAnalytics.data ? 'OK' : 'null',
                soAnalytics: soAnalyticsData.data ? 'OK' : 'null',
                pengelolaComparison: pengelolaComp.data?.length || 0,
            });

            setOperationalMetrics(opMetrics.data);
            setCassetteAnalytics(cassAnalytics.data);
            setRepairAnalytics(repAnalytics.data);
            setSoAnalytics(soAnalyticsData.data);
            setPengelolaComparison(pengelolaComp.data || []);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Gagal memuat data analitik';
            setAnalyticsError(errorMessage);
            // Error loading analytics - handled by error state
        } finally {
            setLoadingAnalytics(false);
        }
    }, [startDate, endDate, selectedBankId, selectedPengelolaId]);

    useEffect(() => {
        // Load analytics even if dates are not set (will show all data)
        // This allows users to see data without date filter
        loadAnalytics();
    }, [startDate, endDate, selectedBankId, selectedPengelolaId, loadAnalytics]);

    return (
        <div className="space-y-8">
            {/* Filters */}
            <Card className="border-2 border-gray-200 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Analitik
                    </CardTitle>
                    <CardDescription>Pilih periode dan filter untuk melihat analitik</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Tanggal Mulai</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Tanggal Akhir</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        {isHitachi && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="bankFilter">Filter Bank</Label>
                                    <Select value={selectedBankId || 'all'} onValueChange={(value) => setSelectedBankId(value === 'all' ? '' : value)}>
                                        <SelectTrigger id="bankFilter">
                                            <SelectValue placeholder="Semua Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Bank</SelectItem>
                                            {Array.isArray(banks) && banks.map(bank => (
                                                <SelectItem key={bank.id} value={bank.id}>
                                                    {bank.bankName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pengelolaFilter">Filter Pengelola</Label>
                                    <Select value={selectedPengelolaId || 'all'} onValueChange={(value) => setSelectedPengelolaId(value === 'all' ? '' : value)}>
                                        <SelectTrigger id="pengelolaFilter">
                                            <SelectValue placeholder="Semua Pengelola" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Pengelola</SelectItem>
                                            {Array.isArray(pengelolaList) && pengelolaList.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.companyName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {analyticsError && (
                <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-semibold">Error: {analyticsError}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* A. Metrik Performa Operasional */}
                    <Card className="border-2 border-gray-200 dark:border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        Metrik Performa Operasional
                                    </CardTitle>
                                    <CardDescription>MTTR, MTBF, Cycle Time, dan Turnaround Time</CardDescription>
                                </div>
                                <Dialog open={metricsInsightOpen} onOpenChange={setMetricsInsightOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                Penjelasan Perhitungan Metrik Operasional
                                            </DialogTitle>
                                            <DialogDescription>
                                                Penjelasan detail tentang cara perhitungan MTTR, MTBF, Cycle Time, dan Turnaround Time
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-6 mt-4">
                                            {/* MTTR */}
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                                    MTTR (Mean Time To Repair)
                                                </h3>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                                    <strong>Definisi:</strong> Rata-rata waktu yang dibutuhkan untuk memperbaiki kaset dari saat diterima di Repair Center (RC) hingga selesai diperbaiki.
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                                                    <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                                                        <strong>Rumus:</strong>
                                                    </p>
                                                    <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                                                        MTTR = Σ(Waktu Perbaikan) / Jumlah Perbaikan yang Selesai
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                                                        <strong>Keterangan:</strong>
                                                    </p>
                                                    <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                                                        <li>Waktu Perbaikan = completedAt - receivedAtRc (dalam hari)</li>
                                                        <li>Hanya menghitung perbaikan dengan status COMPLETED</li>
                                                        <li>Hanya menghitung perbaikan yang memiliki receivedAtRc dan completedAt</li>
                                                        <li>Satuan: Hari</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* MTBF */}
                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                                    MTBF (Mean Time Between Failures)
                                                </h3>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                                    <strong>Definisi:</strong> Rata-rata waktu antara dua kegagalan berturut-turut pada kaset yang sama.
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-700">
                                                    <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                                                        <strong>Rumus:</strong>
                                                    </p>
                                                    <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                                                        MTBF = Σ(Waktu Antara Kegagalan) / Jumlah Interval Kegagalan
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                                                        <strong>Keterangan:</strong>
                                                    </p>
                                                    <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                                                        <li>Menghitung selisih waktu antara completedAt dari perbaikan sebelumnya dan perbaikan berikutnya untuk kaset yang sama</li>
                                                        <li>Hanya menghitung kaset yang memiliki lebih dari 1 perbaikan (multiple failures)</li>
                                                        <li>Interval dihitung dari perbaikan pertama ke perbaikan kedua, kedua ke ketiga, dst.</li>
                                                        <li>Satuan: Hari</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Cycle Time */}
                                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                                                    Cycle Time (Waktu Siklus)
                                                </h3>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                                    <strong>Definisi:</strong> Rata-rata waktu total dari pembuatan Service Order (ticket) hingga perbaikan selesai.
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-orange-200 dark:border-orange-700">
                                                    <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                                                        <strong>Rumus:</strong>
                                                    </p>
                                                    <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                                                        Cycle Time ≈ MTTR (saat ini menggunakan pendekatan MTTR)
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                                                        <strong>Keterangan:</strong>
                                                    </p>
                                                    <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                                                        <li>Cycle Time lengkap = dari reportedAt (ticket creation) hingga completedAt (repair completion)</li>
                                                        <li>Saat ini menggunakan MTTR sebagai pendekatan karena memerlukan linking yang lebih akurat antara ticket dan repair</li>
                                                        <li>Cycle Time penuh akan mencakup: waktu pelaporan, pengiriman ke RC, perbaikan, dan QC</li>
                                                        <li>Satuan: Hari</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Turnaround Time */}
                                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                                                    Turnaround Time (Waktu Putar Balik)
                                                </h3>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                                    <strong>Definisi:</strong> Rata-rata waktu dari saat kaset diterima di Repair Center (RC) hingga selesai diperbaiki dan siap dikembalikan.
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                                                    <p className="text-xs font-mono text-gray-800 dark:text-slate-200 mb-2">
                                                        <strong>Rumus:</strong>
                                                    </p>
                                                    <p className="text-xs text-gray-700 dark:text-slate-300 mb-1">
                                                        Turnaround Time = Σ(completedAt - receivedAtRc) / Jumlah Perbaikan
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
                                                        <strong>Keterangan:</strong>
                                                    </p>
                                                    <ul className="text-xs text-gray-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                                                        <li>Waktu dihitung dari receivedAtRc (saat diterima di RC) hingga completedAt (saat perbaikan selesai)</li>
                                                        <li>Hanya menghitung perbaikan dengan status COMPLETED</li>
                                                        <li>Hanya menghitung perbaikan yang memiliki receivedAtRc dan completedAt</li>
                                                        <li>Turnaround Time = MTTR (keduanya menggunakan perhitungan yang sama)</li>
                                                        <li>Satuan: Hari</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Catatan Penting */}
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Catatan Penting
                                                </h3>
                                                <ul className="text-xs text-gray-700 dark:text-slate-300 list-disc list-inside space-y-1">
                                                    <li>Semua perhitungan hanya menggunakan data perbaikan yang <strong>COMPLETED</strong></li>
                                                    <li>Perbaikan yang tidak memiliki <strong>receivedAtRc</strong> atau <strong>completedAt</strong> tidak dihitung</li>
                                                    <li>Data yang dihitung dapat difilter berdasarkan periode, bank, atau pengelola</li>
                                                    <li>Metrik ini membantu mengukur efisiensi operasional Repair Center</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {operationalMetrics ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">MTTR</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {operationalMetrics.mttr.toFixed(1)} hari
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Mean Time To Repair</p>
                                    </div>
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">MTBF</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {operationalMetrics.mtbf.toFixed(1)} hari
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Mean Time Between Failures</p>
                                    </div>
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Cycle Time</p>
                                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                            {operationalMetrics.avgCycleTime.toFixed(1)} hari
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Rata-rata waktu perbaikan</p>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Turnaround Time</p>
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {operationalMetrics.avgTurnaroundTime.toFixed(1)} hari
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Waktu dari RC ke selesai</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Tidak ada data metrik operasional</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* B. Analitik Kaset (lazy) */}
                    <Card className="border-2 border-gray-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Disc className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                Analitik Kaset
                            </CardTitle>
                            <CardDescription>Top 10 kaset bermasalah, distribusi cycle problem, usia kaset, dan utilization rate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-gray-500">Memuat analitik kaset...</div>}>
                                <CassetteAnalyticsSection cassetteAnalytics={cassetteAnalytics} />
                            </Suspense>
                        </CardContent>
                    </Card>

                    {/* D. Analitik Perbaikan */}
                    <Card className="border-2 border-gray-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                Analitik Perbaikan
                            </CardTitle>
                            <CardDescription>Repair success rate, parts replacement frequency, dan top issues</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {repairAnalytics ? (
                                <div className="space-y-6">
                                    {/* Success Rate */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Success Rate</p>
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                                {repairAnalytics.successRate.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                                {repairAnalytics.qcPassed} dari {repairAnalytics.completedRepairs} perbaikan lulus QC
                                            </p>
                                        </div>
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Perbaikan</p>
                                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                                {repairAnalytics.totalRepairs}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                                {repairAnalytics.completedRepairs} selesai
                                            </p>
                                        </div>
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Parts Replaced</p>
                                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                                {repairAnalytics.partsReplacedCount}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                                Jenis komponen berbeda
                                            </p>
                                        </div>
                                    </div>

                                    {/* Top Issues */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Top 10 Issues</h3>
                                        {repairAnalytics.topIssues && Array.isArray(repairAnalytics.topIssues) && repairAnalytics.topIssues.length > 0 ? (
                                            <div className="h-64">
                                                <Bar
                                                    data={{
                                                        labels: repairAnalytics.topIssues.map((item: any) =>
                                                            item.issue.length > 30 ? item.issue.substring(0, 30) + '...' : item.issue
                                                        ),
                                                        datasets: [{
                                                            label: 'Frekuensi',
                                                            data: repairAnalytics.topIssues.map((item: any) => item.count),
                                                            backgroundColor: 'rgba(249, 115, 22, 0.6)',
                                                            borderColor: 'rgba(249, 115, 22, 1)',
                                                            borderWidth: 1,
                                                        }],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                            tooltip: {
                                                                callbacks: {
                                                                    title: (context: any) => {
                                                                        const item = repairAnalytics.topIssues[context[0].dataIndex];
                                                                        return item.issue;
                                                                    },
                                                                },
                                                            },
                                                        },
                                                        scales: {
                                                            x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                                            y: { beginAtZero: true },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Tidak ada data</p>
                                        )}
                                    </div>

                                    {/* Top Parts */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Top 10 Parts Replacement</h3>
                                        {repairAnalytics.topParts && Array.isArray(repairAnalytics.topParts) && repairAnalytics.topParts.length > 0 ? (
                                            <div className="h-64">
                                                <Bar
                                                    data={{
                                                        labels: repairAnalytics.topParts.map((item: any) => item.part),
                                                        datasets: [{
                                                            label: 'Frekuensi',
                                                            data: repairAnalytics.topParts.map((item: any) => item.count),
                                                            backgroundColor: 'rgba(99, 102, 241, 0.6)',
                                                            borderColor: 'rgba(99, 102, 241, 1)',
                                                            borderWidth: 1,
                                                        }],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                        },
                                                        scales: {
                                                            x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                                            y: { beginAtZero: true },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Tidak ada data</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                    <Wrench className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Tidak ada data analitik perbaikan</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* C. Analitik Service Order (SO) */}
                    <Card className="border-2 border-gray-200 dark:border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        Analitik Service Order (SO)
                                    </CardTitle>
                                    <CardDescription>Trend SO, distribusi prioritas, per bank, per pengelola, dan waktu resolusi</CardDescription>
                                </div>
                                {isHitachi && soAnalytics && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Export to Excel/PDF functionality
                                            const data = {
                                                period: `${startDate} - ${endDate}`,
                                                ...soAnalytics,
                                            };
                                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `SO_Analytics_${startDate}_${endDate}.json`;
                                            a.click();
                                        }}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {soAnalytics ? (
                                <div className="space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total SO</p>
                                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                                {soAnalytics.total}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Resolved</p>
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                                {soAnalytics.resolvedCount}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Open</p>
                                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                                {soAnalytics.openCount}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Resolution</p>
                                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                                {soAnalytics.avgResolutionTime.toFixed(1)} hari
                                            </p>
                                        </div>
                                    </div>

                                    {/* Monthly Trend */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Trend SO per Bulan</h3>
                                        {Object.keys(soAnalytics.monthlyTrend).length > 0 ? (
                                            <div className="h-64">
                                                <Line
                                                    data={{
                                                        labels: Object.keys(soAnalytics.monthlyTrend).sort(),
                                                        datasets: [{
                                                            label: 'Jumlah SO',
                                                            data: Object.keys(soAnalytics.monthlyTrend).sort().map(key => soAnalytics.monthlyTrend[key]),
                                                            borderColor: 'rgba(59, 130, 246, 1)',
                                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                            tension: 0.4,
                                                            fill: true,
                                                        }],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                        },
                                                        scales: {
                                                            y: { beginAtZero: true },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Tidak ada data</p>
                                        )}
                                    </div>

                                    {/* By Priority & Status */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Distribusi Prioritas</h3>
                                            {Object.keys(soAnalytics.byPriority).length > 0 ? (
                                                <div className="h-64">
                                                    <Bar
                                                        data={{
                                                            labels: Object.keys(soAnalytics.byPriority),
                                                            datasets: [{
                                                                label: 'Jumlah SO',
                                                                data: Object.values(soAnalytics.byPriority),
                                                                backgroundColor: [
                                                                    'rgba(34, 197, 94, 0.6)',
                                                                    'rgba(234, 179, 8, 0.6)',
                                                                    'rgba(249, 115, 22, 0.6)',
                                                                    'rgba(239, 68, 68, 0.6)',
                                                                ],
                                                                borderColor: [
                                                                    'rgba(34, 197, 94, 1)',
                                                                    'rgba(234, 179, 8, 1)',
                                                                    'rgba(249, 115, 22, 1)',
                                                                    'rgba(239, 68, 68, 1)',
                                                                ],
                                                                borderWidth: 1,
                                                            }],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: { display: false },
                                                            },
                                                            scales: {
                                                                y: { beginAtZero: true },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">Tidak ada data</p>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Distribusi Status</h3>
                                            {Object.keys(soAnalytics.byStatus).length > 0 ? (
                                                <div className="h-64">
                                                    <Bar
                                                        data={{
                                                            labels: Object.keys(soAnalytics.byStatus),
                                                            datasets: [{
                                                                label: 'Jumlah SO',
                                                                data: Object.values(soAnalytics.byStatus),
                                                                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                                                                borderColor: 'rgba(99, 102, 241, 1)',
                                                                borderWidth: 1,
                                                            }],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: { display: false },
                                                            },
                                                            scales: {
                                                                y: { beginAtZero: true },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">Tidak ada data</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* By Bank & By Pengelola */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Top 10 Bank</h3>
                                            {soAnalytics.byBank && Array.isArray(soAnalytics.byBank) && soAnalytics.byBank.length > 0 ? (
                                                <div className="h-64">
                                                    <Bar
                                                        data={{
                                                            labels: soAnalytics.byBank.map((b: any) => b.bankName),
                                                            datasets: [{
                                                                label: 'Jumlah SO',
                                                                data: soAnalytics.byBank.map((b: any) => b.count),
                                                                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                                                borderColor: 'rgba(59, 130, 246, 1)',
                                                                borderWidth: 1,
                                                            }],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: { display: false },
                                                            },
                                                            scales: {
                                                                x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                                                y: { beginAtZero: true },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">Tidak ada data</p>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Top 10 Pengelola</h3>
                                            {soAnalytics.byPengelola && Array.isArray(soAnalytics.byPengelola) && soAnalytics.byPengelola.length > 0 ? (
                                                <div className="h-64">
                                                    <Bar
                                                        data={{
                                                            labels: soAnalytics.byPengelola.map((p: any) => p.pengelolaName),
                                                            datasets: [{
                                                                label: 'Jumlah SO',
                                                                data: soAnalytics.byPengelola.map((p: any) => p.count),
                                                                backgroundColor: 'rgba(139, 92, 246, 0.6)',
                                                                borderColor: 'rgba(139, 92, 246, 1)',
                                                                borderWidth: 1,
                                                            }],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: { display: false },
                                                            },
                                                            scales: {
                                                                x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                                                y: { beginAtZero: true },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">Tidak ada data</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Tidak ada data analitik SO</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Perbandingan Antar Pengelola */}
                    {isHitachi && (
                        <Card className="border-2 border-gray-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    Perbandingan Antar Pengelola
                                </CardTitle>
                                <CardDescription>Performa pengelola berdasarkan jumlah SO, resolution rate, dan waktu resolusi</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pengelolaComparison.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Comparison Chart */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Total SO per Pengelola</h3>
                                            <div className="h-64">
                                                <Bar
                                                    data={{
                                                        labels: pengelolaComparison.map((p: any) => p.pengelolaName),
                                                        datasets: [{
                                                            label: 'Total SO',
                                                            data: pengelolaComparison.map((p: any) => p.totalTickets),
                                                            backgroundColor: 'rgba(99, 102, 241, 0.6)',
                                                            borderColor: 'rgba(99, 102, 241, 1)',
                                                            borderWidth: 1,
                                                        }],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                        },
                                                        scales: {
                                                            x: { ticks: { maxRotation: 45, minRotation: 45 } },
                                                            y: { beginAtZero: true },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Comparison Table */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Detail Performa</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b bg-gray-50 dark:bg-slate-800">
                                                            <th className="text-left p-3 font-semibold">Pengelola</th>
                                                            <th className="text-right p-3 font-semibold">Total SO</th>
                                                            <th className="text-right p-3 font-semibold">Resolved</th>
                                                            <th className="text-right p-3 font-semibold">Resolution Rate</th>
                                                            <th className="text-right p-3 font-semibold">Avg Resolution</th>
                                                            <th className="text-right p-3 font-semibold">Critical</th>
                                                            <th className="text-right p-3 font-semibold">High Priority</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pengelolaComparison.map((p: any) => (
                                                            <tr key={p.pengelolaId} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                                                                <td className="p-3 align-middle font-medium text-gray-900 dark:text-slate-100">
                                                                    {p.pengelolaName}
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-gray-900 dark:text-slate-100">
                                                                    {p.totalTickets}
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-green-600 dark:text-green-400">
                                                                    {p.resolvedTickets}
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-blue-600 dark:text-blue-400">
                                                                    {p.resolutionRate.toFixed(1)}%
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-gray-700 dark:text-slate-200">
                                                                    {p.avgResolutionTime.toFixed(1)} hari
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-red-600 dark:text-red-400">
                                                                    {p.criticalTickets}
                                                                </td>
                                                                <td className="p-3 align-middle text-right text-orange-600 dark:text-orange-400">
                                                                    {p.highPriorityTickets}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                        <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Tidak ada data perbandingan pengelola</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
