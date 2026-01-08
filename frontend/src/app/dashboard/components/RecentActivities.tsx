import React from 'react';
import Link from 'next/link';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import {
    Activity,
    Package,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { DashboardStats } from '../types';

interface RecentActivitiesProps {
    recentActivities: DashboardStats['recentActivities'];
    loading: boolean;
}

export const RecentActivities = ({ recentActivities, loading }: RecentActivitiesProps) => {
    return (
        <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg animate-slide-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Activity className="h-5 w-5 text-[#2563EB] dark:text-teal-400" />
                    </div>
                    Aktivitas Terbaru
                </CardTitle>
                <CardDescription>Aktivitas Service Order terbaru</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB] dark:text-teal-400" />
                    </div>
                ) : Array.isArray(recentActivities) && recentActivities.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                        {recentActivities.map((activity, idx) => {
                            const getActivityIcon = () => {
                                if (activity.type === 'ticket_created') return Package;
                                if (activity.type === 'ticket_resolved') return CheckCircle2;
                                return AlertCircle;
                            };

                            const getActivityColor = () => {
                                if (activity.type === 'ticket_created') return 'bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] dark:text-teal-400';
                                if (activity.type === 'ticket_resolved') return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
                                return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
                            };

                            const ActivityIcon = getActivityIcon();

                            return (
                                <Link
                                    key={idx}
                                    href={activity.ticketId ? `/tickets/${activity.ticketId}` : '#'}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors border border-gray-100 dark:border-slate-700 cursor-pointer"
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${getActivityColor()}`}>
                                        <ActivityIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{activity.description}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{activity.details}</p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                            {new Date(activity.timestamp).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada aktivitas terbaru</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
