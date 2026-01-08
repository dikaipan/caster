'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayCircle, PauseCircle, Square, RotateCcw, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ManualRepairTimerProps {
  normalTimeHours?: number; // Waktu normal dalam jam (optional, default: 4 jam)
  onTimeUpdate?: (elapsedMs: number) => void; // Callback saat waktu berubah
  initialElapsedMs?: number; // Waktu awal jika ada (untuk resume)
}

type TimerState = 'idle' | 'running' | 'paused';

export function ManualRepairTimer({
  normalTimeHours: propNormalTimeHours,
  onTimeUpdate,
  initialElapsedMs = 0,
}: ManualRepairTimerProps) {
  // Use prop or default to 4 hours
  const normalTimeHours = propNormalTimeHours || 4;
  const [state, setState] = useState<TimerState>('idle');
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Normal time in milliseconds
  const normalTimeMs = normalTimeHours * 60 * 60 * 1000;

  // Update timer setiap detik
  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const newElapsed = elapsedMs + (now - startTimeRef.current);
          setElapsedMs(newElapsed);
          onTimeUpdate?.(newElapsed);
          startTimeRef.current = now;
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, elapsedMs, onTimeUpdate]);

  const handleStart = () => {
    if (state === 'idle' || state === 'paused') {
      startTimeRef.current = Date.now();
      setState('running');
      setPausedAt(null);
    }
  };

  const handlePause = () => {
    if (state === 'running') {
      if (startTimeRef.current !== null) {
        const now = Date.now();
        const additionalTime = now - startTimeRef.current;
        setElapsedMs(prev => prev + additionalTime);
        startTimeRef.current = null;
      }
      setPausedAt(Date.now());
      setState('paused');
    }
  };

  const handleResume = () => {
    if (state === 'paused') {
      startTimeRef.current = Date.now();
      setState('running');
      setPausedAt(null);
    }
  };

  const handleStop = () => {
    if (state === 'running') {
      if (startTimeRef.current !== null) {
        const now = Date.now();
        const additionalTime = now - startTimeRef.current;
        setElapsedMs(prev => prev + additionalTime);
        startTimeRef.current = null;
      }
    }
    setState('idle');
    setPausedAt(null);
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState('idle');
    setElapsedMs(0);
    setPausedAt(null);
    startTimeRef.current = null;
    onTimeUpdate?.(0);
  };

  // Format waktu
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}j ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Tentukan status berdasarkan perbandingan dengan waktu normal
  const getStatus = () => {
    if (elapsedMs === 0) return 'idle';
    const percentage = (elapsedMs / normalTimeMs) * 100;
    
    if (percentage < 80) return 'normal'; // < 80% dari waktu normal
    if (percentage < 100) return 'warning'; // 80-100% dari waktu normal
    return 'exceeded'; // > 100% dari waktu normal
  };

  const status = getStatus();
  const statusConfig = {
    idle: {
      label: 'Belum Dimulai',
      color: 'text-slate-500 dark:text-slate-400',
      bgColor: 'bg-slate-50 dark:bg-slate-800/50',
      borderColor: 'border-slate-200 dark:border-slate-700',
      icon: Clock,
    },
    normal: {
      label: 'Normal',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
    },
    warning: {
      label: 'Peringatan',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
    },
    exceeded: {
      label: 'Melewati Normal',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: AlertTriangle,
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  // Hitung persentase
  const percentage = elapsedMs > 0 ? Math.min(100, (elapsedMs / normalTimeMs) * 100) : 0;

  return (
    <Card className={`border-2 ${currentStatus.borderColor} ${currentStatus.bgColor}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header dengan Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${currentStatus.color}`} />
              <span className={`text-sm font-semibold ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Normal: {normalTimeHours} jam
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center space-y-2">
            <div className={`text-3xl font-bold tabular-nums ${currentStatus.color}`}>
              {formatTime(elapsedMs)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              dari {formatTime(normalTimeMs)} (normal)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status === 'normal'
                    ? 'bg-green-500'
                    : status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 justify-center flex-wrap">
            {state === 'idle' && (
              <Button
                onClick={handleStart}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}

            {state === 'running' && (
              <>
                <Button
                  onClick={handlePause}
                  size="sm"
                  variant="outline"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={handleStop}
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {state === 'paused' && (
              <>
                <Button
                  onClick={handleResume}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button
                  onClick={handleStop}
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {(state === 'paused' || elapsedMs > 0) && (
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="border-slate-300 dark:border-slate-600"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          {/* Status Info */}
          {status !== 'idle' && (
            <div className={`text-xs text-center p-2 rounded ${currentStatus.bgColor} ${currentStatus.color}`}>
              {status === 'normal' && '✅ Waktu masih dalam batas normal'}
              {status === 'warning' && '⚠️ Waktu mendekati batas normal'}
              {status === 'exceeded' && '❌ Waktu sudah melewati batas normal'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ManualRepairTimer;

