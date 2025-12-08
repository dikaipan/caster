import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreventiveMaintenanceDto, PreventiveMaintenanceType, PreventiveMaintenanceLocation } from './dto/create-pm.dto';
import { UpdatePreventiveMaintenanceDto } from './dto/update-pm.dto';

@Injectable()
export class PreventiveMaintenanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate PM Number: PM-YYMMDD[urutan]
   * Example: PM-2411251 (PM pertama di 24 Nov 2025)
   */
  private async generatePMNumber(): Promise<string> {
    const today = new Date();
    const year = String(today.getFullYear()).slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find last PM number for today
    const lastPM = await this.prisma.preventiveMaintenance.findFirst({
      where: {
        pmNumber: {
          startsWith: `PM-${datePrefix}`,
        },
      },
      orderBy: {
        pmNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastPM) {
      const lastSequence = parseInt(lastPM.pmNumber.slice(-1)) || 0;
      sequence = lastSequence + 1;
    }

    return `PM-${datePrefix}${sequence}`;
  }

  async create(createDto: CreatePreventiveMaintenanceDto, userId: string, userType: string, pengelolaId?: string) {
    // Validate cassettes exist
    const cassettes = await this.prisma.cassette.findMany({
      where: {
        id: { in: createDto.cassetteIds },
      },
      include: {
        customerBank: true,
        cassetteType: true,
        machine: {
          include: {
            pengelola: true,
          },
        },
      },
    });

    if (cassettes.length !== createDto.cassetteIds.length) {
      throw new NotFoundException('One or more cassettes not found');
    }

    // If Pengelola user, validate cassettes belong to their Pengelola
    if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const invalidCassettes = cassettes.filter(
        (cassette) => !cassette.machine || cassette.machine.pengelolaId !== pengelolaId
      );
      if (invalidCassettes.length > 0) {
        throw new ForbiddenException('You can only request PM for cassettes from your Pengelola');
      }
    }

    // ✅ VALIDATE: Check if cassettes have active tickets or PM tasks
    for (const cassette of cassettes) {
      // Check for active problem tickets
      // Exclude soft-deleted tickets (deletedAt is null)
      const activeTicket = await this.prisma.problemTicket.findFirst({
        where: {
          AND: [
            { deletedAt: null }, // Exclude soft-deleted tickets
            {
              cassetteDetails: {
                some: {
                  cassetteId: cassette.id,
                },
              },
            },
            {
              status: {
                notIn: ['CLOSED'], // Any status except CLOSED is considered active
              },
            },
          ],
        },
        select: {
          ticketNumber: true,
          status: true,
        },
      });

      if (activeTicket) {
        throw new BadRequestException(
          `Kaset ${cassette.serialNumber} sudah memiliki tiket aktif (${activeTicket.ticketNumber} - ${activeTicket.status}). Tidak dapat membuat PM task untuk kaset yang sedang dalam proses perbaikan.`
        );
      }

      // Check for active PM tasks
      const activePM = await this.prisma.preventiveMaintenance.findFirst({
        where: {
          cassetteDetails: {
            some: {
              cassetteId: cassette.id,
            },
          },
          status: {
            notIn: ['COMPLETED', 'CANCELLED'], // Only allow if PM is not active
          },
        },
        select: {
          pmNumber: true,
          status: true,
        },
      });

      if (activePM) {
        throw new BadRequestException(
          `Kaset ${cassette.serialNumber} sudah memiliki PM task aktif (${activePM.pmNumber} - ${activePM.status}). Tidak dapat membuat PM task baru.`
        );
      }

      // Check cassette status - should not be in transit or in repair
      const restrictedStatuses = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP', 'IN_TRANSIT_TO_PENGELOLA'];
      if (restrictedStatuses.includes(cassette.status)) {
        throw new BadRequestException(
          `Kaset ${cassette.serialNumber} sedang dalam status ${cassette.status}. Tidak dapat membuat PM task untuk kaset yang sedang dalam proses repair.`
        );
      }
    }

    // Generate PM number
    const pmNumber = await this.generatePMNumber();

    // Determine type and requester based on user type
    const isVendorRequest = userType?.toUpperCase() === 'PENGELOLA';
    
    // Validate and set PM type
    let pmType: PreventiveMaintenanceType;
    if (isVendorRequest) {
      // Pengelola can only create ROUTINE or ON_DEMAND_PENGELOLA
      if (createDto.type === PreventiveMaintenanceType.ROUTINE) {
        pmType = PreventiveMaintenanceType.ROUTINE;
      } else if (createDto.type === PreventiveMaintenanceType.ON_DEMAND_PENGELOLA) {
        pmType = PreventiveMaintenanceType.ON_DEMAND_PENGELOLA;
      } else {
        // Legacy support: if old frontend sends "ON_DEMAND", convert to ON_DEMAND_PENGELOLA
        pmType = PreventiveMaintenanceType.ON_DEMAND_PENGELOLA;
      }
    } else {
      // Hitachi can create ROUTINE, ON_DEMAND_HITACHI, or EMERGENCY
      // Use the type from DTO directly (already validated by DTO)
      pmType = createDto.type;
    }
    
    const requestedByType = isVendorRequest ? 'pengelola' : 'HITACHI';

    // Create PM with cassette details
    return this.prisma.$transaction(async (tx) => {
      // Calculate nextPmDate for ROUTINE PMs
      const scheduledDate = new Date(createDto.scheduledDate);
      const interval = createDto.nextPmInterval || 90;
      const nextPmDate = createDto.type === PreventiveMaintenanceType.ROUTINE 
        ? new Date(scheduledDate.getTime() + interval * 24 * 60 * 60 * 1000)
        : null;

      const pm = await tx.preventiveMaintenance.create({
        data: {
          pmNumber,
          type: pmType,
          location: (createDto.location || PreventiveMaintenanceLocation.PENGELOLA_LOCATION) as PreventiveMaintenanceLocation, // Default to Pengelola location
          status: 'SCHEDULED',
          scheduledDate,
          scheduledTime: createDto.scheduledTime,
          title: createDto.title,
          description: createDto.description,
          // Only Hitachi can assign engineer directly, Pengelola requests will be assigned later
          assignedEngineer: isVendorRequest ? null : createDto.assignedEngineer,
          // ✅ FIX: requestedByPengelola should be PengelolaUser.id (userId), not Pengelola.id (pengelolaId)
          requestedByPengelola: isVendorRequest ? userId : null,
          requestedByHitachi: isVendorRequest ? null : userId,
          requestedByType,
          contactName: createDto.contactName,
          contactPhone: createDto.contactPhone,
          locationAddress: createDto.locationAddress,
          locationCity: createDto.locationCity,
          locationProvince: createDto.locationProvince,
          locationPostalCode: createDto.locationPostalCode,
          nextPmInterval: createDto.type === PreventiveMaintenanceType.ROUTINE ? interval : null, // Only set for ROUTINE
          nextPmDate, // Set next PM date for ROUTINE PMs
          notes: createDto.notes,
        },
      });

      // Create cassette details
      const cassetteDetails = await Promise.all(
        cassettes.map((cassette) =>
          tx.pMCassetteDetail.create({
            data: {
              pmId: pm.id,
              cassetteId: cassette.id,
              status: 'PENDING',
            },
          }),
        ),
      );

      return {
        ...pm,
        cassetteDetails: cassetteDetails.map((detail, index) => ({
          ...detail,
          cassette: cassettes[index],
        })),
      };
    });
  }

  async findAll(
    userType: string,
    userIdOrPengelolaId?: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: string,
    dateFilter?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const whereClause: any = {
      AND: [],
    };

    // Pengelola users can only see PMs they requested
    // Note: requestedByPengelola stores PengelolaUser.id (userId), not Pengelola.id (pengelolaId)
    if (userType?.toUpperCase() === 'PENGELOLA' && userIdOrPengelolaId) {
      whereClause.AND.push({ requestedByPengelola: userIdOrPengelolaId });
    }

    // Exclude soft-deleted PMs (PMs that have deletedAt set)
    whereClause.AND.push({
      deletedAt: null,
    });

    // Status filter
    if (status) {
      whereClause.AND.push({ status });
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let dateFilterClause: any = {};
      switch (dateFilter) {
        case 'TODAY':
          dateFilterClause = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          };
          break;
        case 'YESTERDAY':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateFilterClause = {
            gte: yesterday,
            lt: today,
          };
          break;
        case 'THIS_WEEK':
          const weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          dateFilterClause = { gte: weekStart };
          break;
        case 'THIS_MONTH':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilterClause = { gte: monthStart };
          break;
        case 'LAST_7_DAYS':
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          dateFilterClause = { gte: last7Days };
          break;
        case 'LAST_30_DAYS':
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          dateFilterClause = { gte: last30Days };
          break;
      }
      if (Object.keys(dateFilterClause).length > 0) {
        whereClause.AND.push({ scheduledDate: dateFilterClause });
      }
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause.AND.push({
        OR: [
          { pmNumber: { contains: searchTerm.toLowerCase() } },
          { title: { contains: searchTerm.toLowerCase() } },
          {
            engineer: {
              fullName: { contains: searchTerm.toLowerCase() },
            },
          },
          {
            cassetteDetails: {
              some: {
                cassette: {
                  serialNumber: { contains: searchTerm.toLowerCase() },
                },
              },
            },
          },
        ],
      });
    }

    // Always keep AND wrapper since we always have at least the exclude deleted PM filter
    // If somehow AND is empty, ensure we still exclude deleted PMs
    if (whereClause.AND.length === 0) {
      whereClause.AND.push({
        OR: [
          { cancelledReason: null },
          { cancelledReason: { not: { startsWith: '[DELETED BY ADMIN]' } } },
        ],
      });
    }

    // Get total count
    const total = await this.prisma.preventiveMaintenance.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Determine orderBy
    const orderBy = this.getOrderBy(sortBy || 'scheduledDate', sortOrder);

    const pms = await this.prisma.preventiveMaintenance.findMany({
      where: whereClause,
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
                customerBank: true,
                machine: true,
              },
            },
          },
        },
        engineer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        requesterPengelola: {
          select: {
            id: true,
            fullName: true,
            email: true,
            pengelola: {
              select: {
                companyName: true,
              },
            },
          },
        },
        requesterHitachi: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    return {
      data: pms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const validSortFields: Record<string, string> = {
      scheduledDate: 'scheduledDate',
      createdAt: 'createdAt',
      status: 'status',
      actualEndDate: 'actualEndDate',
      pmNumber: 'pmNumber',
    };

    const field = validSortFields[sortBy] || 'scheduledDate';
    return { [field]: sortOrder };
  }

  async findOne(id: string, userType: string, userIdOrPengelolaId?: string) {
    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id },
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
                customerBank: true,
                machine: true,
              },
            },
          },
        },
        engineer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        requesterPengelola: {
          select: {
            id: true,
            fullName: true,
            email: true,
            pengelola: {
              select: {
                companyName: true,
              },
            },
          },
        },
        requesterHitachi: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        canceller: {
          select: {
            id: true,
            fullName: true,
          },
        },
        completer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    // Check Pengelola access
    // Note: requestedByPengelola stores PengelolaUser.id (userId), not Pengelola.id (pengelolaId)
    if (userType?.toUpperCase() === 'PENGELOLA' && userIdOrPengelolaId) {
      // Verify that this PM was requested by this pengelola user
      if (pm.requestedByPengelola !== userIdOrPengelolaId) {
        throw new ForbiddenException('You can only access PM tasks that you requested');
      }
    }

    return pm;
  }

  async update(id: string, updateDto: UpdatePreventiveMaintenanceDto, userId: string, userType: string) {
    // Only Hitachi users can update PM
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi users can update preventive maintenance');
    }

    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    const updateData: any = {};

    // Status transitions
    if (updateDto.status) {
      if (updateDto.status === 'IN_PROGRESS' && pm.status === 'SCHEDULED') {
        updateData.actualStartDate = new Date();
        updateData.status = 'IN_PROGRESS'; // IMPORTANT: Set status to IN_PROGRESS
        updateData.status = 'IN_PROGRESS';
      } else if (updateDto.status === 'COMPLETED' && pm.status === 'IN_PROGRESS') {
        updateData.actualEndDate = new Date();
        // Set completedBy directly (same approach as cancelledBy)
        updateData.completedBy = userId;
        updateData.completedAt = new Date();
        updateData.status = 'COMPLETED'; // Set status to COMPLETED

        // Calculate duration
        if (pm.actualStartDate) {
          const duration = Math.round(
            (new Date().getTime() - pm.actualStartDate.getTime()) / (1000 * 60),
          );
          updateData.duration = duration;
        }

        // Set next PM date if interval provided
        if (updateDto.nextPmInterval || pm.nextPmInterval) {
          const interval = updateDto.nextPmInterval || pm.nextPmInterval || 90;
          updateData.nextPmDate = new Date(
            new Date().getTime() + interval * 24 * 60 * 60 * 1000,
          );
        }
      } else if (updateDto.status === 'CANCELLED') {
        if (!updateDto.cancelledReason) {
          throw new BadRequestException('Cancelled reason is required when cancelling PM');
        }
        updateData.cancelledReason = updateDto.cancelledReason;
        updateData.cancelledBy = userId;
        updateData.cancelledAt = new Date();
        updateData.status = 'CANCELLED'; // IMPORTANT: Set status to CANCELLED
      } else if (updateDto.status === 'RESCHEDULED') {
        // Reschedule can only be done from SCHEDULED status
        if (pm.status !== 'SCHEDULED') {
          throw new BadRequestException('PM can only be rescheduled from SCHEDULED status');
        }
        if (!updateDto.scheduledDate) {
          throw new BadRequestException('Scheduled date is required when rescheduling PM');
        }
        
        const newScheduledDate = new Date(updateDto.scheduledDate);
        const oldScheduledDate = pm.scheduledDate;
        
        // Validate new date is in the future
        if (newScheduledDate <= new Date()) {
          throw new BadRequestException('New scheduled date must be in the future');
        }
        
        // Update scheduled date
        updateData.scheduledDate = newScheduledDate;
        
        // Add reschedule note to track history
        const rescheduleReason = updateDto.rescheduledReason || 'Tidak ada alasan yang diberikan';
        const rescheduleNote = `PM dijadwalkan ulang dari ${oldScheduledDate.toLocaleDateString('id-ID')} ke ${newScheduledDate.toLocaleDateString('id-ID')} pada ${new Date().toLocaleDateString('id-ID')}. Alasan: ${rescheduleReason}`;
        updateData.notes = pm.notes 
          ? `${pm.notes}\n\n${rescheduleNote}` 
          : rescheduleNote;
        
        // After reschedule, status returns to SCHEDULED with new date
        updateData.status = 'SCHEDULED';
      } else {
        // For other status changes, use the provided status
        updateData.status = updateDto.status;
      }
    }

    // Other fields
    if (updateDto.scheduledDate && updateDto.status !== 'RESCHEDULED') {
      updateData.scheduledDate = new Date(updateDto.scheduledDate);
    }
    if (updateDto.scheduledTime) {
      updateData.scheduledTime = updateDto.scheduledTime;
    }
    if (updateDto.assignedEngineer) {
      updateData.assignedEngineer = updateDto.assignedEngineer;
    }
    if (updateDto.findings !== undefined) {
      updateData.findings = updateDto.findings;
    }
    if (updateDto.actionsTaken !== undefined) {
      updateData.actionsTaken = updateDto.actionsTaken;
    }
    if (updateDto.partsReplaced !== undefined) {
      updateData.partsReplaced = updateDto.partsReplaced;
    }
    if (updateDto.recommendations !== undefined) {
      updateData.recommendations = updateDto.recommendations;
    }
    if (updateDto.nextPmDate) {
      updateData.nextPmDate = new Date(updateDto.nextPmDate);
    }
    if (updateDto.nextPmInterval) {
      updateData.nextPmInterval = updateDto.nextPmInterval;
    }
    if (updateDto.checklist !== undefined) {
      updateData.checklist = updateDto.checklist;
    }
    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes;
    }

    return this.prisma.preventiveMaintenance.update({
      where: { id },
      data: updateData,
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
                customerBank: true,
              },
            },
          },
        },
        engineer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async takeTask(id: string, userId: string) {
    const pm = await this.findOne(id, 'HITACHI', undefined);

    // Check if task is already assigned to someone else
    if (pm.assignedEngineer && pm.assignedEngineer !== userId) {
      throw new BadRequestException(
        `This PM task is already assigned to ${pm.engineer?.fullName || 'another engineer'}. You cannot take it.`
      );
    }

    // Assign task to current user
    return this.prisma.preventiveMaintenance.update({
      where: { id },
      data: {
        assignedEngineer: userId,
      },
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
                customerBank: {
                  select: {
                    bankCode: true,
                    bankName: true,
                  },
                },
              },
            },
          },
        },
        engineer: {
          select: {
            fullName: true,
            role: true,
          },
        },
        requesterPengelola: {
          select: {
            fullName: true,
          },
        },
        requesterHitachi: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  async updateCassetteDetail(
    pmId: string,
    cassetteId: string,
    updateData: {
      checklist?: any;
      findings?: string;
      actionsTaken?: string;
      partsReplaced?: any;
      status?: string;
      notes?: string;
    },
    userId: string,
    userType: string,
  ) {
    // Only Hitachi users can update cassette details
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi users can update cassette details');
    }

    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id: pmId },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    if (pm.status === 'COMPLETED' || pm.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update cassette details for completed or cancelled PM');
    }

    return this.prisma.pMCassetteDetail.update({
      where: {
        pmId_cassetteId: {
          pmId,
          cassetteId,
        },
      },
      data: updateData,
      include: {
        cassette: {
          include: {
            cassetteType: true,
            customerBank: true,
          },
        },
      },
    });
  }

  async cancel(id: string, reason: string, userId: string, userType: string, pengelolaId?: string) {
    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id },
      include: {
        requesterPengelola: {
          include: {
            pengelola: true,
          },
        },
      },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    if (pm.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed preventive maintenance');
    }

    // Permission check: Hitachi can cancel any PM, Pengelola can only cancel their own requests
    if (userType === 'PENGELOLA') {
      if (!pengelolaId || pm.requesterPengelola?.pengelolaId !== pengelolaId) {
        throw new ForbiddenException('You can only cancel PM requests from your Pengelola');
      }
    } else if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi users and Pengelola can cancel preventive maintenance');
    }

    return this.prisma.preventiveMaintenance.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledReason: reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
        // Disable auto-scheduling by clearing nextPmDate and nextPmInterval
        nextPmDate: null,
        nextPmInterval: null,
      },
    });
  }

  /**
   * Disable auto-scheduling for a routine PM (cancel future PM plan)
   * This clears nextPmDate and nextPmInterval to stop auto-scheduling
   */
  async disableAutoSchedule(id: string, userId: string, userType: string, pengelolaId?: string) {
    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id },
      include: {
        requesterPengelola: {
          include: {
            pengelola: true,
          },
        },
      },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    if (pm.type !== PreventiveMaintenanceType.ROUTINE) {
      throw new BadRequestException('Auto-scheduling can only be disabled for routine PM');
    }

    // Permission check: Hitachi can disable any PM, Pengelola can only disable their own requests
    if (userType === 'PENGELOLA') {
      if (!pengelolaId || pm.requesterPengelola?.pengelolaId !== pengelolaId) {
        throw new ForbiddenException('You can only disable auto-scheduling for PM requests from your Pengelola');
      }
    } else if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi users and Pengelola can disable auto-scheduling');
    }

    return this.prisma.preventiveMaintenance.update({
      where: { id },
      data: {
        nextPmDate: null,
        nextPmInterval: null,
        notes: pm.notes 
          ? `${pm.notes}\n[Auto-scheduling dinonaktifkan pada ${new Date().toLocaleDateString('id-ID')} oleh ${userType === 'PENGELOLA' ? 'Pengelola' : 'Hitachi'}]`
          : `Auto-scheduling dinonaktifkan pada ${new Date().toLocaleDateString('id-ID')} oleh ${userType === 'PENGELOLA' ? 'Pengelola' : 'Hitachi'}`,
      },
    });
  }

  /**
   * DELETE PM (Soft Delete)
   * Only SUPER_ADMIN and RC_MANAGER can delete PM
   * SUPER_ADMIN can delete COMPLETED or CANCELLED PM
   * RC_MANAGER can only delete non-COMPLETED, non-CANCELLED, and non-IN_PROGRESS PM
   */
  async delete(id: string, userId: string, userRole?: string) {
    const pm = await this.prisma.preventiveMaintenance.findUnique({
      where: { id },
      include: {
        cassetteDetails: true,
      },
    });

    if (!pm) {
      throw new NotFoundException('Preventive maintenance not found');
    }

    // SUPER_ADMIN can delete any PM (including COMPLETED and CANCELLED)
    // RC_MANAGER cannot delete IN_PROGRESS, COMPLETED, or CANCELLED PM
    if (userRole !== 'SUPER_ADMIN') {
      if (pm.status === 'IN_PROGRESS') {
        throw new BadRequestException('Cannot delete PM that is in progress. Please cancel it first.');
      }

      if (pm.status === 'COMPLETED') {
        throw new BadRequestException('Cannot delete completed PM. Only Super Admin can delete completed PM.');
      }

      if (pm.status === 'CANCELLED') {
        throw new BadRequestException('Cannot delete cancelled PM. Only Super Admin can delete cancelled PM.');
      }
    }

    // Soft delete: Set deletedAt and deletedBy
    // Keep original status and cancelledReason if exists
    return this.prisma.preventiveMaintenance.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        notes: pm.notes 
          ? `${pm.notes}\n[DELETED on ${new Date().toLocaleDateString('id-ID')} by ${userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'RC Manager'}]`
          : `[DELETED on ${new Date().toLocaleDateString('id-ID')} by ${userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'RC Manager'}]`,
      },
    });
  }

  async getUnassignedPMTasksCount(userType: string, userId?: string): Promise<number> {
    try {
      const whereClause: any = {
        AND: [],
      };

      // Exclude soft-deleted PMs
      whereClause.AND.push({ deletedAt: null });

      // Status filter - only SCHEDULED and IN_PROGRESS
      whereClause.AND.push({ status: { in: ['SCHEDULED', 'IN_PROGRESS'] } });

      // For HITACHI users, count unassigned tasks OR tasks assigned to current user
      if (userType === 'HITACHI') {
        if (userId) {
          whereClause.AND.push({
            OR: [
              { assignedEngineer: null }, // Unassigned
              { assignedEngineer: userId }, // Assigned to current user
            ],
          });
        } else {
          whereClause.AND.push({ assignedEngineer: null }); // Only unassigned if no userId
        }
      } else if (userType?.toUpperCase() === 'PENGELOLA' && userId) {
        // Pengelola can only see PMs they requested
        whereClause.AND.push({ requestedByPengelola: userId });
      }

      const count = await this.prisma.preventiveMaintenance.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      console.error('Error in getUnassignedPMTasksCount', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Return 0 instead of throwing to prevent breaking the UI
      return 0;
    }
  }
}

