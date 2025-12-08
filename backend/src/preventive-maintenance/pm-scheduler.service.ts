import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PreventiveMaintenanceService } from './preventive-maintenance.service';
import { PreventiveMaintenanceType, PreventiveMaintenanceLocation } from './dto/create-pm.dto';

@Injectable()
export class PmSchedulerService {
  private readonly logger = new Logger(PmSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private pmService: PreventiveMaintenanceService,
  ) {}

  /**
   * Auto-schedule routine PM tasks
   * Runs daily at 2 AM to check for PMs that need to be scheduled
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoScheduleRoutinePM() {
    this.logger.log('Starting auto-schedule routine PM check...');

    try {
      // Find completed PMs with nextPmDate that has passed or is within 7 days
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const completedPMs = await this.prisma.preventiveMaintenance.findMany({
        where: {
          status: 'COMPLETED',
          type: PreventiveMaintenanceType.ROUTINE,
          nextPmDate: {
            lte: sevenDaysFromNow, // Next PM date is within 7 days or has passed
          },
          // Check if there's no active PM already scheduled for these cassettes
        },
        include: {
          cassetteDetails: {
            include: {
              cassette: {
                include: {
                  machine: {
                    include: {
                      pengelola: true,
                    },
                  },
                },
              },
            },
          },
          requesterPengelola: {
            include: {
              pengelola: true,
            },
          },
        },
      });

      this.logger.log(`Found ${completedPMs.length} completed routine PMs that need scheduling`);

      let scheduledCount = 0;
      let skippedCount = 0;

      for (const pm of completedPMs) {
        try {
          // Check if there's already an active PM for these cassettes
          const cassetteIds = pm.cassetteDetails.map(d => d.cassetteId);
          
          const activePM = await this.prisma.preventiveMaintenance.findFirst({
            where: {
              cassetteDetails: {
                some: {
                  cassetteId: { in: cassetteIds },
                },
              },
              status: {
                notIn: ['COMPLETED', 'CANCELLED'],
              },
            },
          });

          if (activePM) {
            this.logger.debug(`Skipping PM ${pm.pmNumber} - active PM already exists`);
            skippedCount++;
            continue;
          }

          // Check if cassettes are available (not in repair, not in transit)
          const availableCassettes = pm.cassetteDetails.filter(d => {
            const status = d.cassette.status;
            return !['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'].includes(status);
          });

          if (availableCassettes.length === 0) {
            this.logger.debug(`Skipping PM ${pm.pmNumber} - no available cassettes`);
            skippedCount++;
            continue;
          }

          // Calculate scheduled date (use nextPmDate or today + interval)
          const scheduledDate = pm.nextPmDate && pm.nextPmDate > today 
            ? pm.nextPmDate 
            : new Date(today.getTime() + (pm.nextPmInterval || 90) * 24 * 60 * 60 * 1000);

          // Get requester info
          let requesterUserId = pm.requestedByHitachi || pm.requestedByPengelola;
          let requesterUserType = pm.requestedByType === 'pengelola' ? 'PENGELOLA' : 'HITACHI';
          let requesterPengelolaId = pm.requesterPengelola?.pengelolaId;

          // If no requester found, try to get from first cassette's machine pengelola
          if (!requesterUserId && availableCassettes.length > 0) {
            const firstCassette = availableCassettes[0].cassette;
            if (firstCassette.machine?.pengelolaId) {
              // Get a pengelola user for this pengelola
              const pengelolaUser = await this.prisma.pengelolaUser.findFirst({
                where: {
                  pengelolaId: firstCassette.machine.pengelolaId,
                  role: { in: ['ADMIN', 'SUPERVISOR'] },
                },
              });
              if (pengelolaUser) {
                requesterUserId = pengelolaUser.id;
                requesterUserType = 'PENGELOLA';
                requesterPengelolaId = firstCassette.machine.pengelolaId;
              }
            }
          }

          // Fallback: use system user if no requester found
          if (!requesterUserId) {
            const systemUser = await this.prisma.hitachiUser.findFirst({
              where: { role: 'SUPER_ADMIN' },
            });
            if (systemUser) {
              requesterUserId = systemUser.id;
              requesterUserType = 'HITACHI';
            } else {
              this.logger.warn(`Cannot auto-schedule PM ${pm.pmNumber} - no requester found`);
              skippedCount++;
              continue;
            }
          }

          // Create new PM automatically
          const newPM = await this.pmService.create(
            {
              cassetteIds: availableCassettes.map(d => d.cassetteId),
              type: PreventiveMaintenanceType.ROUTINE,
              title: `PM Rutin - ${pm.title || 'Scheduled Automatically'}`,
              description: `PM rutin otomatis berdasarkan PM sebelumnya (${pm.pmNumber}). Interval: ${pm.nextPmInterval || 90} hari.`,
              scheduledDate: scheduledDate.toISOString().split('T')[0],
              scheduledTime: pm.scheduledTime || undefined,
              location: pm.location as PreventiveMaintenanceLocation,
              contactName: pm.contactName || undefined,
              contactPhone: pm.contactPhone || undefined,
              locationAddress: pm.locationAddress || undefined,
              locationCity: pm.locationCity || undefined,
              locationProvince: pm.locationProvince || undefined,
              locationPostalCode: pm.locationPostalCode || undefined,
              nextPmInterval: pm.nextPmInterval || 90,
              notes: `Auto-scheduled from PM ${pm.pmNumber} on ${new Date().toLocaleDateString('id-ID')}`,
            },
            requesterUserId,
            requesterUserType,
            requesterPengelolaId,
          );

          this.logger.log(`Auto-scheduled new PM: ${newPM.pmNumber} from ${pm.pmNumber}`);
          scheduledCount++;

          // Mark original PM as having been auto-scheduled (optional: add a flag)
          await this.prisma.preventiveMaintenance.update({
            where: { id: pm.id },
            data: {
              notes: `${pm.notes || ''}\n[Auto-scheduled PM ${newPM.pmNumber} on ${new Date().toLocaleDateString('id-ID')}]`.trim(),
            },
          });

        } catch (error: any) {
          this.logger.error(`Error auto-scheduling PM ${pm.pmNumber}: ${error.message}`);
          skippedCount++;
        }
      }

      this.logger.log(`Auto-schedule complete: ${scheduledCount} scheduled, ${skippedCount} skipped`);
    } catch (error: any) {
      this.logger.error(`Error in auto-schedule routine PM: ${error.message}`, error.stack);
    }
  }

  /**
   * Manual trigger for auto-scheduling (can be called via API)
   */
  async triggerAutoSchedule() {
    this.logger.log('Manual trigger for auto-schedule routine PM');
    await this.autoScheduleRoutinePM();
  }
}

