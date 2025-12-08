import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepairTicketDto, UpdateRepairTicketDto, CompleteRepairDto } from './dto';
import { WarrantyService } from '../warranty/warranty.service';

@Injectable()
export class RepairsService {
  private readonly logger = new Logger(RepairsService.name);
  
  constructor(
    private prisma: PrismaService,
    private warrantyService: WarrantyService,
  ) {}

  async findAll(
    userType: string,
    role?: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: string,
    dateFilter?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    // Only RC staff and managers can see repair tickets
    if (userType !== 'HITACHI' || (role !== 'RC_STAFF' && role !== 'RC_MANAGER' && role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only Repair Center staff can access repair tickets');
    }

    const whereClause: any = {
      deletedAt: null, // Filter out soft-deleted repair tickets
      // Also filter out repair tickets associated with deleted tickets
      // Show repair ticket if:
      // 1. It's not associated with any ticket (standalone), OR
      // 2. It has at least one non-deleted ticket via delivery, OR  
      // 3. It has at least one non-deleted ticket via ticket detail
      OR: [
        // Repair tickets not associated with any ticket (standalone from PM or direct)
        {
          cassette: {
            deliveries: { none: {} },
            ticketCassetteDetails: { none: {} },
          },
        },
        // Repair tickets with at least one non-deleted ticket via delivery
        {
          cassette: {
            deliveries: {
              some: {
                ticket: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        // Repair tickets with at least one non-deleted ticket via ticket detail
        {
          cassette: {
            ticketCassetteDetails: {
              some: {
                ticket: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      ],
    };
    const andConditions: any[] = [];
    let dateFilterCondition: any = null;

    // Status filter - show all by default, but allow filtering
    if (status && status !== 'ALL') {
      if (status === 'COMPLETED') {
        whereClause.status = 'COMPLETED';
      } else if (status === 'PENDING') {
        whereClause.qcPassed = null;
      } else {
        whereClause.status = status;
      }
    }
    // If status is 'ALL' or not specified, show all statuses (no filter)

    // Date filter - default to ALL if not specified (show all dates)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Date filter - use createdAt as primary filter
    // Default to ALL if not specified (show all dates)
    if (dateFilter === 'ALL' || !dateFilter) {
      // Show all dates - no date filter
    } else {
      // Use specified filter
      let dateFilterToUse = dateFilter;
      
      // Date filter - use createdAt as primary filter since receivedAtRc might be null
      // This is simpler and more reliable than trying to handle null receivedAtRc
      switch (dateFilterToUse) {
        case 'TODAY':
          dateFilterCondition = {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          };
          break;
        case 'YESTERDAY':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateFilterCondition = {
            createdAt: {
              gte: yesterday,
              lt: today,
            },
          };
          break;
        case 'THIS_WEEK':
          const weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          dateFilterCondition = {
            createdAt: { gte: weekStart },
          };
          break;
        case 'THIS_MONTH':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilterCondition = {
            createdAt: { gte: monthStart },
          };
          break;
        case 'LAST_7_DAYS':
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          dateFilterCondition = {
            createdAt: { gte: last7Days },
          };
          break;
        case 'LAST_30_DAYS':
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          dateFilterCondition = {
            createdAt: { gte: last30Days },
          };
          break;
        default:
          // Default to LAST_30_DAYS if unknown filter
          const defaultLast30Days = new Date(today);
          defaultLast30Days.setDate(defaultLast30Days.getDate() - 30);
          dateFilterCondition = {
            createdAt: { gte: defaultLast30Days },
          };
          break;
      }
      
    }

    // Build AND conditions array
    // Add date filter condition if exists
    if (dateFilterCondition) {
      andConditions.push(dateFilterCondition);
    }
    
    // Add search condition if exists
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchCondition = {
        OR: [
          { reportedIssue: { contains: searchTerm.toLowerCase() } },
          {
            cassette: {
              OR: [
                { serialNumber: { contains: searchTerm.toLowerCase() } },
                {
                  customerBank: {
                    OR: [
                      { bankName: { contains: searchTerm.toLowerCase() } },
                      { bankCode: { contains: searchTerm.toLowerCase() } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
      andConditions.push(searchCondition);
    }
    
    // Combine all conditions using AND
    // Only add AND if we have conditions to combine
    if (andConditions.length > 0) {
      // If we already have status, qcPassed, or OR in whereClause, we need to wrap everything
      const baseConditions: any = {
        deletedAt: null, // Always filter out soft-deleted repair tickets
      };
      
      // Preserve existing OR condition for filtering deleted tickets
      if (whereClause.OR && Array.isArray(whereClause.OR)) {
        baseConditions.OR = whereClause.OR;
        delete whereClause.OR;
      }
      
      if (whereClause.status) {
        baseConditions.status = whereClause.status;
        delete whereClause.status;
      }
      if (whereClause.qcPassed !== undefined) {
        baseConditions.qcPassed = whereClause.qcPassed;
        delete whereClause.qcPassed;
      }
      
      // Combine base conditions with AND conditions
      whereClause.AND = [baseConditions, ...andConditions];
    } else {
      // If no additional conditions, ensure deletedAt is still filtered
      if (!whereClause.deletedAt) {
        whereClause.deletedAt = null;
      }
    }

    // Get total count
    const total = await this.prisma.repairTicket.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Determine orderBy
    const orderBy = this.getOrderBy(sortBy || 'receivedAtRc', sortOrder);

    // Fetch repairs with pagination
    const repairs = await this.prisma.repairTicket.findMany({
      where: whereClause,
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
            deliveries: {
              where: {
                ticket: {
                  deletedAt: null, // Only include deliveries from non-deleted tickets
                },
              },
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    status: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1, // Get the most recent delivery
            },
            ticketCassetteDetails: {
              where: {
                ticket: {
                  deletedAt: null, // Only include details from non-deleted tickets
                },
              },
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    status: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1, // Get the most recent ticket detail
            },
          },
        },
        repairer: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    return {
      data: repairs,
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
      receivedAtRc: 'receivedAtRc',
      createdAt: 'createdAt',
      status: 'status',
      completedAt: 'completedAt',
    };

    const field = validSortFields[sortBy] || 'receivedAtRc';
    return { [field]: sortOrder };
  }

  async findByTicketId(ticketId: string, userType: string) {
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi staff can access repair tickets');
    }

    // Get ticket to find all cassettes and creation date
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        createdAt: true,
        cassetteDetails: {
          include: {
            cassette: {
              select: { id: true },
            },
          },
        },
        cassette: {
          select: { id: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Get all cassette IDs from this ticket
    const cassetteIds: string[] = [];
    if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
      ticket.cassetteDetails.forEach((detail: any) => {
        if (detail.cassette?.id) {
          cassetteIds.push(detail.cassette.id);
        }
      });
    } else if (ticket.cassette?.id) {
      cassetteIds.push(ticket.cassette.id);
    }

    if (cassetteIds.length === 0) {
      return [];
    }

    // Only show repair tickets created AFTER this SO was created
    // This ensures we only show repair tickets from this SO, not from previous SOs
    const ticketCreatedAt = ticket.createdAt;

    // Fetch repairs for these cassettes that were created after this SO
    return this.prisma.repairTicket.findMany({
      where: {
        cassetteId: {
          in: cassetteIds,
        },
        createdAt: {
          gte: ticketCreatedAt, // Only repairs created after or at the same time as SO creation
        },
      },
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
        repairer: {
          select: {
            fullName: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: { receivedAtRc: 'desc' },
    });
  }

  async findOne(id: string, userType: string) {
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi staff can access repair tickets');
    }

    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: {
        cassette: {
          include: {
            cassetteType: true,
            customerBank: true,
          },
        },
        repairer: {
          select: {
            fullName: true,
            role: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Repair ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async create(createDto: CreateRepairTicketDto, userId: string, userType: string) {
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only RC staff can create repair tickets');
    }

    // Verify cassette exists and is in correct status
    const cassette = await this.prisma.cassette.findUnique({
      where: { id: createDto.cassetteId },
    });

    if (!cassette) {
      throw new NotFoundException('Cassette not found');
    }

    if (cassette.status !== 'IN_TRANSIT_TO_RC' && cassette.status !== 'BAD') {
      throw new BadRequestException(
        'Cassette must be IN_TRANSIT_TO_RC or BAD to create repair ticket',
      );
    }

    // Create repair ticket and update cassette status
    return this.prisma.$transaction(async (tx) => {
      // Update cassette to IN_REPAIR
      await tx.cassette.update({
        where: { id: createDto.cassetteId },
        data: { status: 'IN_REPAIR' },
      });

      // Create repair ticket
      return tx.repairTicket.create({
        data: {
          cassetteId: createDto.cassetteId,
          reportedIssue: createDto.reportedIssue,
          receivedAtRc: new Date(),
          status: 'RECEIVED',
          type: createDto.type || 'ROUTINE',
          notes: createDto.notes,
        } as any, // Type assertion until Prisma client is regenerated
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: true,
            },
          },
        },
      });
    });
  }

  async createBulkFromTicket(ticketId: string, userId: string, userType: string) {
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only RC staff can create repair tickets');
    }

    // Try to find ProblemTicket (SO) first
    let ticket: any = await this.prisma.problemTicket.findUnique({
      where: { id: ticketId },
      include: {
        cassette: true,
        cassetteDetails: {
          include: {
            cassette: true,
          },
        },
      },
    });

    let ticketType = 'SO';
    let repairTicketType: any = 'ROUTINE'; // Default for SO

    // If not found, try to find PreventiveMaintenance (PM)
    if (!ticket) {
      ticket = await this.prisma.preventiveMaintenance.findUnique({
        where: { id: ticketId },
        include: {
          cassetteDetails: {
            include: {
              cassette: true,
            },
          },
        },
      });
      ticketType = 'PM';
      
      // Map PM type to RepairTicketType
      if (ticket) {
        const pmType = ticket.type;
        if (pmType === 'ROUTINE') {
          repairTicketType = 'ROUTINE';
        } else if (pmType === 'ON_DEMAND_PENGELOLA') {
          repairTicketType = 'ON_DEMAND_PENGELOLA';
        } else if (pmType === 'ON_DEMAND_HITACHI') {
          repairTicketType = 'ON_DEMAND_HITACHI';
        } else if (pmType === 'EMERGENCY') {
          repairTicketType = 'EMERGENCY';
        }
      }
    }

    if (!ticket) {
      throw new NotFoundException('Ticket not found (checked both SO and PM tickets)');
    }

    // Validate status based on ticket type
    if (ticketType === 'SO') {
      if (ticket.status !== 'RECEIVED') {
        throw new BadRequestException('Service Order must be in RECEIVED status to start repair');
      }
    } else if (ticketType === 'PM') {
      // PM tickets might need different status validation
      // Allow creating repair from PM if status is IN_PROGRESS or COMPLETED (if issues found)
      if (ticket.status !== 'IN_PROGRESS' && ticket.status !== 'COMPLETED') {
        throw new BadRequestException(`Preventive Maintenance must be IN_PROGRESS or COMPLETED to create repair ticket. Current status: ${ticket.status}`);
      }
    }

    // Get all cassettes (multi or single)
    let cassetteList = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
      ? ticket.cassetteDetails.map((detail: any) => detail.cassette).filter((c: any): c is NonNullable<typeof c> => c !== null)
      : (ticket.cassette ? [ticket.cassette] : []);
    
    this.logger.debug(`Initial cassette list from cassetteDetails: ${cassetteList.length} cassettes`);
    
    // Also check cassetteDelivery for additional cassettes (for single-cassette tickets)
    if (ticketType === 'SO' && cassetteList.length === 0) {
      const ticketWithDelivery = await this.prisma.problemTicket.findUnique({
        where: { id: ticketId },
        include: {
          cassetteDelivery: {
            include: {
              cassette: true,
            },
          },
        },
      });
      
      if (ticketWithDelivery?.cassetteDelivery?.cassette) {
        const deliveryCassette = ticketWithDelivery.cassetteDelivery.cassette;
        // Add delivery cassette if not already in list
        if (!cassetteList.find((c: any) => c.id === deliveryCassette.id)) {
          cassetteList.push(deliveryCassette);
          this.logger.debug(`Added cassette from cassetteDelivery: ${deliveryCassette.serialNumber}`);
        }
      }
    }

    if (cassetteList.length === 0) {
      throw new BadRequestException('No cassettes found for this ticket');
    }

    // Deduplicate cassettes by ID (in case of duplicates in ticket_cassette_details)
    const uniqueCassettesMap = new Map<string, any>();
    for (const cassette of cassetteList) {
      if (cassette && cassette.id) {
        if (!uniqueCassettesMap.has(cassette.id)) {
          uniqueCassettesMap.set(cassette.id, cassette);
        } else {
          this.logger.warn(`Duplicate cassette found in ticket: ${cassette.serialNumber} (ID: ${cassette.id})`);
        }
      }
    }
    cassetteList = Array.from(uniqueCassettesMap.values());

    // Validate maximum cassettes limit (30)
    const MAX_CASSETTES = 30;
    if (cassetteList.length > MAX_CASSETTES) {
      this.logger.error(`Ticket has ${cassetteList.length} cassettes, exceeding maximum of ${MAX_CASSETTES}`);
      throw new BadRequestException(
        `Ticket contains ${cassetteList.length} cassettes, which exceeds the maximum limit of ${MAX_CASSETTES} cassettes per ticket. Please contact administrator.`
      );
    }

    this.logger.debug(`Processing ${cassetteList.length} unique cassettes for ${ticketType} ${ticket.ticketNumber || ticket.pmNumber}`);
    
    // Log all cassette statuses for debugging
    for (const cassette of cassetteList) {
      this.logger.debug(`Cassette ${cassette.serialNumber} (ID: ${cassette.id}) has status: ${cassette.status}`);
    }

    // Verify all cassettes are in correct status
    // For multi-cassette tickets, cassettes should be in IN_REPAIR status if already received at RC
    // Allow multiple valid statuses for flexibility
    const validStatuses = ['IN_TRANSIT_TO_RC', 'BAD', 'RECEIVED', 'IN_REPAIR'];
    
    for (const cassette of cassetteList) {
      if (!validStatuses.includes(cassette.status)) {
        this.logger.warn(`Cassette ${cassette.serialNumber} has status ${cassette.status}, expected one of: ${validStatuses.join(', ')}`);
        // Try to update to IN_TRANSIT_TO_RC if it's a valid transition
        if (cassette.status === 'IN_DELIVERY' || cassette.status === 'OK') {
          this.logger.debug(`Attempting to update cassette ${cassette.serialNumber} from ${cassette.status} to IN_TRANSIT_TO_RC`);
          await this.prisma.cassette.update({
            where: { id: cassette.id },
            data: { status: 'IN_TRANSIT_TO_RC' },
          });
          cassette.status = 'IN_TRANSIT_TO_RC';
        } else {
          throw new BadRequestException(
            `Cassette ${cassette.serialNumber} must be in one of these statuses: ${validStatuses.join(', ')} to create repair ticket. Current status: ${cassette.status}`,
          );
        }
      }
    }

    // Create repair tickets for all cassettes in transaction
    return this.prisma.$transaction(async (tx) => {
      const createdRepairs: any[] = [];
      const skippedRepairs: any[] = [];

      for (const cassette of cassetteList) {
        // Check if there's already an active repair ticket for this cassette
        const existingRepair = await tx.repairTicket.findFirst({
          where: {
            cassetteId: cassette.id,
            deletedAt: null, // Only check non-deleted repair tickets
            status: {
              in: ['RECEIVED', 'DIAGNOSING', 'ON_PROGRESS'],
            },
          },
          include: {
            cassette: {
              include: {
                deliveries: {
                  include: {
                    ticket: {
                      select: {
                        id: true,
                        ticketNumber: true,
                        deletedAt: true,
                      },
                    },
                  },
                },
                ticketCassetteDetails: {
                  include: {
                    ticket: {
                      select: {
                        id: true,
                        ticketNumber: true,
                        deletedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (existingRepair) {
          // Check if the existing repair is associated with the current ticket (non-deleted)
          const isAssociatedWithCurrentTicket = 
            existingRepair.cassette.deliveries.some((delivery: any) => 
              delivery.ticket.id === ticketId && delivery.ticket.deletedAt === null
            ) ||
            existingRepair.cassette.ticketCassetteDetails.some((detail: any) => 
              detail.ticket.id === ticketId && detail.ticket.deletedAt === null
            );
          
          if (isAssociatedWithCurrentTicket) {
            // Repair ticket is already associated with this ticket, skip
            this.logger.debug(`Skipping cassette ${cassette.serialNumber} - already has active repair ticket ${existingRepair.id} for this ticket`);
            skippedRepairs.push({
              cassetteId: cassette.id,
              cassetteSerialNumber: cassette.serialNumber,
              existingRepairId: existingRepair.id,
              existingRepairStatus: existingRepair.status,
            });
            continue; // Skip this cassette
          } else {
            // Repair ticket exists but is associated with a different (possibly deleted) ticket
            // Soft delete the old repair ticket and create a new one
            this.logger.debug(`Found existing repair ticket ${existingRepair.id} for cassette ${cassette.serialNumber} but it's associated with a different/deleted ticket. Soft deleting and creating new one.`);
            await tx.repairTicket.update({
              where: { id: existingRepair.id },
              data: {
                deletedAt: new Date(),
                deletedBy: userId,
              },
            });
            // Continue to create new repair ticket below
          }
        }

        // Update cassette to IN_REPAIR
        await tx.cassette.update({
          where: { id: cassette.id },
          data: { status: 'IN_REPAIR' },
        });

        // Create repair ticket
        const repair = await tx.repairTicket.create({
          data: {
            cassetteId: cassette.id,
            reportedIssue: ticket.title || 'Repair needed',
            receivedAtRc: new Date(),
            status: 'RECEIVED',
            type: repairTicketType,
            notes: ticket.description || undefined,
          } as any, // Type assertion until Prisma client is regenerated
          include: {
            cassette: {
              include: {
                cassetteType: true,
                customerBank: true,
              },
            },
          },
        });

        createdRepairs.push(repair);
      }

      // Update ticket status based on ticket type (only if we created at least one repair)
      if (createdRepairs.length > 0) {
        if (ticketType === 'SO') {
          // Update SO status to IN_PROGRESS
          await tx.problemTicket.update({
            where: { id: ticketId },
            data: { status: 'IN_PROGRESS' as any },
          });
          this.logger.log(`Created ${createdRepairs.length} repair tickets for SO ${ticket.ticketNumber}`);
        } else if (ticketType === 'PM') {
          // For PM, we might want to update status or leave it as is
          // PM status update logic can be added here if needed
          this.logger.log(`Created ${createdRepairs.length} repair tickets for PM ${ticket.pmNumber}`);
        }
      } else {
        this.logger.debug(`No new repair tickets created for ${ticketType} ${ticket.ticketNumber || ticket.pmNumber} - all cassettes already have active repairs`);
      }

      return {
        ticketId,
        ticketNumber: ticketType === 'SO' ? ticket.ticketNumber : ticket.pmNumber,
        repairTickets: createdRepairs,
        skippedRepairs: skippedRepairs,
        count: createdRepairs.length,
        skippedCount: skippedRepairs.length,
        message: createdRepairs.length > 0
          ? `Successfully created ${createdRepairs.length} repair ticket(s)${skippedRepairs.length > 0 ? `. Skipped ${skippedRepairs.length} cassette(s) with existing active repairs.` : ''}`
          : `No new repair tickets created. All ${skippedRepairs.length} cassette(s) already have active repair tickets.`,
      };
    });
  }

  async update(id: string, updateDto: UpdateRepairTicketDto, userId: string) {
    await this.findOne(id, 'HITACHI');

    return this.prisma.repairTicket.update({
      where: { id },
      data: {
        ...updateDto,
        repairedBy: updateDto.repairedBy || userId,
      },
    });
  }

  async takeTicket(id: string, userId: string) {
    const ticket = await this.findOne(id, 'HITACHI');

    // Check if ticket is already assigned to someone else
    if (ticket.repairedBy && ticket.repairedBy !== userId) {
      throw new BadRequestException(
        `This ticket is already assigned to ${ticket.repairer?.fullName || 'another engineer'}. You cannot take it.`
      );
    }

    // Assign ticket to current user
    return this.prisma.repairTicket.update({
      where: { id },
      data: {
        repairedBy: userId,
      },
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
        repairer: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  async completeRepair(id: string, completeDto: CompleteRepairDto, userId: string) {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: { cassette: true },
    });

    if (!ticket) {
      throw new NotFoundException('Repair ticket not found');
    }

    if (ticket.status === 'COMPLETED') {
      throw new BadRequestException('Repair ticket is already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get cassette with customer bank info for warranty calculation
      const cassette = await tx.cassette.findUnique({
        where: { id: ticket.cassetteId },
        include: { customerBank: true },
      });

      if (!cassette) {
        throw new NotFoundException('Cassette not found');
      }

      // Calculate warranty if QC passed
      let warrantyData: any = null;
      if (completeDto.qcPassed) {
        try {
          // Determine warranty type based on bank config
          const warrantyType = await this.warrantyService.determineWarrantyType(
            cassette.customerBankId,
          );

          // Calculate warranty dates
          const warrantyInfo = await this.warrantyService.calculateWarranty(
            cassette.customerBankId,
            warrantyType,
            new Date(), // completedAt
            0, // previousWarrantyClaimCount (for new repair)
          );

          warrantyData = {
            warrantyType: warrantyInfo.warrantyType,
            warrantyPeriodDays: warrantyInfo.warrantyPeriodDays,
            warrantyStartDate: warrantyInfo.warrantyStartDate,
            warrantyEndDate: warrantyInfo.warrantyEndDate,
          };

          this.logger.log(
            `Warranty applied: Type=${warrantyInfo.warrantyType}, Period=${warrantyInfo.warrantyPeriodDays} days, EndDate=${warrantyInfo.warrantyEndDate.toISOString()}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to calculate warranty for cassette ${ticket.cassetteId}: ${error.message}`,
          );
          // Continue without warranty if calculation fails
        }
      }

      // Update repair ticket
      const updatedTicket = await tx.repairTicket.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          repairActionTaken: completeDto.repairActionTaken,
          partsReplaced: completeDto.partsReplaced,
          qcPassed: completeDto.qcPassed,
          completedAt: new Date(),
          repairedBy: userId,
          ...(warrantyData || {}), // Add warranty data if available
        },
      });

      // Find problem ticket via multiple methods:
      // 1. CassetteDelivery (primary method for tickets with delivery)
      // 2. TicketCassetteDetail (for multi-cassette tickets)
      // 3. Direct cassetteId in ProblemTicket (for single-cassette tickets)
      
      let problemTicket: any = null;
      let delivery: any = null;
      
      // Method 1: Try via CassetteDelivery
      delivery = await tx.cassetteDelivery.findFirst({
        where: { cassetteId: ticket.cassetteId },
        include: { 
          ticket: {
            include: {
              cassetteDetails: {
                include: {
                  cassette: {
                    select: { id: true },
                  },
                },
              },
              cassette: {
                select: { id: true },
              },
            },
          },
        },
      });
      
      if (delivery?.ticket) {
        problemTicket = delivery.ticket;
      } else {
        // Method 2: Try via TicketCassetteDetail (multi-cassette tickets)
        const ticketDetail = await tx.ticketCassetteDetail.findFirst({
          where: { cassetteId: ticket.cassetteId },
          include: {
            ticket: {
              include: {
                cassetteDetails: {
                  include: {
                    cassette: {
                      select: { id: true },
                    },
                  },
                },
                cassette: {
                  select: { id: true },
                },
              },
            },
          },
        });
        
        if (ticketDetail?.ticket) {
          problemTicket = ticketDetail.ticket;
        } else {
          // Method 3: Try direct cassetteId in ProblemTicket (single-cassette tickets)
          const directTicket = await tx.problemTicket.findFirst({
            where: { cassetteId: ticket.cassetteId },
            include: {
              cassetteDetails: {
                include: {
                  cassette: {
                    select: { id: true },
                  },
                },
              },
              cassette: {
                select: { id: true },
              },
            },
          });
          
          if (directTicket) {
            problemTicket = directTicket;
          }
        }
      }

      // Check if this cassette has replacement request (before checking problem ticket)
      let hasReplacementRequest = false;
      let replacementReason = 'N/A';
      
      // Update SO status if all repair tickets are completed (regardless of QC or replacement request)
      if (problemTicket) {
        // Check if this cassette has replacement request
        const ticketDetail = await tx.ticketCassetteDetail.findFirst({
          where: { 
            ticketId: problemTicket.id,
            cassetteId: ticket.cassetteId,
          },
        });
        
        hasReplacementRequest = (ticketDetail as any)?.requestReplacement === true;
        replacementReason = (ticketDetail as any)?.replacementReason || 'N/A';
        
        const ticketCreatedAt = problemTicket.createdAt;
        
        // Get all cassette IDs from this SO
        const cassetteIds: string[] = [];
        if (problemTicket.cassetteDetails && problemTicket.cassetteDetails.length > 0) {
          problemTicket.cassetteDetails.forEach((detail: any) => {
            if (detail.cassette?.id) {
              cassetteIds.push(detail.cassette.id);
            }
          });
        } else if (problemTicket.cassette?.id) {
          cassetteIds.push(problemTicket.cassette.id);
        }

        // Find all repair tickets for these cassettes created after SO creation
        // NOTE: 1 cassette bisa punya >1 repair ticket (beberapa kali masuk SO berbeda).
        // Untuk menentukan status SO saat ini, kita hanya perlu melihat
        // **repair ticket TERBARU per cassette** untuk SO ini.
        const allRepairTicketsRaw = await tx.repairTicket.findMany({
          where: {
            cassetteId: {
              in: cassetteIds,
            },
            createdAt: {
              gte: ticketCreatedAt,
            },
            deletedAt: null,
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

        // Ambil 1 repair ticket TERBARU per cassette
        const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string; createdAt: Date }>();
        for (const rt of allRepairTicketsRaw) {
          if (!latestRepairsMap.has(rt.cassetteId)) {
            latestRepairsMap.set(rt.cassetteId, rt);
          }
        }

        const latestRepairs = Array.from(latestRepairsMap.values());

        // Ensure we have repair tickets for all cassettes in the SO
        // Number of **latest** repair tickets should match number of cassettes in SO
        const expectedRepairCount = cassetteIds.length;
        const actualRepairCount = latestRepairs.length;
        
        // Check if we have repair tickets for all cassettes
        if (actualRepairCount < expectedRepairCount) {
          this.logger.warn(`SO ${problemTicket.ticketNumber}: Only ${actualRepairCount}/${expectedRepairCount} repair tickets found. Some cassettes may not have repair tickets yet. Status will not be updated to RESOLVED.`);
          // If SO is already RESOLVED but shouldn't be, fix it
          if (problemTicket.status === 'RESOLVED') {
            await tx.problemTicket.update({
              where: { id: problemTicket.id },
              data: {
                status: 'IN_PROGRESS' as any,
                resolvedAt: null,
              },
            });
            this.logger.warn(`Auto-fixed: SO ${problemTicket.ticketNumber} was RESOLVED but only ${actualRepairCount}/${expectedRepairCount} repair tickets exist. Reverted to IN_PROGRESS.`);
          }
        } else {
          // Check if all latest repair tickets per cassette are COMPLETED
          const completedRepairs = latestRepairs.filter(rt => rt.status === 'COMPLETED');
          const completedCount = completedRepairs.length;
          const allCompleted = completedCount === expectedRepairCount && 
            latestRepairs.every(rt => rt.status === 'COMPLETED');

          // Only update problem ticket to RESOLVED if ALL repair tickets are completed
          if (allCompleted) {
            // Only update if not already RESOLVED
            if (problemTicket.status !== 'RESOLVED') {
              await tx.problemTicket.update({
                where: { id: problemTicket.id },
                data: {
                  status: 'RESOLVED' as any,
                  resolvedAt: new Date(),
                },
              });
              this.logger.log(`All ${completedCount}/${expectedRepairCount} repair tickets completed. Updated SO ${problemTicket.ticketNumber} to RESOLVED`);
            }
          } else {
            // If SO is already RESOLVED but shouldn't be, fix it
            if (problemTicket.status === 'RESOLVED') {
              await tx.problemTicket.update({
                where: { id: problemTicket.id },
                data: {
                  status: 'IN_PROGRESS' as any,
                  resolvedAt: null,
                },
              });
              const statusCounts = latestRepairs.reduce((acc, rt) => {
                acc[rt.status] = (acc[rt.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              this.logger.warn(`Auto-fixed: SO ${problemTicket.ticketNumber} was RESOLVED but only ${completedCount}/${expectedRepairCount} repair tickets are completed. Reverted to IN_PROGRESS. Status breakdown: ${JSON.stringify(statusCounts)}`);
            } else {
              const statusCounts = latestRepairs.reduce((acc, rt) => {
                acc[rt.status] = (acc[rt.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              this.logger.debug(`SO ${problemTicket.ticketNumber}: ${completedCount}/${expectedRepairCount} repair tickets completed. Waiting for all ${expectedRepairCount} repair tickets to be COMPLETED before marking SO as RESOLVED`);
            }
          }
        }
      }

      // Update cassette status based on QC and replacement request
      // If replacement requested, always mark as SCRAPPED (regardless of QC)
      if (hasReplacementRequest) {
        await tx.$executeRaw`
          UPDATE cassettes 
          SET status = ${'SCRAPPED'}, 
              notes = CONCAT(COALESCE(notes, ''), '\n', 'Replacement requested: ', ${replacementReason}),
              updated_at = NOW()
          WHERE id = ${ticket.cassetteId}
        `;
        this.logger.log(`Complete Repair (Replacement Requested): Updated cassette status to SCRAPPED. Reason: ${replacementReason}`);
      } else if (completeDto.qcPassed) {
        // If QC passed, update status to READY_FOR_PICKUP (kaset sudah selesai diperbaiki, siap di-pickup)
        // Flow baru (pickup-based):
        // - Kaset status menjadi READY_FOR_PICKUP setelah repair selesai dan QC passed
        // - Setelah Pengelola konfirmasi pickup di RC, status kaset akan menjadi OK dan ticket menjadi CLOSED
        await tx.$executeRaw`
          UPDATE cassettes 
          SET status = ${'READY_FOR_PICKUP'}, 
              notes = CONCAT(COALESCE(notes, ''), '\n', 'Repaired and passed QC - ready for pickup at RC by Pengelola'),
              updated_at = NOW()
          WHERE id = ${ticket.cassetteId}
        `;
        this.logger.log(`Complete Repair (QC Passed): Updated cassette ${cassette.serialNumber} status to READY_FOR_PICKUP (ready for pickup at RC)`);
      } else {
        // If QC failed and no replacement request, mark as scrapped using raw SQL
        await tx.$executeRaw`
          UPDATE cassettes 
          SET status = ${'SCRAPPED'}, 
              notes = 'Failed QC after repair',
              updated_at = NOW()
          WHERE id = ${ticket.cassetteId}
        `;
        this.logger.log('Complete Repair (QC Failed): Updated cassette status to SCRAPPED');
      }

      return updatedTicket;
    });
  }

  async getStatistics() {
    const [total, received, diagnosing, onProgress, completed] = await Promise.all([
      this.prisma.repairTicket.count(),
      this.prisma.repairTicket.count({ where: { status: 'RECEIVED' } }),
      this.prisma.repairTicket.count({ where: { status: 'DIAGNOSING' } }),
      this.prisma.repairTicket.count({ where: { status: 'ON_PROGRESS' } }),
      this.prisma.repairTicket.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      total,
      received,
      diagnosing,
      onProgress,
      completed,
      inProgress: received + diagnosing + onProgress,
    };
  }

  /**
   * Sync service order status based on repair tickets completion
   * This fixes SOs that should be RESOLVED but are still IN_PROGRESS
   */
  async syncServiceOrderStatus(ticketId?: string) {
    const whereClause: any = {
      deletedAt: null,
      status: { in: ['IN_PROGRESS', 'RECEIVED'] }, // Only check SOs that are in progress or received
    };

    if (ticketId) {
      whereClause.id = ticketId;
    }

    const tickets = await this.prisma.problemTicket.findMany({
      where: whereClause,
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              select: { id: true },
            },
          },
        },
        cassette: {
          select: { id: true },
        },
      },
    });

    const results = {
      checked: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const ticket of tickets) {
      results.checked++;
      try {
        const ticketCreatedAt = ticket.createdAt;
        
        // Get all cassette IDs from this SO
        const cassetteIds: string[] = [];
        if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
          ticket.cassetteDetails.forEach((detail: any) => {
            if (detail.cassette?.id) {
              cassetteIds.push(detail.cassette.id);
            }
          });
        } else if (ticket.cassette?.id) {
          cassetteIds.push(ticket.cassette.id);
        }

        if (cassetteIds.length === 0) {
          continue;
        }

        // Find all repair tickets for these cassettes created after SO creation
        // NOTE: 1 cassette bisa punya >1 repair ticket (beberapa kali masuk SO berbeda).
        // Untuk menentukan status SO saat ini, kita hanya perlu melihat
        // **repair ticket TERBARU per cassette** untuk SO ini.
        const allRepairTicketsRaw = await this.prisma.repairTicket.findMany({
          where: {
            cassetteId: {
              in: cassetteIds,
            },
            createdAt: {
              gte: ticketCreatedAt,
            },
            deletedAt: null,
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

        // Ambil 1 repair ticket TERBARU per cassette
        const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string; createdAt: Date }>();
        for (const rt of allRepairTicketsRaw) {
          if (!latestRepairsMap.has(rt.cassetteId)) {
            latestRepairsMap.set(rt.cassetteId, rt);
          }
        }
        const latestRepairs = Array.from(latestRepairsMap.values());

        const expectedRepairCount = cassetteIds.length;
        const actualRepairCount = latestRepairs.length;

        // Check if we have repair tickets for all cassettes
        if (actualRepairCount >= expectedRepairCount) {
          // Check if all latest repair tickets per cassette are COMPLETED
          const completedRepairs = latestRepairs.filter(rt => rt.status === 'COMPLETED');
          const completedCount = completedRepairs.length;
          const allCompleted = completedCount === expectedRepairCount && 
            latestRepairs.every(rt => rt.status === 'COMPLETED');

          // If all repair tickets are completed but SO is not RESOLVED, update it
          if (allCompleted && ticket.status !== 'RESOLVED') {
            await this.prisma.problemTicket.update({
              where: { id: ticket.id },
              data: {
                status: 'RESOLVED' as any,
                resolvedAt: new Date(),
              },
            });
            results.updated++;
            this.logger.log(`Synced: SO ${ticket.ticketNumber} updated to RESOLVED (${completedCount}/${expectedRepairCount} repair tickets completed)`);
          }
        }
      } catch (error: any) {
        results.errors.push(`SO ${ticket.ticketNumber}: ${error.message}`);
        this.logger.error(`Error syncing SO ${ticket.ticketNumber}`, error.stack);
      }
    }

    return results;
  }


  /**
   * Soft delete a repair ticket
   * Only Hitachi users (RC_MANAGER or SUPER_ADMIN) can delete repair tickets
   * SUPER_ADMIN can delete any repair ticket
   * RC_MANAGER can only delete repair tickets that are not COMPLETED
   */
  async softDelete(id: string, userId: string, userRole: string) {
    // Only Hitachi users can delete repair tickets
    if (userRole !== 'RC_MANAGER' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only RC Manager or Super Admin can delete repair tickets');
    }

    // Find the repair ticket
    const repairTicket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: {
        cassette: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
      },
    });

    if (!repairTicket) {
      throw new NotFoundException(`Repair ticket with ID ${id} not found`);
    }

    if (repairTicket.deletedAt) {
      throw new BadRequestException('Repair ticket already deleted');
    }

    // Check user role - only SUPER_ADMIN can delete COMPLETED repair tickets
    if (repairTicket.status === 'COMPLETED' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete COMPLETED repair tickets');
    }

    // Soft delete the repair ticket
    return this.prisma.repairTicket.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        notes: repairTicket.notes 
          ? `${repairTicket.notes}\n[DELETED on ${new Date().toLocaleDateString('id-ID')} by ${userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'RC Manager'}]`
          : `[DELETED on ${new Date().toLocaleDateString('id-ID')} by ${userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'RC Manager'}]`,
      },
    });
  }
}

