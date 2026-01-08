'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestNewPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to service-orders/create
    router.replace('/service-orders/create?type=repair');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to create ticket...</h1>
      </div>
    </div>
  );
}

