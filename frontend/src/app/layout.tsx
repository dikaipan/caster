import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LazyToaster from "@/components/pwa/LazyToaster";
import { ViewportScript } from "@/components/layout/ViewportScript";
import { QueryProvider } from "@/providers/QueryProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

// Inter font dengan optimasi untuk readability
// Note: Keeping 700 for h1 (used in globals.css), but removing 300 (light) as it's rarely used
// Most UI uses 400 (normal), 500 (medium), 600 (semibold), 700 (bold for h1)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Reduced from ["300", "400", "500", "600", "700"] - removed 300
  display: "swap", // Menampilkan fallback font sambil menunggu Inter dimuat
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "CASTER - Cassette Tracking & Retrieval System",
  description: "CASTER - Cassette Tracking & Retrieval System. Sistem manajemen cassette AC yang terintegrasi untuk memudahkan tracking, maintenance, dan pelaporan inventori Anda.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CASTER",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#14b8a6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} style={{ fontSize: '16px', zoom: 1, width: '100%', height: '100%' }}>
      <body className={`${inter.className} antialiased`} style={{ fontSize: '16px', zoom: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden', margin: 0, padding: 0 }}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <ViewportScript />
              <ServiceWorkerRegistration />
              {children}
              <LazyToaster />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

