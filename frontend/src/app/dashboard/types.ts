import { LucideIcon } from 'lucide-react';

export interface DashboardStats {
    totalMachines: number;
    totalCassettes: number;
    totalBanks: number;
    totalPengelola: number;
    machineTrend: number;
    cassetteTrend: number;
    machineStatus: {
        operational: number;
        underRepair: number;
        inactive: number;
    };
    cassetteStatus: {
        ok: number;
        bad: number;
        inTransit: number;
        inRepair: number;
    };
    healthScore: number;
    topBanks: Array<{
        bankId: string;
        bankName: string;
        branchName: string;
        machineCount: number;
    }>;
    recentActivities: Array<{
        type: string;
        description: string;
        details: string;
        timestamp: Date;
        ticketId?: string;
    }>;
    alerts: {
        criticalTickets: number;
        longRepairs: number;
        badCassettes: number;
    };
    ticketStats?: {
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
    };
    ticketUsageByCassetteAndPengelola?: Array<{
        pengelolaId: string;
        pengelolaName: string;
        cassetteSerialNumber: string;
        openTickets: number;
    }>;
    repairUsageByCassette?: Array<{
        cassetteSerialNumber: string;
        repairCount: number;
    }>;
}

export interface StatCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down';
    trendValue?: string;
    color: {
        gradient: string;
        icon: string;
        iconBg: string;
    };
    link?: string;
    loading?: boolean;
}
