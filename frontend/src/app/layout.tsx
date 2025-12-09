import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ViewportScript } from "@/components/layout/ViewportScript";
import { QueryProvider } from "@/providers/QueryProvider";

// Inter font dengan optimasi untuk readability
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap", // Menampilkan fallback font sambil menunggu Inter dimuat
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "CASTER - Cassette Tracking & Retrieval System",
  description: "CASTER - Cassette Tracking & Retrieval System. Sistem manajemen cassette AC yang terintegrasi untuk memudahkan tracking, maintenance, dan pelaporan inventori Anda.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} style={{ fontSize: '16px', zoom: 1, width: '100%', height: '100%' }}>
      <body className={`${inter.className} antialiased`} style={{ fontSize: '16px', zoom: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden', margin: 0, padding: 0 }}>
        <QueryProvider>
          <ViewportScript />
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

