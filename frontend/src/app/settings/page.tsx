'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Users,
  Building2,
  Truck,
  Link2,
  Database,
  Shield,
  Bell,
  Globe,
  Palette,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load components untuk better performance
const UsersTab = dynamic(() => import('@/components/settings/UsersTab'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
});

const BanksTab = dynamic(() => import('@/components/settings/BanksTab'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
});

const VendorsTab = dynamic(() => import('@/components/settings/VendorsTab'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
});

const AssignmentsTab = dynamic(() => import('@/components/settings/AssignmentsTab'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
});

const DataManagementTab = dynamic(() => import('@/components/settings/DataManagementTab'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
});

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');

  // Support query parameter for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['users', 'banks', 'vendors', 'assignments', 'data-management'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if user is admin (HITACHI with SUPER_ADMIN or RC_MANAGER role)
  const isAdmin = user?.userType === 'HITACHI' && (user?.role === 'SUPER_ADMIN' || user?.role === 'RC_MANAGER');

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
              <p className="text-muted-foreground text-center">
                Anda tidak memiliki izin untuk mengakses halaman Settings.
                <br />
                Hanya Super Admin dan RC Manager yang dapat mengakses halaman ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola semua pengaturan sistem, pengguna, dan konfigurasi aplikasi
          </p>
        </div>

        {/* Settings Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5 mb-6">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="banks" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Banks</span>
                </TabsTrigger>
                <TabsTrigger value="vendors" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Vendors</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Assignments</span>
                </TabsTrigger>
                <TabsTrigger value="data-management" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">Data Management</span>
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-0">
                <UsersTab />
              </TabsContent>

              {/* Banks Tab */}
              <TabsContent value="banks" className="mt-0">
                <BanksTab />
              </TabsContent>

              {/* Vendors Tab */}
              <TabsContent value="vendors" className="mt-0">
                <VendorsTab />
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="mt-0">
                <AssignmentsTab />
              </TabsContent>

              {/* Data Management Tab */}
              <TabsContent value="data-management" className="mt-0">
                <DataManagementTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

