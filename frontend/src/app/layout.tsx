import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Inter font dengan optimasi untuk readability
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap", // Menampilkan fallback font sambil menunggu Inter dimuat
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "HITACHI Cassette Management",
  description: "Sistem manajemen cassette AC Hitachi yang terintegrasi untuk memudahkan tracking, maintenance, dan pelaporan inventori Anda",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

