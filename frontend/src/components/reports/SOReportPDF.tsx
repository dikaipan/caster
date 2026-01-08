'use client';

// This component requires @react-pdf/renderer to be installed
// Install with: npm install @react-pdf/renderer --legacy-peer-deps

import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Register fonts if needed (optional)
// Font.register({
//   family: 'Roboto',
//   src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf',
// });

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 15,
    borderBottom: '2 solid #1e293b',
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    backgroundColor: '#f1f5f9',
    padding: 5,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 3,
    borderBottom: '1 solid #e2e8f0',
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '65%',
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 4,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottom: '1 solid #e2e8f0',
    fontSize: 9,
    alignItems: 'flex-start', // Align items to top for multi-line content
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tableCellSmall: {
    flex: 0.8,
  },
  statusBadge: {
    padding: 4,
    borderRadius: 4,
    fontSize: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusGood: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusBad: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  timeline: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTop: '1 solid #e2e8f0',
    borderBottom: '1 solid #e2e8f0',
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIcon: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timelineLabel: {
    fontSize: 7,
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timelineDate: {
    fontSize: 6,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  timelineConnector: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '2',
    backgroundColor: '#cbd5e1',
    zIndex: 0,
  },
  signatureBox: {
    marginTop: 10,
    padding: 10,
    border: '1 solid #cbd5e1',
    borderRadius: 4,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e293b',
  },
  signatureImage: {
    width: 250,
    height: 100,
    objectFit: 'contain',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#64748b',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: '#64748b',
  },
});

interface SOReportPDFProps {
  ticket: any;
  repairs: any[];
  user: any;
}

