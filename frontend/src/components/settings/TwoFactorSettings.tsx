'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ShieldCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useAuthStore } from '@/store/authStore';

export function TwoFactorSettings() {
    const [isLoading, setIsLoading] = useState(false);
    const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showSetup, setShowSetup] = useState(false);
    const { toast } = useToast();
    const { user, updateUser, fetchProfile } = useAuthStore();

    // Fetch fresh profile on mount to ensure status is correct
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSetup = async () => {
        setIsLoading(true);
        try {
            const data = await authApi.setup2FA();
            setSetupData(data);
            setShowSetup(true);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to initialize 2FA setup',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySetup = async () => {
        setIsLoading(true);
        try {
            const data = await authApi.verifySetup(verificationCode);
            // Backend returns backupCodes as an array
            const codes = typeof data.backupCodes === 'string'
                ? JSON.parse(data.backupCodes)
                : data.backupCodes;
            setBackupCodes(codes);

            // Update local user state immediately
            if (data.user) {
                updateUser(data.user);
            }

            toast({
                title: 'Success',
                description: '2FA has been enabled successfully',
            });
            setSetupData(null);
            setShowSetup(false);
            setVerificationCode('');
            // onUpdate(); // No longer needed as we update store directly
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Invalid verification code',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable = async () => {
        setIsLoading(true);
        try {
            if (!verificationCode) {
                toast({
                    title: "Verification Required",
                    description: "Please enter a code from your authenticator app to confirm disabling 2FA.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            const data = await authApi.disable2FA(verificationCode);

            // Update local user state immediately
            if (data.user) {
                updateUser(data.user);
            }

            toast({
                title: 'Success',
                description: '2FA has been disabled',
            });
            setBackupCodes([]);
            setVerificationCode('');
            // onUpdate(); // No longer needed
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to disable 2FA',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const is2FAEnabled = user?.twoFactorEnabled ?? false;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                    Add an extra layer of security to your account requesting a code from your authenticator app.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Enable 2FA</Label>
                        <p className="text-sm text-slate-500">
                            {is2FAEnabled ? 'Your account is secured with 2FA.' : 'Protect your account with 2FA.'}
                        </p>
                    </div>
                    <Switch
                        checked={is2FAEnabled}
                        onCheckedChange={(checked: boolean) => {
                            if (checked) {
                                handleSetup();
                            } else {
                                // To disable, we show an input for code verification first
                                // Using alert dialog would be better but keeping simple for now
                                // Just toggle "showSetup" mode to reveal disable input? 
                                // Let's rely on the user inputting code in a separate section if disabled.
                            }
                        }}
                        disabled={isLoading || (is2FAEnabled && !showSetup)} // Disable switch if already enabled (use button below) or loading
                    />
                </div>

                {/* 2FA Enabled State - Disabling UI */}
                {is2FAEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                        <Alert>
                            <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>2FA is Active</AlertTitle>
                            <AlertDescription>
                                Your account is currently protected. To disable 2FA, enter a code below.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-4 items-end">
                            <div className="grid gap-2 flex-1">
                                <Label>Authenticator Code</Label>
                                <Input
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                />
                            </div>
                            <Button variant="destructive" onClick={handleDisable} disabled={isLoading || !verificationCode}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Disable 2FA
                            </Button>
                        </div>

                        {user?.twoFactorBackupCodes && (
                            <div className="mt-4">
                                <p className="text-sm font-semibold mb-2">Backup Codes</p>
                                <p className="text-xs text-slate-500 mb-2">Save these codes in a safe place. You can use them if you lose access to your authenticator app.</p>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-4 rounded-md">
                                    {/* We don't have codes here unless we just enabled it. 
                             Backend doesn't send them back on profile fetch for security usually.
                             Only show if available in local state (just enabled).
                         */}
                                    {backupCodes.length > 0 ? (
                                        backupCodes.map((code, i) => (
                                            <code key={i} className="text-sm font-mono">{code}</code>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400">Hidden for security (generated on setup)</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Setup Wizard */}
                {showSetup && !is2FAEnabled && setupData && (
                    <div className="space-y-6 pt-4 border-t animate-in fade-in slide-in-from-top-4">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col items-center justify-center p-6 bg-white border rounded-lg">
                                {/* QR Code */}
                                <div className="relative w-48 h-48 mb-4">
                                    <Image
                                        src={setupData.qrCode}
                                        alt="2FA QR Code"
                                        width={192}
                                        height={192}
                                        className="object-contain"
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-500 mb-2">Scan with Google Authenticator or Authy</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Manual Entry Key</Label>
                                    <div className="flex gap-2">
                                        <Input value={setupData.secret} readOnly className="font-mono text-sm" />
                                        <Button size="icon" variant="outline" onClick={() => {
                                            navigator.clipboard.writeText(setupData.secret);
                                            toast({ title: "Copied", description: "Secret key copied to clipboard" });
                                        }}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Verification Code</Label>
                                    <Input
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Enter the code from your app to verify and enable.
                                    </p>
                                </div>

                                <Button className="w-full" onClick={handleVerifySetup} disabled={isLoading || !verificationCode}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verify & Enable
                                </Button>
                            </div>
                        </div>

                        {backupCodes.length > 0 && (
                            <Alert className="bg-green-50 border-green-200">
                                <Check className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    Your backup codes:
                                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
                                        {backupCodes.map((code, i) => <div key={i}>{code}</div>)}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
