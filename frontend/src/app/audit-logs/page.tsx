'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { FileText, Filter, User, Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layout/PageLayout';

interface AuditLog {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    userType: string;
    oldValue: any;
    newValue: any;
    changes: Record<string, { from: any; to: any }>;
    ipAddress?: string;
    userAgent?: string;
    metadata: any;
    createdAt: string;
}

interface AuditLogsResponse {
    logs: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

function AuditLogsContent() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Check if user is admin
    useEffect(() => {
        if (user && user.userType !== 'HITACHI') {
            router.push('/dashboard');
        }
    }, [user, router]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (entityType) params.append('entityType', entityType);
            if (action) params.append('action', action);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('page', page.toString());
            params.append('limit', '50');

            const response = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
            setLogs(response.data.logs);
            setTotalPages(response.data.pagination.totalPages);
            setTotal(response.data.pagination.total);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [action, endDate, entityType, page, startDate]);

    // Fetch logs when dependencies change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const resetFilters = () => {
        setEntityType('');
        setAction('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
            case 'UPDATE': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'DELETE': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
            case 'STATUS_CHANGE': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
            case 'PICKUP_CONFIRMED': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
            default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
        }
    };

    const getEntityBadgeColor = (entityType: string) => {
        switch (entityType) {
            case 'TICKET': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'CASSETTE': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
            case 'REPAIR': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
            case 'USER': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
            default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
        }
    };

    return (
        <PageLayout>
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            Audit Logs
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Track all system activities and changes
                        </p>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Total: <span className="font-semibold text-slate-900 dark:text-white">{total}</span> entries
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Entity Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Entity Type
                            </label>
                            <select
                                value={entityType}
                                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                            >
                                <option value="">All Types</option>
                                <option value="TICKET">Ticket</option>
                                <option value="CASSETTE">Cassette</option>
                                <option value="REPAIR">Repair</option>
                                <option value="USER">User</option>
                                <option value="PM">Preventive Maintenance</option>
                            </select>
                        </div>

                        {/* Action */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Action
                            </label>
                            <select
                                value={action}
                                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                            >
                                <option value="">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="STATUS_CHANGE">Status Change</option>
                                <option value="PICKUP_CONFIRMED">Pickup Confirmed</option>
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading audit logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">No audit logs found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Entity
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Changes
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={cn(getEntityBadgeColor(log.entityType), "border")}>
                                                    {log.entityType}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={cn(getActionBadgeColor(log.action), "border")}>
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-900 dark:text-slate-100">{log.userType}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {log.changes && Object.keys(log.changes).length > 0 ? (
                                                    <span>{Object.keys(log.changes).length} field(s) changed</span>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Page {page} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Log Details</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Entity Type</label>
                                    <Badge className={cn(getEntityBadgeColor(selectedLog.entityType), "border")}>
                                        {selectedLog.entityType}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Action</label>
                                    <Badge className={cn(getActionBadgeColor(selectedLog.action), "border")}>
                                        {selectedLog.action}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Entity ID</label>
                                    <p className="text-sm text-slate-900 dark:text-slate-200 font-mono break-all">{selectedLog.entityId}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">User Type</label>
                                    <p className="text-sm text-slate-900 dark:text-slate-200">{selectedLog.userType}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Timestamp</label>
                                    <p className="text-sm text-slate-900 dark:text-slate-200">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">IP Address</label>
                                    <p className="text-sm text-slate-900 dark:text-slate-200">{selectedLog.ipAddress || '-'}</p>
                                </div>
                            </div>

                            {/* Changes */}
                            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        Field Changes
                                    </h4>
                                    <div className="space-y-3">
                                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                                            <div key={field} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                                <div className="font-medium text-slate-900 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">{field}</div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">From</span>
                                                        <pre className="text-red-600 dark:text-red-400 font-mono text-xs whitespace-pre-wrap break-all bg-red-50 dark:bg-red-900/20 p-2 rounded">{JSON.stringify(change.from, null, 2)}</pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">To</span>
                                                        <pre className="text-green-600 dark:text-green-400 font-mono text-xs whitespace-pre-wrap break-all bg-green-50 dark:bg-green-900/20 p-2 rounded">{JSON.stringify(change.to, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            {selectedLog.metadata && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Metadata</h4>
                                    <pre className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-sm overflow-x-auto text-slate-700 dark:text-slate-300 font-mono">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Old/New Values (Full) */}
                            {(selectedLog.oldValue || selectedLog.newValue) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                                    {selectedLog.oldValue && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Full Old Value</h4>
                                            <pre className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto text-slate-600 dark:text-slate-400 max-h-60 font-mono custom-scrollbar">
                                                {JSON.stringify(selectedLog.oldValue, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {selectedLog.newValue && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Full New Value</h4>
                                            <pre className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto text-slate-600 dark:text-slate-400 max-h-60 font-mono custom-scrollbar">
                                                {JSON.stringify(selectedLog.newValue, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default function AuditLogsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
                </div>
            </div>
        }>
            <AuditLogsContent />
        </Suspense>
    );
}
