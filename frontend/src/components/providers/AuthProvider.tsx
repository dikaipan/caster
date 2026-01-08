'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const loadUser = useAuthStore((state) => state.loadUser);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    return <>{children}</>;
}
