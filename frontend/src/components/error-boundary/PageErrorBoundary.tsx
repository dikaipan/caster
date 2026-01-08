'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';

interface PageErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Error Boundary khusus untuk halaman/halaman spesifik
 * Menyediakan fallback yang lebih kontekstual
 */
export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error untuk debugging
        console.error('Page Error:', error, errorInfo);
        // Send to Sentry error tracking
        Sentry.captureException(error, {
          extra: { componentStack: errorInfo?.componentStack }
        });
      }}
      fallback={
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-12 w-12 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Gagal Memuat Halaman
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Terjadi kesalahan saat memuat halaman ini. Silakan refresh halaman atau kembali ke dashboard.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.refresh()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Refresh Halaman
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

