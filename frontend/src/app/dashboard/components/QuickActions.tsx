import React from 'react';
import Link from 'next/link';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Zap,
    Monitor,
    Disc,
    Package,
    AlertCircle,
} from 'lucide-react';

interface QuickActionsProps {
    isHitachi: boolean;
    isSuperAdmin: boolean;
}

export const QuickActions = ({ isHitachi, isSuperAdmin }: QuickActionsProps) => {
    return (
        <Card className="border-2 border-gray-200 dark:border-slate-700 shadow-lg mb-8 animate-slide-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Zap className="h-5 w-5 text-[#2563EB] dark:text-teal-400" />
                    </div>
                    Aksi Cepat
                </CardTitle>
                <CardDescription>Operasi yang sering digunakan</CardDescription>
            </CardHeader>
            <CardContent>
                {isHitachi ? (
                    // Hitachi: All actions
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/machines">
                            <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                                <Monitor className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                <div className="text-center">
                                    <p className="font-semibold">Kelola Mesin</p>
                                    <p className="text-xs opacity-90">Lihat & edit mesin</p>
                                </div>
                            </Button>
                        </Link>

                        <Link href="/cassettes">
                            <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                                <Disc className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                <div className="text-center">
                                    <p className="font-semibold">Kelola Kaset</p>
                                    <p className="text-xs opacity-90">Track inventory</p>
                                </div>
                            </Button>
                        </Link>

                        {isSuperAdmin && (
                            <Link href="/settings?tab=data-management">
                                <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                                    <Package className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <p className="font-semibold">Bulk Import</p>
                                        <p className="text-xs opacity-90">Import data</p>
                                    </div>
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    // Pengelola: Cassettes and Tickets only
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/cassettes">
                            <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                                <Disc className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                <div className="text-center">
                                    <p className="font-semibold">Kelola Kaset</p>
                                    <p className="text-xs opacity-90">Lihat kaset</p>
                                </div>
                            </Button>
                        </Link>

                        <Link href="/service-orders/create?type=repair">
                            <Button className="w-full h-auto py-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 dark:from-teal-500 dark:to-teal-600 dark:hover:from-teal-600 dark:hover:to-teal-700 flex flex-col items-center gap-3 group text-white">
                                <AlertCircle className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                <div className="text-center">
                                    <p className="font-semibold">Buat SO</p>
                                    <p className="text-xs opacity-90">Laporkan masalah</p>
                                </div>
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