const SOReportPDF: React.FC<SOReportPDFProps> = ({ ticket, repairs, user }) => {
  // Get cassettes from ticket - include ALL cassettes from cassetteDetails
  let allCassettes: any[] = [];
  
  if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
    // Multi-cassette ticket - get all cassettes from details
    allCassettes = ticket.cassetteDetails
      .map((detail: any) => detail.cassette)
      .filter((c: any) => c !== null && c !== undefined);
  } else if (ticket.cassette) {
    // Single cassette ticket
    allCassettes = [ticket.cassette];
  }
  
  // Debug logging (will be removed in production)
  console.log('PDF Report - Ticket Data:', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketStatus: ticket.status,
    hasCassetteDetails: !!ticket.cassetteDetails,
    cassetteDetailsCount: ticket.cassetteDetails?.length || 0,
    hasCassette: !!ticket.cassette,
    cassetteDetails: ticket.cassetteDetails?.map((d: any) => ({
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
  });
  
  console.log('PDF Report - All Cassettes (after processing):', {
    allCassettesCount: allCassettes.length,
    cassettes: allCassettes.map((c: any) => ({
      id: c?.id,
      serialNumber: c?.serialNumber,
      status: c?.status,
      cassetteType: c?.cassetteType?.typeCode || 'N/A',
      hasReplacementFor: !!c?.replacementFor,
      replacementForCount: c?.replacementFor?.length || 0,
    })),
  });
  
  // For replacement tickets, also include new cassettes that replaced old ones
  const isReplacementTicket = ticket.requestReplacement === true || 
    ticket.cassetteDetails?.some((detail: any) => detail.requestReplacement === true);
  
  if (isReplacementTicket) {
    // Find new cassettes that were created as replacements
    const newCassettes: any[] = [];
    
    // Check each cassette for replacementFor relation
    allCassettes.forEach((cassette: any) => {
      if (cassette && cassette.replacementFor && Array.isArray(cassette.replacementFor)) {
        cassette.replacementFor.forEach((replacement: any) => {
          if (replacement && replacement.id && !newCassettes.find((nc: any) => nc.id === replacement.id)) {
            newCassettes.push(replacement);
          }
        });
      }
    });
    
    // Also check if ticket has replacementFor directly (from backend include)
    if (ticket.replacementFor && Array.isArray(ticket.replacementFor)) {
      ticket.replacementFor.forEach((replacement: any) => {
        if (replacement && replacement.id && !newCassettes.find((nc: any) => nc.id === replacement.id)) {
          newCassettes.push(replacement);
        }
      });
    }
    
    // Add new cassettes to allCassettes if not already included
    newCassettes.forEach((newCassette: any) => {
      if (!allCassettes.find((c: any) => c && c.id === newCassette.id)) {
        allCassettes.push(newCassette);
      }
    });
    
    console.log('PDF Report - Replacement Cassettes:', {
      isReplacementTicket: true,
      newCassettesCount: newCassettes.length,
      newCassettes: newCassettes.map((c: any) => ({
        id: c?.id,
        serialNumber: c?.serialNumber,
        status: c?.status,
      })),
      finalAllCassettesCount: allCassettes.length,
    });
  }
  
  // Filter out null/undefined cassettes
  allCassettes = allCassettes.filter((c: any) => c !== null && c !== undefined);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
      case 'COMPLETED':
      case 'CLOSED':
      case 'RESOLVED':
        return styles.statusGood;
      case 'BAD':
      case 'SCRAPPED':
      case 'FAILED':
        return styles.statusBad;
      default:
        return styles.statusWarning;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMMM yyyy, HH:mm', { locale: id });
    } catch {
      return 'N/A';
    }
  };

  const formatDateShort = (date: string | Date | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yy HH:mm', { locale: id });
    } catch {
      return 'N/A';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      OPEN: 'Open',
      IN_DELIVERY: 'Dalam Pengiriman ke RC',
      RECEIVED: 'Diterima di RC',
      IN_PROGRESS: 'Sedang Diperbaiki',
      RESOLVED: 'Siap Di-pickup',
      CLOSED: 'Selesai',
      RECEIVED_RT: 'Received',
      DIAGNOSING: 'Diagnosing',
      ON_PROGRESS: 'On Progress',
      COMPLETED: 'Completed',
    };
    return labels[status] || status;
  };

  // Build timeline - hanya event penting dengan icon (menggunakan karakter Unicode yang didukung)
  const timeline: Array<{ date: Date | string; icon: string; label: string }> = [];
  
  // 1. SO Created
  if (ticket.createdAt) {
    timeline.push({
      date: ticket.createdAt,
      icon: 'SO',
      label: 'SO Dibuat',
    });
  }

  // 2. Cassette Shipped
  if (ticket.cassetteDelivery?.shippedDate) {
    timeline.push({
      date: ticket.cassetteDelivery.shippedDate,
      icon: '>>',
      label: 'Dikirim',
    });
  }

  // 3. Cassette Received at RC
  if (ticket.cassetteDelivery?.receivedAtRc) {
    timeline.push({
      date: ticket.cassetteDelivery.receivedAtRc,
      icon: 'OK',
      label: 'Diterima RC',
    });
  }

  // For replacement tickets, skip repair steps and show replacement steps
  if (isReplacementTicket) {
    // 4. Replacement - Find when new cassettes were created (use ticket updatedAt as proxy)
    // In replacement flow, cassettes are replaced after being received at RC
    if (ticket.cassetteDelivery?.receivedAtRc) {
      // Find new cassettes to determine replacement date
      const newCassettes = allCassettes.filter((c: any) => 
        c.status === 'OK' && c.replacementTicketId === ticket.id
      );
      if (newCassettes.length > 0 && newCassettes[0]?.createdAt) {
        timeline.push({
          date: newCassettes[0].createdAt,
          icon: 'R',
          label: 'Replacement',
        });
      } else if (ticket.status === 'RESOLVED' && ticket.updatedAt) {
        // Fallback to ticket updatedAt when status changed to RESOLVED
        timeline.push({
          date: ticket.updatedAt,
          icon: 'R',
          label: 'Replacement',
        });
      }
    }
  } else {
    // For repair tickets, show repair steps
    // 4. Repair Started (hanya jika ada repair)
    if (repairs.length > 0 && repairs[0]?.createdAt) {
      timeline.push({
        date: repairs[0].createdAt,
        icon: 'R',
        label: 'Repair Dimulai',
      });
    }

    // 5. Repair Completed (hanya repair yang selesai)
    const completedRepairs = repairs.filter((r: any) => r.completedAt);
    if (completedRepairs.length > 0) {
      const lastCompleted = completedRepairs.sort((a: any, b: any) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0];
      timeline.push({
        date: lastCompleted.completedAt,
        icon: 'V',
        label: 'Repair Selesai',
      });
      
      // 5a. QC Failed / SCRAPPED (jika ada kaset yang di-scrap)
      const scrappedCassettes = allCassettes.filter((c: any) => c.status === 'SCRAPPED');
      if (scrappedCassettes.length > 0) {
        timeline.push({
          date: lastCompleted.completedAt,
          icon: 'X',
          label: 'QC Failed',
        });
      }
    }
  }

  // 6. Pickup/Disposal Confirmed
  if (ticket.cassetteReturn?.receivedAtPengelola || ticket.cassetteReturn?.rcConfirmedAt) {
    const pickupDate = ticket.cassetteReturn.receivedAtPengelola || ticket.cassetteReturn.rcConfirmedAt;
    // For replacement tickets, always show pickup (new cassettes are picked up)
    // For repair tickets, check if it's disposal or pickup
    const isDisposal = !isReplacementTicket && (
      ticket.cassetteReturn.notes?.includes('DISPOSAL CONFIRMATION') || 
      ticket.cassetteReturn.notes?.includes('SCRAPPED') ||
      allCassettes.some((c: any) => c.status === 'SCRAPPED' && !c.replacementFor)
    );
    timeline.push({
      date: pickupDate,
      icon: isDisposal ? 'X' : '<<',
      label: isDisposal ? 'Disposal' : 'Pickup',
    });
  }

  // Sort by date
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Split repairs into pages (max 20 repairs per page)
  const repairsPerPage = 20;
  const repairPages: any[][] = [];
  for (let i = 0; i < repairs.length; i += repairsPerPage) {
    repairPages.push(repairs.slice(i, i + repairsPerPage));
  }

  // Render repair table rows
  const renderRepairTableRows = (repairList: any[], startIndex: number = 0) => {
    return repairList.map((repair: any, index: number) => (
      <View key={repair.id} style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 0.2, fontSize: 7 }]}>{startIndex + index + 1}</Text>
        <Text style={[styles.tableCell, { flex: 0.8, fontSize: 7 }]}>{repair.cassette?.serialNumber || 'N/A'}</Text>
        <View style={[styles.tableCell, { flex: 0.7 }]}>
          <Text style={{ fontSize: 6, lineHeight: 1.3 }}>
            {repair.reportedIssue || '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, { flex: 0.6 }]}>
          <Text style={{ fontSize: 6, lineHeight: 1.3 }}>
            {repair.repairActionTaken || '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, { flex: 0.6 }]}>
          <Text style={{ fontSize: 6, lineHeight: 1.3 }}>
            {(() => {
              // Handle partsReplaced - can be array, JSON string, or null/undefined
              let partsArray: string[] = [];
              
              if (repair.partsReplaced) {
                if (Array.isArray(repair.partsReplaced)) {
                  partsArray = repair.partsReplaced;
                } else if (typeof repair.partsReplaced === 'string') {
                  try {
                    const parsed = JSON.parse(repair.partsReplaced);
                    partsArray = Array.isArray(parsed) ? parsed : [parsed];
                  } catch (e) {
                    // If parsing fails, treat as single string
                    partsArray = [repair.partsReplaced];
                  }
                }
              }
              
              if (partsArray.length > 0) {
                return partsArray.length > 5
                  ? `${partsArray.slice(0, 5).join(', ')}\n+${partsArray.length - 5} lainnya`
                  : partsArray.join(', ');
              }
              return '-';
            })()}
          </Text>
        </View>
        <Text style={[styles.tableCell, { flex: 0.5, fontSize: 6 }]}>
          {repair.repairer?.fullName || repair.repairedBy || '-'}
        </Text>
        <View style={[styles.tableCell, { flex: 0.4 }]}>
          <View style={[styles.statusBadge, getStatusColor(repair.status), { padding: 1 }]}>
            <Text style={{ fontSize: 6 }}>{getStatusLabel(repair.status)}</Text>
          </View>
        </View>
        <View style={[styles.tableCell, { flex: 0.3 }]}>
          {repair.qcPassed !== null ? (
            <View style={[styles.statusBadge, repair.qcPassed ? styles.statusGood : styles.statusBad, { padding: 1 }]}>
              <Text style={{ fontSize: 6 }}>{repair.qcPassed ? 'PASS' : 'FAIL'}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 6 }}>-</Text>
          )}
        </View>
        <Text style={[styles.tableCell, { flex: 0.6, fontSize: 6 }]}>
          {formatDateShort(repair.completedAt)}
        </Text>
      </View>
    ));
  };

  // Helper function to render pickup/disposal information
  const renderPickupDisposalInfo = () => {
    if (!ticket.cassetteReturn) return null;
    
    // For replacement tickets, exclude old SCRAPPED cassettes from disposal check
    // For repair tickets, check if this is disposal confirmation for SCRAPPED cassettes
    const scrappedCassettes = allCassettes.filter((c: any) => {
      if (c.status === 'SCRAPPED') {
        // For replacement tickets, exclude cassettes that were replaced (have replacementFor)
        if (isReplacementTicket) {
          return !c.replacementFor || c.replacementFor.length === 0;
        }
        return true;
      }
      return false;
    });
    const hasScrapped = scrappedCassettes.length > 0;
    const isDisposal = !isReplacementTicket && (
      ticket.cassetteReturn.notes?.includes('DISPOSAL CONFIRMATION') || 
      ticket.cassetteReturn.notes?.includes('SCRAPPED') ||
      hasScrapped
    );
    
    // For replacement tickets, only show new cassettes (OK) that replaced old ones
    // For repair tickets, show successfully repaired cassettes (OK or READY_FOR_PICKUP)
    let successfullyRepairedCassettes: any[];
    if (isReplacementTicket) {
      // Only show new cassettes that were created as replacements
      successfullyRepairedCassettes = allCassettes.filter((c: any) => 
        (c.status === 'OK' || c.status === 'READY_FOR_PICKUP') && 
        c.replacementTicketId === ticket.id
      );
    } else {
      // For repair tickets, show all successfully repaired cassettes
      successfullyRepairedCassettes = allCassettes.filter((c: any) => 
        c.status === 'OK' || c.status === 'READY_FOR_PICKUP'
      );
    }
    const hasSuccessfullyRepaired = successfullyRepairedCassettes.length > 0;
    
    // Parse notes to extract pickup recipient info
    const notes = ticket.cassetteReturn?.notes || '';
    const recipientNameMatch = notes.match(/Nama Pengambil:\s*([^\n\r]+)/i) || 
                               notes.match(/Nama Pengambil[:\s]+([^\n\r]+)/i);
    const recipientPhoneMatch = notes.match(/No\.\s*HP Pengambil:\s*([^\n\r]+)/i) || 
                                notes.match(/No\s*\.\s*HP Pengambil[:\s]+([^\n\r]+)/i) ||
                                notes.match(/No\s+HP Pengambil[:\s]+([^\n\r]+)/i) ||
                                notes.match(/HP Pengambil[:\s]+([^\n\r]+)/i);
    const recipientName = recipientNameMatch ? recipientNameMatch[1].trim() : null;
    const recipientPhone = recipientPhoneMatch ? recipientPhoneMatch[1].trim() : null;
    
    return (
      <>
        {/* Pickup Information - Show if there are successfully repaired cassettes */}
        {hasSuccessfullyRepaired && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INFORMASI PICKUP & PENGAMBILAN</Text>
            
            {/* Pickup Details */}
            <View style={[styles.section, { backgroundColor: '#f8fafc', padding: 8, borderRadius: 4, marginBottom: 10 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 6 }]}>Detail Pickup</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Tanggal/Waktu Pickup:</Text>
                <Text style={styles.value}>{formatDate(ticket.cassetteReturn?.receivedAtPengelola || ticket.cassetteReturn?.shippedDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Dikonfirmasi Oleh:</Text>
                <Text style={styles.value}>{ticket.cassetteReturn?.receiver?.fullName || ticket.cassetteReturn?.sender?.fullName || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Kaset yang Di-pickup:</Text>
                <Text style={styles.value}>
                  {successfullyRepairedCassettes.map((c: any) => c.serialNumber).join(', ')}
                </Text>
              </View>
            </View>

            {/* Recipient Information - Always show section, even if data is missing */}
            <View style={[styles.section, { backgroundColor: '#f0fdf4', padding: 8, borderRadius: 4, marginBottom: 10 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 6 }]}>Informasi Pengambil</Text>
              {recipientName ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Nama Pengambil:</Text>
                  <Text style={[styles.value, { fontWeight: 'bold' }]}>{recipientName}</Text>
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.label}>Nama Pengambil:</Text>
                  <Text style={[styles.value, { fontStyle: 'italic', color: '#94a3b8' }]}>Tidak tersedia</Text>
                </View>
              )}
              {recipientPhone ? (
                <View style={styles.row}>
                  <Text style={styles.label}>No. HP Pengambil:</Text>
                  <Text style={[styles.value, { fontWeight: 'bold' }]}>{recipientPhone}</Text>
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.label}>No. HP Pengambil:</Text>
                  <Text style={[styles.value, { fontStyle: 'italic', color: '#94a3b8' }]}>Tidak tersedia</Text>
                </View>
              )}
            </View>

            {/* Digital Signature - Always show section */}
            <View style={[styles.signatureBox, { marginTop: 10, backgroundColor: '#ffffff', border: '2 solid #1e293b' }]}>
              <Text style={[styles.signatureLabel, { fontSize: 9, marginBottom: 10 }]}>TANDA TANGAN DIGITAL PENGAMBIL</Text>
              {(() => {
                // Try rcSignature first (new field), then fallback to signature (backward compatibility)
                const signature = ticket.cassetteReturn?.rcSignature || ticket.cassetteReturn?.signature;
                return signature ? (
                  <>
                    <View style={{ border: '1 solid #cbd5e1', borderRadius: 4, padding: 8, backgroundColor: '#ffffff' }}>
                      {/* Note: @react-pdf/renderer Image doesn't support alt prop - this is for PDF generation, not HTML */}
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <Image 
                        src={signature} 
                        style={styles.signatureImage}
                      />
                    </View>
                  {recipientName && (
                    <View style={{ marginTop: 8, borderTop: '1 solid #e2e8f0', paddingTop: 8 }}>
                      <Text style={{ fontSize: 8, textAlign: 'center', color: '#1e293b', fontWeight: 'bold' }}>
                        {recipientName}
                      </Text>
                      <Text style={{ fontSize: 7, textAlign: 'center', color: '#64748b', marginTop: 2 }}>
                        (Pengambil Kaset)
                      </Text>
                    </View>
                  )}
                  </>
                ) : null;
              })()}
              {!ticket.cassetteReturn?.rcSignature && !ticket.cassetteReturn?.signature && (
                <View style={{ padding: 20, border: '1 dashed #cbd5e1', borderRadius: 4, backgroundColor: '#f8fafc' }}>
                  <Text style={{ fontSize: 8, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    Tanda tangan tidak tersedia
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Disposal Information - Show if there are scrapped cassettes */}
        {hasScrapped && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INFORMASI DISPOSAL</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Konfirmasi Disposal:</Text>
              <Text style={styles.value}>{formatDate(ticket.cassetteReturn.receivedAtPengelola || ticket.cassetteReturn.shippedDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Dikonfirmasi Oleh:</Text>
              <Text style={styles.value}>{ticket.cassetteReturn.receiver?.fullName || ticket.cassetteReturn.sender?.fullName || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Kaset yang Di-disposal:</Text>
              <Text style={styles.value}>
                {scrappedCassettes.map((c: any) => c.serialNumber).join(', ')}
              </Text>
            </View>
            <View style={[styles.row, { backgroundColor: '#fee2e2', padding: 8, borderRadius: 4, marginTop: 5 }]}>
              <Text style={[styles.label, { color: '#dc2626', fontWeight: 'bold' }]}>Status:</Text>
              <Text style={[styles.value, { color: '#dc2626', fontWeight: 'bold' }]}>
                SCRAPPED - Tidak Bisa Diperbaiki, Tidak Lolos Quality Control
              </Text>
            </View>
            <View style={[styles.row, { backgroundColor: '#fee2e2', padding: 8, borderRadius: 4 }]}>
              <Text style={[styles.label, { color: '#dc2626', fontWeight: 'bold' }]}>Lokasi:</Text>
              <Text style={[styles.value, { color: '#dc2626', fontWeight: 'bold' }]}>
                Kaset tetap di RC untuk disposal (tidak dikembalikan ke Pengelola)
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  // Render main content for a page
  const renderMainContent = (repairList: any[] = [], pageIndex: number = 0) => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SERVICE ORDER REPORT</Text>
        <Text style={styles.subtitle}>
          Generated: {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}
        </Text>
      </View>

      {/* SO Information - Only on first page */}
      {pageIndex === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMASI SERVICE ORDER</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nomor SO:</Text>
            <Text style={styles.value}>{ticket.ticketNumber || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Judul:</Text>
            <Text style={styles.value}>{ticket.title || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, getStatusColor(ticket.status)]}>
              <Text>{getStatusLabel(ticket.status)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Prioritas:</Text>
            <Text style={styles.value}>{ticket.priority || 'N/A'}</Text>
          </View>
          {ticket.repairLocation && (
            <View style={styles.row}>
              <Text style={styles.label}>Lokasi Perbaikan:</Text>
              <Text style={styles.value}>
                {ticket.repairLocation === 'ON_SITE' ? 'Di Lokasi Pengelola (On-Site)' : 'Di Repair Center (RC)'}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal Dibuat:</Text>
            <Text style={styles.value}>{formatDate(ticket.createdAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dilaporkan Oleh:</Text>
            <Text style={styles.value}>{ticket.reporter?.fullName || 'N/A'}</Text>
          </View>
          {ticket.machine && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Mesin:</Text>
                <Text style={styles.value}>{ticket.machine.serialNumberManufacturer || 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bank:</Text>
                <Text style={styles.value}>{ticket.machine.customerBank?.bankName || 'N/A'}</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Cassettes Information - Only on first page */}
      {pageIndex === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            INFORMASI KASET ({allCassettes.length} {allCassettes.length > 1 ? 'Kaset' : 'Kaset'})
          </Text>
          {allCassettes.length === 0 ? (
            <View style={{ padding: 10, backgroundColor: '#fef2f2', borderRadius: 4, marginTop: 10 }}>
              <Text style={{ fontSize: 9, color: '#dc2626', fontStyle: 'italic' }}>
                Tidak ada data kaset tersedia
              </Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 0.3 }]}>No</Text>
                <Text style={styles.tableCell}>Serial Number</Text>
                <Text style={styles.tableCell}>Type</Text>
                <Text style={styles.tableCellSmall}>Status</Text>
              </View>
              {allCassettes.map((cassette: any, index: number) => {
                if (!cassette) {
                  console.warn('PDF Report - Null cassette at index:', index);
                  return null;
                }
                
                return (
                  <View key={cassette.id || `cassette-${index}`} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 0.3 }]}>{index + 1}</Text>
                    <Text style={styles.tableCell}>{cassette.serialNumber || 'N/A'}</Text>
                    <Text style={styles.tableCell}>{cassette.cassetteType?.typeCode || 'N/A'}</Text>
                    <View style={[styles.tableCellSmall, { flex: 0.8 }]}>
                      <View style={[styles.statusBadge, getStatusColor(cassette.status)]}>
                        <Text>{cassette.status || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Replacement Information - Only for replacement tickets, only on first page */}
      {pageIndex === 0 && isReplacementTicket && (() => {
        // Get old cassettes (SCRAPPED) that were replaced
        const oldCassettes = allCassettes.filter((c: any) => c.status === 'SCRAPPED');
        
        // Get new cassettes that replaced the old ones
        const newCassettes: any[] = [];
        oldCassettes.forEach((oldCassette: any) => {
          if (oldCassette.replacementFor && oldCassette.replacementFor.length > 0) {
            newCassettes.push(...oldCassette.replacementFor);
          }
        });
        
        // If replacementFor is not loaded, try to get from cassetteDetails
        if (newCassettes.length === 0 && ticket.cassetteDetails) {
          ticket.cassetteDetails.forEach((detail: any) => {
            if (detail.requestReplacement && detail.cassette) {
              // Find new cassette by checking if it has replacementTicketId matching this ticket
              const newCassette = allCassettes.find((c: any) => 
                c.replacementTicketId === ticket.id && 
                c.replacedCassetteId === detail.cassette.id &&
                c.status === 'OK'
              );
              if (newCassette) {
                newCassettes.push(newCassette);
              }
            }
          });
        }
        
        if (oldCassettes.length === 0 && newCassettes.length === 0) {
          return null;
        }
        
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INFORMASI REPLACEMENT</Text>
            
            {/* Old Cassettes (SCRAPPED) */}
            {oldCassettes.length > 0 && (
              <View style={[styles.section, { backgroundColor: '#fee2e2', padding: 8, borderRadius: 4, marginBottom: 10 }]}>
                <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 6, color: '#dc2626' }]}>
                  Kaset Lama (SCRAPPED) - Diganti
                </Text>
                <View style={styles.table}>
                  <View style={[styles.tableHeader, { backgroundColor: '#dc2626' }]}>
                    <Text style={[styles.tableCell, { flex: 0.3 }]}>No</Text>
                    <Text style={styles.tableCell}>Serial Number</Text>
                    <Text style={styles.tableCell}>Type</Text>
                    <Text style={styles.tableCellSmall}>Status</Text>
                  </View>
                  {oldCassettes.map((cassette: any, index: number) => (
                    <View key={cassette.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 0.3 }]}>{index + 1}</Text>
                      <Text style={styles.tableCell}>{cassette.serialNumber || 'N/A'}</Text>
                      <Text style={styles.tableCell}>{cassette.cassetteType?.typeCode || 'N/A'}</Text>
                      <View style={[styles.tableCellSmall, { flex: 0.8 }]}>
                        <View style={[styles.statusBadge, getStatusColor('SCRAPPED')]}>
                          <Text>SCRAPPED</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* New Cassettes (OK) */}
            {newCassettes.length > 0 && (
              <View style={[styles.section, { backgroundColor: '#f0fdf4', padding: 8, borderRadius: 4, marginBottom: 10 }]}>
                <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 6, color: '#16a34a' }]}>
                  Kaset Baru - Pengganti
                </Text>
                <View style={styles.table}>
                  <View style={[styles.tableHeader, { backgroundColor: '#16a34a' }]}>
                    <Text style={[styles.tableCell, { flex: 0.3 }]}>No</Text>
                    <Text style={styles.tableCell}>Serial Number</Text>
                    <Text style={styles.tableCell}>Type</Text>
                    <Text style={styles.tableCellSmall}>Status</Text>
                  </View>
                  {newCassettes.map((cassette: any, index: number) => (
                    <View key={cassette.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 0.3 }]}>{index + 1}</Text>
                      <Text style={styles.tableCell}>{cassette.serialNumber || 'N/A'}</Text>
                      <Text style={styles.tableCell}>{cassette.cassetteType?.typeCode || 'N/A'}</Text>
                      <View style={[styles.tableCellSmall, { flex: 0.8 }]}>
                        <View style={[styles.statusBadge, getStatusColor('OK')]}>
                          <Text>OK</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Replacement Mapping */}
            {oldCassettes.length > 0 && newCassettes.length > 0 && (
              <View style={[styles.section, { backgroundColor: '#f8fafc', padding: 8, borderRadius: 4 }]}>
                <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 6 }]}>
                  Mapping Replacement
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableCell}>Kaset Lama (SCRAPPED)</Text>
                    <Text style={styles.tableCell}>Kaset Baru (OK)</Text>
                  </View>
                  {oldCassettes.map((oldCassette: any, index: number) => {
                    const correspondingNew = newCassettes.find((nc: any) => 
                      nc.replacedCassetteId === oldCassette.id
                    ) || newCassettes[index] || null;
                    return (
                      <View key={oldCassette.id} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{oldCassette.serialNumber || 'N/A'}</Text>
                        <Text style={styles.tableCell}>
                          {correspondingNew ? correspondingNew.serialNumber : 'Belum di-replace'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })()}

      {/* Delivery Information - Only on first page */}
      {pageIndex === 0 && ticket.cassetteDelivery && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMASI PENGIRIMAN</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Pengiriman:</Text>
            <Text style={styles.value}>{ticket.cassetteDelivery.courierService || 'Self Delivery'}</Text>
          </View>
          {ticket.cassetteDelivery.trackingNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Tracking Number:</Text>
              <Text style={styles.value}>{ticket.cassetteDelivery.trackingNumber}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal Pengiriman:</Text>
            <Text style={styles.value}>{formatDate(ticket.cassetteDelivery.shippedDate)}</Text>
          </View>
          {ticket.cassetteDelivery.receivedAtRc && (
            <View style={styles.row}>
              <Text style={styles.label}>Diterima di RC:</Text>
              <Text style={styles.value}>{formatDate(ticket.cassetteDelivery.receivedAtRc)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Repair Information - Paginated (skip for replacement tickets) */}
      {!isReplacementTicket && repairs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            INFORMASI REPAIR ({repairs.length} {repairs.length > 1 ? 'Repair Tickets' : 'Repair Ticket'})
            {repairPages.length > 1 && ` - Halaman ${pageIndex + 1} dari ${repairPages.length}`}
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 0.2, fontSize: 7 }]}>No</Text>
              <Text style={[styles.tableCell, { flex: 0.8, fontSize: 7 }]}>SN Kaset</Text>
              <Text style={[styles.tableCell, { flex: 0.7, fontSize: 7 }]}>Issue</Text>
              <Text style={[styles.tableCell, { flex: 0.6, fontSize: 7 }]}>Tindakan</Text>
              <Text style={[styles.tableCell, { flex: 0.6, fontSize: 7 }]}>Parts</Text>
              <Text style={[styles.tableCell, { flex: 0.5, fontSize: 7 }]}>Teknisi</Text>
              <Text style={[styles.tableCell, { flex: 0.4, fontSize: 7 }]}>Status</Text>
              <Text style={[styles.tableCell, { flex: 0.3, fontSize: 7 }]}>QC</Text>
              <Text style={[styles.tableCell, { flex: 0.6, fontSize: 7 }]}>Selesai</Text>
            </View>
            {renderRepairTableRows(repairList, pageIndex * repairsPerPage)}
          </View>
        </View>
      )}

      {/* Pickup/Disposal Information - Only on last page */}
      {pageIndex === repairPages.length - 1 && renderPickupDisposalInfo()}

      {/* Timeline - Only on last page */}
      {pageIndex === repairPages.length - 1 && timeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIMELINE</Text>
          <View style={styles.timeline}>
            {timeline.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <Text style={styles.timelineIcon}>{item.icon}</Text>
                <Text style={styles.timelineLabel}>{item.label}</Text>
                <Text style={styles.timelineDate}>{formatDateShort(item.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
        `${pageNumber} / ${totalPages}`
      )} fixed />
      <View style={styles.footer}>
        <Text>Dokumen ini dibuat secara otomatis oleh sistem CASTER - Cassette Tracking & Retrieval System</Text>
      </View>
    </>
  );

  return (
    <Document>
      {/* First page with all info + first batch of repairs */}
      <Page size="A4" style={styles.page}>
        {renderMainContent(repairPages[0] || [], 0)}
      </Page>

      {/* Additional pages for repairs if needed */}
      {repairPages.slice(1).map((repairPage, pageIndex) => (
        <Page key={pageIndex + 1} size="A4" style={styles.page}>
          {renderMainContent(repairPage, pageIndex + 1)}
        </Page>
      ))}
    </Document>
  );
};

export default SOReportPDF;

