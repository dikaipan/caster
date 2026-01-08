import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusTransitionValidator } from '../common/validators/status-transition.validator';
import { MultiCassetteValidator } from '../common/validators/multi-cassette.validator';

/**
 * Ticket Status Sync Service
 * 
 * This service handles automatic synchronization of SO (Service Order) status
 * based on repair ticket completion. It ensures consistency and handles edge cases.
 */
@Injectable()
export class TicketStatusSyncService {
  private readonly logger = new Logger(TicketStatusSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync SO status based on repair ticket completion
   * 
   * This method should be called:
   * 1. After a repair ticket is completed
   * 2. Periodically via scheduled job (optional, for consistency)
   * 
   * @param ticketId - ProblemTicket ID to sync
   * @param tx - Optional transaction context
   */
  async syncTicketStatus(ticketId: string, tx?: any): Promise<{
    updated: boolean;
    oldStatus: string;
    newStatus: string;
    reason: string;
  }> {
    const prisma = tx || this.prisma;

    try {
      // Get ticket with all related data
      const ticket = await prisma.problemTicket.findUnique({
        where: { id: ticketId },
        include: {
          cassetteDetails: {
            include: {
              cassette: {
                select: {
                  id: true,
                  serialNumber: true,
                  status: true,
                },
              },
            },
          },
          cassetteDelivery: {
            include: {
              cassette: {
                select: {
                  id: true,
                  serialNumber: true,
                  status: true,
                },
              },
            },
          },
          cassette: {
            select: {
              id: true,
              serialNumber: true,
              status: true,
            },
          },
        },
      });

      if (!ticket) {
        this.logger.warn(`Ticket ${ticketId} not found for status sync`);
        return {
          updated: false,
          oldStatus: 'UNKNOWN',
          newStatus: 'UNKNOWN',
          reason: 'Ticket not found',
        };
      }

      const oldStatus = ticket.status;

      // Get all cassettes in this ticket
      const cassettes: Array<{ id: string; serialNumber: string; status: string }> = [];
      
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        // Multi-cassette ticket
        ticket.cassetteDetails.forEach((detail: any) => {
          if (detail.cassette) {
            cassettes.push({
              id: detail.cassette.id,
              serialNumber: detail.cassette.serialNumber,
              status: detail.cassette.status,
            });
          }
        });
      } else if (ticket.cassetteDelivery?.cassette) {
        // Single-cassette ticket with delivery
        cassettes.push({
          id: ticket.cassetteDelivery.cassette.id,
          serialNumber: ticket.cassetteDelivery.cassette.serialNumber,
          status: ticket.cassetteDelivery.cassette.status,
        });
      } else if (ticket.cassette) {
        // Single-cassette ticket (legacy)
        cassettes.push({
          id: ticket.cassette.id,
          serialNumber: ticket.cassette.serialNumber,
          status: ticket.cassette.status,
        });
      }

      if (cassettes.length === 0) {
        this.logger.warn(`Ticket ${ticket.ticketNumber} has no cassettes for status sync`);
        return {
          updated: false,
          oldStatus,
          newStatus: oldStatus,
          reason: 'No cassettes found',
        };
      }

      // Get all repair tickets for these cassettes
      // IMPORTANT:
      //   We only consider repair tickets created AFTER this SO was created.
      //   This prevents repairs from previous SO cycles on the same cassette
      //   from affecting the status of the current SO.
      const cassetteIds = cassettes.map(c => c.id);
      const ticketCreatedAt = ticket.createdAt || ticket.reportedAt;

      const allRepairTicketsRaw = await prisma.repairTicket.findMany({
        where: {
          cassetteId: { in: cassetteIds },
          deletedAt: null,
          ...(ticketCreatedAt && {
            createdAt: {
              gte: ticketCreatedAt,
            },
          }),
        },
        select: {
          id: true,
          status: true,
          cassetteId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get latest repair ticket per cassette
      const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string }>();
      for (const rt of allRepairTicketsRaw) {
        if (!latestRepairsMap.has(rt.cassetteId)) {
          latestRepairsMap.set(rt.cassetteId, {
            id: rt.id,
            status: rt.status,
            cassetteId: rt.cassetteId,
          });
        }
      }

      const latestRepairs = Array.from(latestRepairsMap.values());

      // Use MultiCassetteValidator to check if all repairs are completed
      const validationResult = MultiCassetteValidator.validateAllRepairsCompleted(
        cassettes,
        latestRepairs.map(r => ({ cassetteId: r.cassetteId, status: r.status }))
      );

      let newStatus = oldStatus;
      let reason = '';

      // Determine new status based on current status and repair completion
      if (oldStatus === 'RECEIVED' || oldStatus === 'IN_PROGRESS') {
        if (validationResult.allCompleted) {
          // All repairs completed → RESOLVED
          newStatus = 'RESOLVED';
          reason = `All ${validationResult.completedCount} repair ticket(s) completed`;
        } else {
          // Some repairs not completed
          if (latestRepairs.length > 0) {
            // At least one repair exists → IN_PROGRESS
            newStatus = 'IN_PROGRESS';
            reason = `${validationResult.completedCount}/${cassettes.length} repair ticket(s) completed, ${validationResult.pendingCount} pending`;
          } else {
            // No repairs yet → keep RECEIVED
            newStatus = oldStatus;
            reason = `No repair tickets found yet. Waiting for repairs to start.`;
          }
        }
      } else if (oldStatus === 'RESOLVED') {
        // If already RESOLVED, verify it's still valid
        if (!validationResult.allCompleted) {
          // Should not be RESOLVED if repairs not completed → revert to IN_PROGRESS
          newStatus = 'IN_PROGRESS';
          reason = `Auto-fixed: Status was RESOLVED but ${validationResult.pendingCount} repair(s) not completed`;
        } else {
          newStatus = oldStatus; // Keep RESOLVED
          reason = 'All repairs completed (already RESOLVED)';
        }
      }

      // Update status if changed
      if (newStatus !== oldStatus) {
        try {
          // Validate transition
          StatusTransitionValidator.validateTicketTransition(oldStatus, newStatus, {
            allRepairsCompleted: validationResult.allCompleted,
            hasDelivery: !!ticket.cassetteDelivery,
            hasReturn: false, // We don't check return here
            repairLocation: ticket.repairLocation as 'ON_SITE' | 'AT_RC' | null,
          });

          // Update ticket status
          await prisma.problemTicket.update({
            where: { id: ticketId },
            data: {
              status: newStatus as any,
              resolvedAt: newStatus === 'RESOLVED' ? new Date() : (newStatus === 'IN_PROGRESS' ? null : ticket.resolvedAt),
            },
          });

          this.logger.log(
            `Synced ticket ${ticket.ticketNumber}: ${oldStatus} → ${newStatus}. Reason: ${reason}`
          );

          return {
            updated: true,
            oldStatus,
            newStatus,
            reason,
          };
        } catch (validationError) {
          // If validation fails, log but don't throw (to prevent breaking repair completion)
          this.logger.error(
            `Status transition validation failed for ticket ${ticket.ticketNumber}: ` +
            `${oldStatus} → ${newStatus}. Error: ${validationError.message}`
          );
          // Return unchanged status
          return {
            updated: false,
            oldStatus,
            newStatus: oldStatus,
            reason: `Validation failed: ${validationError.message}`,
          };
        }
      }

      return {
        updated: false,
        oldStatus,
        newStatus: oldStatus,
        reason: `Status already correct: ${oldStatus}`,
      };
    } catch (error) {
      this.logger.error(`Error syncing ticket status for ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all tickets that might need status update
   * 
   * This can be called periodically via scheduled job
   */
  async syncAllPendingTickets(limit: number = 100): Promise<{
    synced: number;
    errors: number;
  }> {
    try {
      // Find tickets that are in RECEIVED or IN_PROGRESS status
      // and might need status update
      const tickets = await this.prisma.problemTicket.findMany({
        where: {
          status: {
            in: ['RECEIVED', 'IN_PROGRESS', 'RESOLVED'],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
        },
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      let synced = 0;
      let errors = 0;

      for (const ticket of tickets) {
        try {
          const result = await this.syncTicketStatus(ticket.id);
          if (result.updated) {
            synced++;
          }
        } catch (error) {
          this.logger.error(`Error syncing ticket ${ticket.ticketNumber}:`, error);
          errors++;
        }
      }

      this.logger.log(`Status sync completed: ${synced} updated, ${errors} errors out of ${tickets.length} tickets`);

      return { synced, errors };
    } catch (error) {
      this.logger.error('Error in syncAllPendingTickets:', error);
      throw error;
    }
  }
}

