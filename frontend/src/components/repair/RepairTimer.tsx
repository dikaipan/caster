'use client';

import { useEffect, useState } from 'react';
import { Clock, TimerIcon, AlertTriangle } from 'lucide-react';

interface RepairTimerProps {
    diagnosingStartAt?: string | Date | null;
    repairStartAt?: string | Date | null;
    completedAt?: string | Date | null;
    receivedAtRc?: string | Date | null;
    status: string;
}

export function RepairTimer({
    diagnosingStartAt,
    repairStartAt,
    completedAt,
    receivedAtRc,
    status,
}: RepairTimerProps) {
    const [now, setNow] = useState(new Date());

    // Update setiap detik jika repair masih ongoing
    useEffect(() => {
        if (status === 'COMPLETED') return;

        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    // Calculate elapsed time in milliseconds
    const calculateElapsed = (startDate: string | Date | null | undefined, endDate?: Date) => {
        if (!startDate) return 0;
        const start = new Date(startDate);
        const end = endDate || now;
        return Math.max(0, end.getTime() - start.getTime());
    };

    // Format milliseconds to human readable
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours}j ${remainingMinutes}m`;
        } else if (minutes > 0) {
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Get color based on elapsed time (simple time-based coloring)
    const getColorClass = (ms: number) => {
        const hours = ms / (1000 * 60 * 60);
        
        // Simple time-based coloring (no SLA)
        if (hours < 2) {
            // < 2 hours (good)
            return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        } else if (hours < 4) {
            // 2-4 hours (warning)
            return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
        } else {
            // > 4 hours (long)
            return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        }
    };

    // Calculate total elapsed from receivedAtRc
    const totalElapsed = completedAt
        ? calculateElapsed(receivedAtRc, new Date(completedAt))
        : calculateElapsed(receivedAtRc);

    // Calculate diagnosing time
    const diagnosingTime = diagnosingStartAt
        ? repairStartAt
            ? calculateElapsed(diagnosingStartAt, new Date(repairStartAt))
            : calculateElapsed(diagnosingStartAt)
        : 0;

    // Calculate repair time
    const repairTime = repairStartAt
        ? completedAt
            ? calculateElapsed(repairStartAt, new Date(completedAt))
            : calculateElapsed(repairStartAt)
        : 0;

    // Waiting time (before diagnosing started)
    const waitingTime = diagnosingStartAt
        ? calculateElapsed(receivedAtRc, new Date(diagnosingStartAt))
        : calculateElapsed(receivedAtRc);

    const totalColorClass = getColorClass(totalElapsed);

    // Get status label based on elapsed time
    const getStatusLabel = () => {
        const hours = totalElapsed / (1000 * 60 * 60);
        if (hours < 2) return 'Normal';
        if (hours < 4) return 'Peringatan';
        return 'Lama';
    };
    const statusLabel = getStatusLabel();

    // Debug: Log receivedAtRc value
    if (!receivedAtRc) {
        console.log('RepairTimer: receivedAtRc is missing', { receivedAtRc, status });
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Total Timer - Main Display */}
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${totalColorClass}`}
            >
                <TimerIcon className="h-5 w-5" />
                <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium opacity-75">Total Time</span>
                        <span className="text-xs font-semibold opacity-90">{statusLabel}</span>
                    </div>
                    <span className="text-lg font-bold tabular-nums">
                        {formatTime(totalElapsed)}
                    </span>
                </div>
                {status !== 'COMPLETED' && (
                    <div className="ml-auto flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                        </span>
                        <span className="text-xs font-medium">Live</span>
                    </div>
                )}
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Waiting */}
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
                        <Clock className="h-3 w-3" />
                        <span>Menunggu</span>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatTime(waitingTime)}
                    </span>
                </div>

                {/* Diagnosing */}
                <div className={`p-2 rounded border ${status === 'DIAGNOSING' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                    <div className={`flex items-center gap-1 mb-1 ${status === 'DIAGNOSING' ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        <AlertTriangle className="h-3 w-3" />
                        <span>Diagnosa</span>
                    </div>
                    <span className={`font-semibold tabular-nums ${status === 'DIAGNOSING' ? 'text-yellow-700 dark:text-yellow-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {diagnosingStartAt ? formatTime(diagnosingTime) : '-'}
                    </span>
                </div>

                {/* Repairing */}
                <div className={`p-2 rounded border ${status === 'ON_PROGRESS' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                    <div className={`flex items-center gap-1 mb-1 ${status === 'ON_PROGRESS' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        <TimerIcon className="h-3 w-3" />
                        <span>Perbaikan</span>
                    </div>
                    <span className={`font-semibold tabular-nums ${status === 'ON_PROGRESS' ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {repairStartAt ? formatTime(repairTime) : '-'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default RepairTimer;
