import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { StatCardProps } from '../types';

export const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, link, loading }: StatCardProps) => (
    <Link href={link || '#'}>
        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 animate-fade-in`}>
            <div className={`absolute inset-0 ${color.gradient} opacity-10`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">{title}</CardTitle>
                <div className={`p-3 rounded-xl ${color.iconBg} dark:bg-slate-700/50`}>
                    <Icon className={`h-6 w-6 ${color.icon}`} />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                    {loading ? '...' : (value || 0).toLocaleString()}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <TrendingUp className={`h-4 w-4 ${trend === 'down' && 'rotate-180'}`} />
                        <span className="font-medium">{trendValue}</span>
                        <span className="text-gray-500 dark:text-slate-500">vs last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    </Link>
);
