import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get operational performance metrics
   * - MTTR (Mean Time To Repair)
   * - MTBF (Mean Time Between Failures)
   * - Cycle time perbaikan
   * - Turnaround time
   */
  async getOperationalMetrics(
    userType: string,
    pengelolaId?: string,
    startDate?: Date,
    endDate?: Date,
    bankId?: string,
    pengelolaFilterId?: string,
  ) {
    const whereClause: any = {};
    const dateFilter: any = {};

    // Apply date filter
    if (startDate || endDate) {
      dateFilter.receivedAtRc = {};
      if (startDate) dateFilter.receivedAtRc.gte = startDate;
      if (endDate) dateFilter.receivedAtRc.lte = endDate;
    }

    // Apply bank filter if provided
    if (bankId) {
      whereClause.cassette = {
        customerBankId: bankId,
      };
    }

    // Apply user permissions
    if (userType === 'PENGELOLA' && pengelolaId) {
      try {
        // Pengelola can only see repairs for their assigned banks
        const pengelola = await this.prisma.pengelola.findUnique({
          where: { id: pengelolaId },
          include: {
            bankAssignments: {
              select: { customerBankId: true },
            },
          },
        });

        if (!pengelola || !pengelola.bankAssignments || pengelola.bankAssignments.length === 0) {
          // No bank assignments - return empty metrics
          return this.getEmptyOperationalMetrics();
        }

        const bankIds = pengelola.bankAssignments.map(a => a.customerBankId);
        whereClause.cassette = {
          ...whereClause.cassette,
          customerBankId: { in: bankIds },
        };
      } catch (error) {
        // If error fetching pengelola, return empty metrics
        return this.getEmptyOperationalMetrics();
      }
    }

    // Build receivedAtRc condition - cannot combine not: null with gte/lte
    const receivedAtRcCondition: any = {};
    if (dateFilter.receivedAtRc) {
      // If date filter exists, use gte/lte (implicitly excludes null)
      if (dateFilter.receivedAtRc.gte) {
        receivedAtRcCondition.gte = dateFilter.receivedAtRc.gte;
      }
      if (dateFilter.receivedAtRc.lte) {
        receivedAtRcCondition.lte = dateFilter.receivedAtRc.lte;
      }
    } else {
      // If no date filter, just check not null
      receivedAtRcCondition.not = null;
    }

    // Build final where clause
    const finalWhereClause: any = {
      ...whereClause,
      status: 'COMPLETED',
      receivedAtRc: receivedAtRcCondition,
      completedAt: { not: null },
    };

    // Get completed repairs for MTTR calculation
    const completedRepairs = await this.prisma.repairTicket.findMany({
      where: finalWhereClause,
      select: {
        receivedAtRc: true,
        completedAt: true,
        cassetteId: true,
      },
    });

    // Calculate MTTR (Mean Time To Repair)
    // Only count repairs that have both receivedAtRc and completedAt
    const validRepairs = completedRepairs.filter(r => r.receivedAtRc && r.completedAt);
    let mttr = 0;
    if (validRepairs.length > 0) {
      const totalRepairTime = validRepairs.reduce((sum, repair) => {
        const diff = repair.completedAt!.getTime() - repair.receivedAtRc!.getTime();
        return sum + diff;
      }, 0);
      mttr = totalRepairTime / validRepairs.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Calculate MTBF (Mean Time Between Failures) - time between completed repairs for same cassette
    let mtbf = 0;
    const cassetteRepairGroups = new Map<string, Date[]>();
    
    completedRepairs.forEach(repair => {
      if (!cassetteRepairGroups.has(repair.cassetteId)) {
        cassetteRepairGroups.set(repair.cassetteId, []);
      }
      if (repair.completedAt) {
        cassetteRepairGroups.get(repair.cassetteId)!.push(repair.completedAt);
      }
    });

    const timeBetweenFailures: number[] = [];
    cassetteRepairGroups.forEach((dates) => {
      if (dates.length > 1) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        for (let i = 1; i < dates.length; i++) {
          const diff = dates[i].getTime() - dates[i - 1].getTime();
          timeBetweenFailures.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
        }
      }
    });

    if (timeBetweenFailures.length > 0) {
      mtbf = timeBetweenFailures.reduce((sum, time) => sum + time, 0) / timeBetweenFailures.length;
    }

    // Calculate Cycle Time (from ticket creation to repair completion)
    // Simplified: use turnaround time as cycle time for now
    // Full cycle time would require linking tickets to repairs more accurately
    const avgCycleTime = mttr; // Use MTTR as approximation for cycle time

    // Calculate Turnaround Time (from received at RC to completed)
    const turnaroundTimes = completedRepairs
      .filter(r => r.receivedAtRc && r.completedAt)
      .map(r => (r.completedAt!.getTime() - r.receivedAtRc!.getTime()) / (1000 * 60 * 60 * 24));

    const avgTurnaroundTime = turnaroundTimes.length > 0
      ? turnaroundTimes.reduce((sum, time) => sum + time, 0) / turnaroundTimes.length
      : 0;

    return {
      mttr: Math.round(mttr * 10) / 10, // Round to 1 decimal
      mtbf: Math.round(mtbf * 10) / 10,
      avgCycleTime: Math.round(avgCycleTime * 10) / 10,
      avgTurnaroundTime: Math.round(avgTurnaroundTime * 10) / 10,
      totalCompletedRepairs: completedRepairs.length,
      totalRepairsWithMultipleFailures: cassetteRepairGroups.size,
    };
  }

  /**
   * Get cassette analytics
   * - Top 10 kaset bermasalah
   * - Cycle problem per kaset
   * - Usia kaset
   * - Utilization rate
   */
  async getCassetteAnalytics(
    userType: string,
    pengelolaId?: string,
    startDate?: Date,
    endDate?: Date,
    bankId?: string,
    pengelolaFilterId?: string,
  ) {
    const whereClause: any = {};

    // Apply bank filter
    if (bankId) {
      whereClause.customerBankId = bankId;
    }

    // Apply user permissions
    if (userType === 'PENGELOLA' && pengelolaId) {
      try {
        const pengelola = await this.prisma.pengelola.findUnique({
          where: { id: pengelolaId },
          include: {
            bankAssignments: {
              select: { customerBankId: true },
            },
          },
        });

        if (!pengelola || !pengelola.bankAssignments || pengelola.bankAssignments.length === 0) {
          return this.getEmptyCassetteAnalytics();
        }

        const bankIds = pengelola.bankAssignments.map(a => a.customerBankId);
        whereClause.customerBankId = { in: bankIds };
      } catch (error) {
        return this.getEmptyCassetteAnalytics();
      }
    }

    // Get all cassettes with their problem counts
    // Note: _count doesn't support where clause, so we need to manually count
    const cassettes = await this.prisma.cassette.findMany({
      where: whereClause,
      include: {
        problemTickets: {
          where: {
            deletedAt: null, // Exclude soft-deleted tickets
          },
          select: {
            id: true,
          },
        },
        repairTickets: {
          select: {
            id: true,
          },
        },
        ticketCassetteDetails: {
          where: {
            ticket: {
              deletedAt: null, // Exclude soft-deleted tickets
            },
          },
          select: {
            id: true,
          },
        },
        customerBank: {
          select: {
            bankName: true,
          },
        },
      },
    });

    // Calculate problem count for each cassette (single + multi-cassette tickets)
    // problemTickets = single cassette tickets (where cassette is primary)
    // ticketCassetteDetails = multi-cassette tickets (where cassette is one of many)
    // These should not overlap, so adding them is correct
    const cassetteProblems = cassettes.map(c => ({
      id: c.id,
      serialNumber: c.serialNumber,
      bankName: c.customerBank?.bankName || 'N/A',
      problemCount: c.problemTickets.length + c.ticketCassetteDetails.length,
      repairCount: c.repairTickets.length,
      totalIssues: c.problemTickets.length + c.ticketCassetteDetails.length + c.repairTickets.length,
      createdAt: c.createdAt,
      status: c.status,
    }));

    // Top 10 kaset bermasalah
    const top10Problematic = cassetteProblems
      .sort((a, b) => b.totalIssues - a.totalIssues)
      .slice(0, 10);

    // Cycle problem distribution
    const cycleProblemDistribution = {
      '0': 0,
      '1-2': 0,
      '3-5': 0,
      '6-10': 0,
      '11+': 0,
    };

    cassetteProblems.forEach(c => {
      const count = c.problemCount;
      if (count === 0) cycleProblemDistribution['0']++;
      else if (count <= 2) cycleProblemDistribution['1-2']++;
      else if (count <= 5) cycleProblemDistribution['3-5']++;
      else if (count <= 10) cycleProblemDistribution['6-10']++;
      else cycleProblemDistribution['11+']++;
    });

    // Usia kaset (age distribution)
    const now = new Date();
    const ageDistribution = {
      '< 1 tahun': 0,
      '1-2 tahun': 0,
      '2-3 tahun': 0,
      '3-5 tahun': 0,
      '> 5 tahun': 0,
    };

    cassettes.forEach(c => {
      const ageInYears = (now.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageInYears < 1) ageDistribution['< 1 tahun']++;
      else if (ageInYears < 2) ageDistribution['1-2 tahun']++;
      else if (ageInYears < 3) ageDistribution['2-3 tahun']++;
      else if (ageInYears < 5) ageDistribution['3-5 tahun']++;
      else ageDistribution['> 5 tahun']++;
    });

    // Utilization rate (active cassettes / total cassettes)
    // Active cassettes are OK status (ready to use)
    // READY_FOR_PICKUP cassettes are not yet available (still at RC)
    const activeCassettes = cassettes.filter(c => 
      c.status === 'OK'
    ).length;
    const utilizationRate = cassettes.length > 0 
      ? (activeCassettes / cassettes.length) * 100 
      : 0;

    return {
      top10Problematic,
      cycleProblemDistribution,
      ageDistribution,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      totalCassettes: cassettes.length,
      activeCassettes,
      inactiveCassettes: cassettes.length - activeCassettes,
    };
  }

  /**
   * Get repair analytics
   * - Repair success rate
   * - Parts replacement frequency
   * - Top issues
   */
  async getRepairAnalytics(
    userType: string,
    pengelolaId?: string,
    startDate?: Date,
    endDate?: Date,
    bankId?: string,
    pengelolaFilterId?: string,
  ) {
    const whereClause: any = {};
    const dateFilter: any = {};

    // Apply date filter
    if (startDate || endDate) {
      dateFilter.receivedAtRc = {};
      if (startDate) dateFilter.receivedAtRc.gte = startDate;
      if (endDate) dateFilter.receivedAtRc.lte = endDate;
    }

    // Apply bank filter
    if (bankId) {
      whereClause.cassette = {
        customerBankId: bankId,
      };
    }

    // Apply user permissions
    if (userType === 'PENGELOLA' && pengelolaId) {
      try {
        const pengelola = await this.prisma.pengelola.findUnique({
          where: { id: pengelolaId },
          include: {
            bankAssignments: {
              select: { customerBankId: true },
            },
          },
        });

        if (!pengelola || !pengelola.bankAssignments || pengelola.bankAssignments.length === 0) {
          return this.getEmptyRepairAnalytics();
        }

        const bankIds = pengelola.bankAssignments.map(a => a.customerBankId);
        whereClause.cassette = {
          ...whereClause.cassette,
          customerBankId: { in: bankIds },
        };
      } catch (error) {
        return this.getEmptyRepairAnalytics();
      }
    }

    // Build receivedAtRc condition - cannot combine not: null with gte/lte
    const receivedAtRcCondition: any = {};
    if (dateFilter.receivedAtRc) {
      // If date filter exists, use gte/lte (implicitly excludes null)
      if (dateFilter.receivedAtRc.gte) {
        receivedAtRcCondition.gte = dateFilter.receivedAtRc.gte;
      }
      if (dateFilter.receivedAtRc.lte) {
        receivedAtRcCondition.lte = dateFilter.receivedAtRc.lte;
      }
    }
    // Note: If no date filter, we don't need to filter by receivedAtRc at all

    // Build final where clause
    const finalWhereClause: any = {
      ...whereClause,
    };
    if (Object.keys(receivedAtRcCondition).length > 0) {
      finalWhereClause.receivedAtRc = receivedAtRcCondition;
    }

    // Get all repairs
    const repairs = await this.prisma.repairTicket.findMany({
      where: finalWhereClause,
      select: {
        status: true,
        qcPassed: true,
        partsReplaced: true,
        reportedIssue: true,
        repairActionTaken: true,
      },
    });

    // Calculate success rate (QC passed / total completed)
    const completedRepairs = repairs.filter(r => r.status === 'COMPLETED');
    const qcPassed = completedRepairs.filter(r => r.qcPassed === true).length;
    const successRate = completedRepairs.length > 0 
      ? (qcPassed / completedRepairs.length) * 100 
      : 0;

    // Parts replacement frequency
    const partsFrequency: Record<string, number> = {};
    repairs.forEach(repair => {
      if (repair.partsReplaced && typeof repair.partsReplaced === 'object') {
        const parts = repair.partsReplaced as any;
        if (Array.isArray(parts)) {
          parts.forEach((part: string) => {
            partsFrequency[part] = (partsFrequency[part] || 0) + 1;
          });
        } else if (typeof parts === 'object') {
          Object.keys(parts).forEach(part => {
            partsFrequency[part] = (partsFrequency[part] || 0) + (parts[part] || 1);
          });
        }
      }
    });

    // Top issues (from reportedIssue)
    const issueFrequency: Record<string, number> = {};
    repairs.forEach(repair => {
      if (repair.reportedIssue) {
        // Normalize issue text (simple approach)
        const normalized = repair.reportedIssue.toLowerCase().trim();
        issueFrequency[normalized] = (issueFrequency[normalized] || 0) + 1;
      }
    });

    // Get top 10 issues
    const topIssues = Object.entries(issueFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    // Get top 10 parts
    const topParts = Object.entries(partsFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([part, count]) => ({ part, count }));

    return {
      successRate: Math.round(successRate * 10) / 10,
      totalRepairs: repairs.length,
      completedRepairs: completedRepairs.length,
      qcPassed,
      qcFailed: completedRepairs.length - qcPassed,
      topIssues,
      topParts,
      partsReplacedCount: Object.keys(partsFrequency).length,
    };
  }

  private getEmptyOperationalMetrics() {
    return {
      mttr: 0,
      mtbf: 0,
      avgCycleTime: 0,
      avgTurnaroundTime: 0,
      totalCompletedRepairs: 0,
      totalRepairsWithMultipleFailures: 0,
    };
  }

  private getEmptyCassetteAnalytics() {
    return {
      top10Problematic: [],
      cycleProblemDistribution: {
        '0': 0,
        '1-2': 0,
        '3-5': 0,
        '6-10': 0,
        '11+': 0,
      },
      ageDistribution: {
        '< 1 tahun': 0,
        '1-2 tahun': 0,
        '2-3 tahun': 0,
        '3-5 tahun': 0,
        '> 5 tahun': 0,
      },
      utilizationRate: 0,
      totalCassettes: 0,
      activeCassettes: 0,
      inactiveCassettes: 0,
    };
  }

  private getEmptyRepairAnalytics() {
    return {
      successRate: 0,
      totalRepairs: 0,
      completedRepairs: 0,
      qcPassed: 0,
      qcFailed: 0,
      topIssues: [],
      topParts: [],
      partsReplacedCount: 0,
    };
  }

  /**
   * Get Service Order (SO) analytics
   * - SO per periode (trend)
   * - SO per prioritas
   * - SO per bank
   * - SO per pengelola
   * - Average resolution time
   */
  async getServiceOrderAnalytics(
    userType: string,
    pengelolaId?: string,
    startDate?: Date,
    endDate?: Date,
    bankId?: string,
    pengelolaFilterId?: string,
  ) {
    const whereClause: any = {
      deletedAt: null, // Exclude soft-deleted tickets
    };

    // Apply date filter
    if (startDate || endDate) {
      whereClause.reportedAt = {};
      if (startDate) whereClause.reportedAt.gte = startDate;
      if (endDate) whereClause.reportedAt.lte = endDate;
    }

    // Apply bank filter
    // Tickets can have bank via machine OR via cassette (for single cassette tickets)
    if (bankId) {
      whereClause.OR = [
        {
          machine: {
            customerBankId: bankId,
          },
        },
        {
          cassette: {
            customerBankId: bankId,
          },
        },
      ];
    }

    // Apply user permissions first
    if (userType === 'PENGELOLA' && pengelolaId) {
      // Pengelola can only see their own tickets
      whereClause.reporter = {
        pengelolaId: pengelolaId,
      };
    } else if (pengelolaFilterId) {
      // Apply pengelola filter only for HITACHI users
      whereClause.reporter = {
        pengelolaId: pengelolaFilterId,
      };
    }

    // Get all tickets
    const tickets = await this.prisma.problemTicket.findMany({
      where: whereClause,
      include: {
        reporter: {
          include: {
            pengelola: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        machine: {
          include: {
            customerBank: {
              select: {
                id: true,
                bankName: true,
              },
            },
          },
        },
        cassette: {
          include: {
            customerBank: {
              select: {
                id: true,
                bankName: true,
              },
            },
          },
        },
      },
    });

    // SO per periode (monthly trend)
    const monthlyTrend: Record<string, number> = {};
    tickets.forEach(ticket => {
      const monthKey = ticket.reportedAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;
    });

    // SO per prioritas
    const byPriority: Record<string, number> = {};
    tickets.forEach(ticket => {
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
    });

    // SO per status
    const byStatus: Record<string, number> = {};
    tickets.forEach(ticket => {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
    });

    // SO per bank
    // Tickets can have bank via machine OR via cassette (for single cassette tickets)
    const byBank: Array<{ bankId: string; bankName: string; count: number }> = [];
    const bankCounts: Record<string, { bankId: string; bankName: string; count: number }> = {};
    tickets.forEach(ticket => {
      // Try machine bank first (for machine-based tickets)
      let bank = ticket.machine?.customerBank;
      // If no machine bank, try cassette bank (for single cassette tickets)
      if (!bank && ticket.cassette?.customerBank) {
        bank = ticket.cassette.customerBank;
      }
      
      if (bank) {
        const bankId = bank.id;
        if (!bankCounts[bankId]) {
          bankCounts[bankId] = {
            bankId,
            bankName: bank.bankName,
            count: 0,
          };
        }
        bankCounts[bankId].count++;
      }
    });
    byBank.push(...Object.values(bankCounts));
    byBank.sort((a, b) => b.count - a.count);

    // SO per pengelola
    const byPengelola: Array<{ pengelolaId: string; pengelolaName: string; count: number }> = [];
    const pengelolaCounts: Record<string, { pengelolaId: string; pengelolaName: string; count: number }> = {};
    tickets.forEach(ticket => {
      if (ticket.reporter?.pengelola) {
        const pengelolaId = ticket.reporter.pengelola.id;
        if (!pengelolaCounts[pengelolaId]) {
          pengelolaCounts[pengelolaId] = {
            pengelolaId,
            pengelolaName: ticket.reporter.pengelola.companyName,
            count: 0,
          };
        }
        pengelolaCounts[pengelolaId].count++;
      }
    });
    byPengelola.push(...Object.values(pengelolaCounts));
    byPengelola.sort((a, b) => b.count - a.count);

    // Average resolution time
    const resolvedTickets = tickets.filter(t => t.resolvedAt && t.reportedAt);
    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        if (ticket.resolvedAt && ticket.reportedAt) {
          return sum + (ticket.resolvedAt.getTime() - ticket.reportedAt.getTime());
        }
        return sum;
      }, 0);
      avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    return {
      total: tickets.length,
      monthlyTrend,
      byPriority,
      byStatus,
      byBank: byBank.slice(0, 10), // Top 10 banks
      byPengelola: byPengelola.slice(0, 10), // Top 10 pengelola
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      resolvedCount: resolvedTickets.length,
      openCount: tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length,
    };
  }

  /**
   * Get pengelola comparison analytics
   * - Performance metrics per pengelola
   */
  async getPengelolaComparison(
    userType: string,
    pengelolaId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      deletedAt: null,
    };

    // Apply date filter
    if (startDate || endDate) {
      whereClause.reportedAt = {};
      if (startDate) whereClause.reportedAt.gte = startDate;
      if (endDate) whereClause.reportedAt.lte = endDate;
    }

    // Apply user permissions
    if (userType === 'PENGELOLA' && pengelolaId) {
      whereClause.reporter = {
        pengelolaId: pengelolaId,
      };
    }

    // Get all tickets grouped by pengelola
    const tickets = await this.prisma.problemTicket.findMany({
      where: whereClause,
      include: {
        reporter: {
          include: {
            pengelola: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    // Group by pengelola
    const pengelolaStats: Record<string, {
      pengelolaId: string;
      pengelolaName: string;
      totalTickets: number;
      resolvedTickets: number;
      avgResolutionTime: number;
      criticalTickets: number;
      highPriorityTickets: number;
    }> = {};

    tickets.forEach(ticket => {
      if (!ticket.reporter?.pengelola) return;

      const pid = ticket.reporter.pengelola.id;
      if (!pengelolaStats[pid]) {
        pengelolaStats[pid] = {
          pengelolaId: pid,
          pengelolaName: ticket.reporter.pengelola.companyName,
          totalTickets: 0,
          resolvedTickets: 0,
          avgResolutionTime: 0,
          criticalTickets: 0,
          highPriorityTickets: 0,
        };
      }

      pengelolaStats[pid].totalTickets++;
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        pengelolaStats[pid].resolvedTickets++;
      }
      if (ticket.priority === 'CRITICAL') {
        pengelolaStats[pid].criticalTickets++;
      }
      if (ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') {
        pengelolaStats[pid].highPriorityTickets++;
      }
    });

    // Calculate average resolution time per pengelola
    Object.keys(pengelolaStats).forEach(pid => {
      const pengelolaTickets = tickets.filter(t => 
        t.reporter?.pengelola?.id === pid && 
        t.resolvedAt && 
        t.reportedAt
      );
      
      if (pengelolaTickets.length > 0) {
        const totalTime = pengelolaTickets.reduce((sum, t) => {
          if (t.resolvedAt && t.reportedAt) {
            return sum + (t.resolvedAt.getTime() - t.reportedAt.getTime());
          }
          return sum;
        }, 0);
        pengelolaStats[pid].avgResolutionTime = totalTime / pengelolaTickets.length / (1000 * 60 * 60 * 24);
      }
    });

    // Convert to array and sort by total tickets
    const result = Object.values(pengelolaStats)
      .map(p => ({
        ...p,
        avgResolutionTime: Math.round(p.avgResolutionTime * 10) / 10,
        resolutionRate: p.totalTickets > 0 
          ? Math.round((p.resolvedTickets / p.totalTickets) * 100 * 10) / 10 
          : 0,
      }))
      .sort((a, b) => b.totalTickets - a.totalTickets);

    return result;
  }
}

