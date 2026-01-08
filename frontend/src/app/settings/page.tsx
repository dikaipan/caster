'use client';
// Force rebuild to fix chunk cache issue

import { useAuthStore } from '@/store/authStore';
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Lock,
  Shield,
  Building2,
  Users,
  Database,
  Briefcase,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { isAdmin } from '@/lib/permissions';

// Import existing settings components
import UsersTab from '@/components/settings/UsersTab';
import BanksTab from '@/components/settings/BanksTab';
import VendorsTab from '@/components/settings/VendorsTab';
import AssignmentsTab from '@/components/settings/AssignmentsTab';
import DataManagementTab from '@/components/settings/DataManagementTab';

export default function SettingsPage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only Hitachi users (SUPER_ADMIN, RC_MANAGER) can see admin tabs
  // Pengelola and Bank users can only see Profile and Security
  const canAccessAdmin = isAdmin(user);

  return (
    <PageLayout>
      <div className="space-y-6 pb-20">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            {canAccessAdmin 
              ? 'Manage your account settings and system configurations.'
              : 'Manage your account settings.'
            }
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <div className="relative">
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="h-auto p-1 bg-muted/50 w-full sm:w-auto flex flex-wrap justify-start">
                <TabsTrigger value="profile" className="flex items-center gap-2 px-4 py-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 px-4 py-2">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </TabsTrigger>

                {/* Admin Tabs */}
                {canAccessAdmin && (
                  <>
                    <div className="w-px h-6 bg-border mx-2 hidden sm:block"></div>
                    <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </TabsTrigger>
                    <TabsTrigger value="banks" className="flex items-center gap-2 px-4 py-2">
                      <Building2 className="h-4 w-4" />
                      <span>Banks</span>
                    </TabsTrigger>
                    <TabsTrigger value="vendors" className="flex items-center gap-2 px-4 py-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Vendors</span>
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="flex items-center gap-2 px-4 py-2">
                      <Layers className="h-4 w-4" />
                      <span>Assignments</span>
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2 px-4 py-2">
                      <Database className="h-4 w-4" />
                      <span>Data</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          </div>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your personal account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                    <p className="text-base font-medium">{user.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Username</span>
                    <p className="text-base font-medium">{user.username}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <p className="text-base font-medium">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Role</span>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {user.role}
                    </div>
                  </div>
                  {user.department && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-muted-foreground">Department</span>
                      <p className="text-base font-medium">{user.department}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <TwoFactorSettings />
          </TabsContent>

          {canAccessAdmin && (
            <>
              <TabsContent value="users" className="space-y-4">
                <UsersTab />
              </TabsContent>

              <TabsContent value="banks" className="space-y-4">
                <BanksTab />
              </TabsContent>

              <TabsContent value="vendors" className="space-y-4">
                <VendorsTab />
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <AssignmentsTab />
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
                <DataManagementTab />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PageLayout>
  );
}
