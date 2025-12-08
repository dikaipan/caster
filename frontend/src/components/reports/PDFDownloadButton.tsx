'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFDownloadButtonProps {
  ticket: any;
  repairs: any[];
  user: any;
  disabled?: boolean;
}

export default function PDFDownloadButton({ ticket, repairs, user, disabled = false }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfLibAvailable, setPdfLibAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if @react-pdf/renderer is available
    const checkPDFLib = async () => {
      try {
        await import('@react-pdf/renderer');
        setPdfLibAvailable(true);
      } catch (error) {
        console.warn('@react-pdf/renderer not available:', error);
        setPdfLibAvailable(false);
      }
    };
    checkPDFLib();
  }, []);

  const handleDownload = async () => {
    if (!pdfLibAvailable) {
      toast({
        title: 'Library PDF Belum Terinstall',
        description: 'Silakan install @react-pdf/renderer dengan menjalankan: npm install @react-pdf/renderer --legacy-peer-deps di folder frontend',
        variant: 'destructive',
        duration: 10000,
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Dynamically import PDF libraries only when needed
      const { pdf } = await import('@react-pdf/renderer');
      const SOReportPDF = (await import('@/components/reports/SOReportPDF')).default;
      const React = await import('react');

      // Debug: Log ticket data before generating PDF
      console.log('PDF Download - Ticket Data:', {
        ticketId: ticket?.id,
        ticketNumber: ticket?.ticketNumber,
        status: ticket?.status,
        cassetteDetailsCount: ticket?.cassetteDetails?.length || 0,
        cassetteDetails: ticket?.cassetteDetails?.map((d: any) => ({
          id: d.id,
          cassetteId: d.cassetteId,
          requestReplacement: d.requestReplacement,
          cassette: d.cassette ? {
            id: d.cassette.id,
            serialNumber: d.cassette.serialNumber,
            status: d.cassette.status,
            hasReplacementFor: !!d.cassette.replacementFor,
            replacementForCount: d.cassette.replacementFor?.length || 0,
          } : null,
        })) || [],
        cassette: ticket?.cassette ? {
          id: ticket.cassette.id,
          serialNumber: ticket.cassette.serialNumber,
          status: ticket.cassette.status,
        } : null,
      });
      
      // Generate PDF blob
      const doc = React.createElement(SOReportPDF, { ticket, repairs, user });
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SO-Report-${ticket.ticketNumber || ticket.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsGenerating(false);

      toast({
        title: 'PDF Generated',
        description: 'PDF report berhasil di-download',
        variant: 'default',
      });

    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      setIsGenerating(false);
      toast({
        title: 'Error Generating PDF',
        description: error?.message || 'Terjadi kesalahan saat generate PDF. Silakan coba lagi.',
        variant: 'destructive',
      });
    }
  };

  if (pdfLibAvailable === null) {
    return (
      <Button variant="outline" disabled className="bg-slate-50 dark:bg-slate-800">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (pdfLibAvailable === false) {
    return (
      <Button
        variant="outline"
        onClick={handleDownload}
        className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        Install PDF Library
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isGenerating || disabled}
      className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 disabled:opacity-50 disabled:cursor-not-allowed"
      title={disabled ? 'PDF Report hanya tersedia untuk Service Order yang sudah CLOSED' : undefined}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Download PDF Report
        </>
      )}
    </Button>
  );
}
