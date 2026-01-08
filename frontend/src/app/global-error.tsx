'use client';

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-red-600">
            Terjadi Kesalahan
          </h2>
          <p className="text-slate-700">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Kembali ke Dashboard
            </button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-2 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium">
                Detail error (hanya di development)
              </summary>
              <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-auto">
                {error.message}
                {error.stack && (
                  <>
                    {"\n\n"}
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}


