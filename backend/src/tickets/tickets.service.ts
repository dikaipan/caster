import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketDto, CreateDeliveryDto, ReceiveDeliveryDto, CreateReturnDto, ReceiveReturnDto } from './dto';
import { CreateMultiTicketDto } from './dto/create-multi-ticket.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  
  constructor(private prisma: PrismaService) {}

  async findAll(
    userType: string,
    pengelolaId?: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: string,
    priority?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const whereClause: any = {
        deletedAt: null, // Filter out soft-deleted tickets
      };

      // SUPER ADMIN (HITACHI users) can see ALL tickets
      // Pengelola users can see tickets they created OR for machines they manage
      if (userType === 'HITACHI') {
        // Admin can see everything - no filter
      } else if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
        // Pengelola can see tickets where:
        // 1. Machine is assigned to them, OR
        // 2. They are the reporter (created the ticket)
        whereClause.OR = [
          {
            machine: {
              pengelolaId,
            },
          },
          {
            reporter: {
              pengelolaId,
            },
          },
        ];
      }

      // Status filter - handle comma-separated values
      // By default, exclude CLOSED tickets (they should only appear in history)
      if (status) {
        const statusArray = status.split(',').map(s => s.trim()).filter(Boolean);
        if (statusArray.length === 1) {
          whereClause.status = statusArray[0];
        } else if (statusArray.length > 1) {
          whereClause.status = { in: statusArray };
        }
      } else {
        // Default: exclude CLOSED tickets (active SO only)
        whereClause.status = { not: 'CLOSED' as any };
      }

      // Priority filter
      if (priority) {
        whereClause.priority = priority;
      }

      // Search filter
      if (search && search.trim()) {
        const searchTerm = search.trim();
        const searchConditions = {
          OR: [
            { ticketNumber: { contains: searchTerm.toLowerCase() } },
            { title: { contains: searchTerm.toLowerCase() } },
            {
              cassette: {
                serialNumber: { contains: searchTerm.toLowerCase() },
              },
            },
            {
              machine: {
                serialNumberManufacturer: { contains: searchTerm.toLowerCase() },
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
        };

        // Combine search with existing whereClause
        if (whereClause.OR && Array.isArray(whereClause.OR)) {
          // If whereClause already has OR (for Pengelola filter), combine with AND
          whereClause.AND = [
            { OR: whereClause.OR },
            searchConditions,
          ];
          delete whereClause.OR;
        } else {
          Object.assign(whereClause, searchConditions);
        }
      }

      // Get total count
      const total = await this.prisma.problemTicket.count({
        where: whereClause,
      });

      // Calculate pagination
      const skip = (page - 1) * limit;
      const take = limit;

      // Determine orderBy
      const orderBy = this.getOrderBy(sortBy || 'reportedAt', sortOrder);

      const tickets = await this.prisma.problemTicket.findMany({
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
            },
          },
          machine: {
            include: {
              pengelola: true,
            },
          },
          reporter: true,
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
          cassetteDelivery: {
            include: {
              cassette: {
                include: {
                  cassetteType: true,
                },
              },
            },
          },
          cassetteReturn: {
            include: {
              cassette: {
                include: {
                  cassetteType: true,
                },
              },
              receiver: {
                select: {
                  fullName: true,
                  role: true,
                },
              },
              sender: {
                select: {
                  fullName: true,
                  role: true,
                },
              },
            },
          } as any,
        } as any,
        orderBy,
        skip,
        take,
      });

      return {
        data: tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error in findAll tickets', error.stack);
      throw error;
    }
  }

  private getOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const validSortFields: Record<string, string> = {
      reportedAt: 'reportedAt',
      createdAt: 'createdAt',
      status: 'status',
      priority: 'priority',
      closedAt: 'closedAt',
    };

    const field = validSortFields[sortBy] || 'reportedAt';
    return { [field]: sortOrder };
  }


  async findOne(id: string, userType: string, pengelolaId?: string) {
    try {
      const ticket = await this.prisma.problemTicket.findUnique({
        where: { id },
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
            repairTickets: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get latest repair ticket
              include: {
                repairer: {
                  select: {
                    fullName: true,
                    role: true,
                  },
                },
              },
            },
            replacementFor: {
              // Include replacement cassettes (new cassettes that replace this one)
              select: {
                id: true,
                serialNumber: true,
                status: true,
              },
            },
          },
        } as any,
        machine: {
          include: {
            customerBank: true,
            pengelola: true,
          },
        },
        reporter: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            pengelolaId: true,
            pengelola: {
              select: {
                companyName: true,
              },
            },
          },
        },
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
                replacementFor: {
                  // Include replacement cassettes (new cassettes that replace this one)
                  include: {
                    cassetteType: true,
                  },
                },
              },
            },
          },
          // Include requestReplacement and replacementReason fields
        },
        cassetteDelivery: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
              },
            },
            sender: {
              select: {
                fullName: true,
                pengelola: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
            receiver: {
              select: {
                fullName: true,
                role: true,
              },
            },
          },
        },
        cassetteReturn: {
          include: {
            cassette: {
              include: {
                cassetteType: true,
              },
            },
            sender: {
              select: {
                fullName: true,
                role: true,
              },
            },
            receiver: {
              select: {
                fullName: true,
                pengelola: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        } as any,
      } as any,
    });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }

      // SUPER ADMIN (HITACHI) can access all tickets
      // Pengelola can access if: machine.pengelolaId OR reporter.pengelolaId matches
      const ticketWithMachine = ticket as any;
      if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
        const hasMachineAccess = ticketWithMachine.machine?.pengelolaId === pengelolaId;
        const isReporter = ticketWithMachine.reporter?.pengelolaId === pengelolaId;
        
        if (!hasMachineAccess && !isReporter) {
          throw new ForbiddenException('You do not have access to this ticket');
        }
      }

      return ticket;
    } catch (error: any) {
      this.logger.error('Error in findOne ticket', {
        ticketId: id,
        userType,
        error: error.message,
        stack: error.stack,
      });
      
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new NotFoundException(`Failed to fetch ticket: ${error.message || 'Unknown error'}`);
    }
  }

  async create(createDto: CreateTicketDto, userId: string, userType: string) {
    try {
      this.logger.debug(`Creating ticket for cassette: ${createDto.cassetteSerialNumber}, userId: ${userId}, userType: ${userType}`);
      
      // Only Pengelola users can create tickets
      // Tickets are reported by pengelola, then processed by RC (HITACHI) staff
      let pengelolaUser: { id: string; pengelolaId: string; canCreateTickets: boolean; role: string; assignedBranches: any } | null = null;
      if (userType?.toUpperCase() !== 'PENGELOLA') {
        throw new ForbiddenException('Only Pengelola users can create problem tickets. RC staff receive and process tickets.');
      }
      
      if (userType?.toUpperCase() === 'PENGELOLA') {
        // Verify that the userId exists in pengelolaUser table and has permission
        pengelolaUser = await this.prisma.pengelolaUser.findUnique({
          where: { id: userId },
          select: {
            id: true,
            pengelolaId: true,
            canCreateTickets: true,
            role: true,
            assignedBranches: true,
          },
        });

        if (!pengelolaUser) {
          throw new NotFoundException('Pengelola user not found');
        }

        if (!pengelolaUser.canCreateTickets) {
          throw new ForbiddenException('You do not have permission to create tickets');
        }
      }

      // Find cassette by serial number
      const cassette = await this.prisma.cassette.findUnique({
        where: { serialNumber: createDto.cassetteSerialNumber },
        include: {
          customerBank: {
            include: {
              machines: {
                include: {
                  pengelola: {
                    include: {
                      users: {
                        take: 1, // Get first Pengelola user as reporter
                      },
                    },
                  },
                },
                take: 1, // Get first machine from same bank if no machineId provided
              },
            },
          },
        },
      });

      if (!cassette) {
        throw new NotFoundException(`Cassette with serial number ${createDto.cassetteSerialNumber} not found`);
      }

      // Check if there's an active ticket for this cassette (not RESOLVED or CLOSED)
      // Also check if repair ticket is COMPLETED - if so, ignore IN_PROGRESS status
      // Exclude soft-deleted tickets (deletedAt is null)
      const activeTicket = await this.prisma.problemTicket.findFirst({
        where: {
          AND: [
            { cassetteId: cassette.id },
            { deletedAt: null }, // Exclude soft-deleted tickets
            {
              status: {
                notIn: ['RESOLVED', 'CLOSED'] as any,
              },
            },
          ],
        } as any,
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          title: true,
          createdAt: true,
        },
      });

      // Check if repair ticket is COMPLETED - if so, we can ignore IN_PROGRESS problem ticket
      const latestRepairTicket = await this.prisma.repairTicket.findFirst({
        where: {
          cassetteId: cassette.id,
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const repairCompleted = latestRepairTicket && ['COMPLETED', 'SCRAPPED'].includes(latestRepairTicket.status);
      
      // Only block if there's an active ticket AND repair is not completed
      // If repair is completed, problem ticket should be RESOLVED, but if it's still IN_PROGRESS,
      // we allow it because repair is done and cassette is ready for new tickets
      if (activeTicket && !repairCompleted) {
        // Self-healing: If cassette is OK but has active ticket, update it to BAD to ensure data consistency
        if ((cassette.status as any) === 'OK') {
          this.logger.warn(`Self-healing: Cassette ${cassette.serialNumber} has active ticket ${activeTicket.ticketNumber} but status is OK. Updating to BAD.`);
          // Update using raw SQL for consistency
          await this.prisma.$executeRaw`
            UPDATE cassettes 
            SET status = ${'BAD'}, updated_at = NOW()
            WHERE id = ${cassette.id}
          `;
        }

        const statusLabels: Record<string, string> = {
          'OPEN': 'Terbuka',
          'IN_DELIVERY': 'Dalam Pengiriman',
          'RECEIVED': 'Diterima',
          'IN_PROGRESS': 'Sedang Diperbaiki',
          'RESOLVED': 'Selesai',
          'RETURN_SHIPPED': 'Dikirim Kembali',
          'CLOSED': 'Ditutup',
        };
        
        const statusLabel = statusLabels[activeTicket.status] || activeTicket.status;
        const ticketDate = new Date(activeTicket.createdAt).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        throw new BadRequestException(
          `Kaset ${createDto.cassetteSerialNumber} sudah memiliki tiket aktif:\n` +
          `- Tiket: ${activeTicket.ticketNumber}\n` +
          `- Status: ${statusLabel} (${activeTicket.status})\n` +
          `- Dibuat: ${ticketDate}\n` +
          `- Judul: ${activeTicket.title || 'Tidak ada judul'}\n\n` +
          `Tidak dapat membuat tiket baru untuk kaset yang sedang dalam proses perbaikan. ` +
          `Silakan tutup atau selesaikan tiket yang ada terlebih dahulu, atau gunakan tiket yang sudah ada.`
        );
      }

      // For Pengelola users, validate they have access to this cassette's bank
      if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaUser) {
        // Check if cassette's bank is assigned to Pengelola
        const Pengelola = await this.prisma.pengelola.findUnique({
          where: { id: pengelolaUser.pengelolaId },
          include: {
            bankAssignments: {
              select: { customerBankId: true },
            },
          },
        });

        if (!Pengelola || !Pengelola.bankAssignments.some(a => a.customerBankId === cassette.customerBankId)) {
          throw new ForbiddenException('You do not have access to cassettes from this bank');
        }
      }

      // Find machine if provided, otherwise get first machine from same bank
      let machine: any = null;
      if (createDto.machineId) {
        const foundMachine = await this.prisma.machine.findUnique({
          where: { id: createDto.machineId },
          include: {
            pengelola: {
              include: {
                users: {
                  take: 1,
                },
              },
            },
          },
        });

        if (!foundMachine) {
          throw new NotFoundException('Machine not found');
        }

        machine = foundMachine;

        // Validate machine belongs to same bank as cassette
        if (machine.customerBankId !== cassette.customerBankId) {
          throw new BadRequestException('Machine must belong to the same bank as the cassette');
        }

        // For Pengelola users, validate they have access to this machine
        if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaUser) {
          if (machine.pengelolaId !== pengelolaUser.pengelolaId) {
            throw new ForbiddenException('You do not have access to this machine');
          }

          // For TECHNICIAN role, check if machine is in assigned branches
          if (pengelolaUser.role === 'TECHNICIAN' && pengelolaUser.assignedBranches) {
            const assignedBranches = pengelolaUser.assignedBranches as string[];
            if (machine.branchCode && !assignedBranches.includes(machine.branchCode)) {
              throw new ForbiddenException(
                `You do not have access to machines in branch ${machine.branchCode}. Your assigned branches: ${assignedBranches.join(', ')}`,
              );
            }
          }
        }
      } else {
        // Use first machine from same bank if available
        const bankMachines = (cassette.customerBank as any)?.machines || [];
        machine = bankMachines[0] || null;
      }

      // Use Pengelola user as reporter
      const reporterUserId = pengelolaUser!.id;

      // Generate ticket number
      // Format: SO-DDMMYY[urutan]
      // Example: SO-2111241, SO-2111242, SO-21112410 (auto increment tanpa padding dan strip)
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      // Count tickets created today to get sequence number
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const todayTicketCount = await this.prisma.problemTicket.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      
      // Auto increment tanpa padding
      const sequenceNumber = todayTicketCount + 1;
      const ticketNumber = `SO-${day}${month}${year}${sequenceNumber}`;

      this.logger.debug(`Creating ticket ${ticketNumber} for cassette ${cassette.serialNumber} (ID: ${cassette.id}, Status: ${cassette.status})`);

      // Determine if we have delivery info
      // For SELF_DELIVERY, also set status to IN_DELIVERY so RC can confirm receipt
      const hasDeliveryInfo = (createDto.courierService && createDto.trackingNumber) || createDto.deliveryMethod === 'SELF_DELIVERY';
      const initialTicketStatus = hasDeliveryInfo ? 'IN_DELIVERY' : 'OPEN';
      const initialCassetteStatus = hasDeliveryInfo ? 'IN_TRANSIT_TO_RC' : 'BAD';
      
      this.logger.debug(`Ticket will be created with status: ${initialTicketStatus}, Cassette status: ${initialCassetteStatus}, Has delivery info: ${hasDeliveryInfo}, Delivery method: ${createDto.deliveryMethod}`);

      // Prepare delivery data if needed (before transaction)
      let deliveryData: any = null;
      if (hasDeliveryInfo) {
        const shippedDate = createDto.shippedDate ? new Date(createDto.shippedDate) : new Date();
        const estimatedArrival = createDto.estimatedArrival ? new Date(createDto.estimatedArrival) : null;
        
        // Get sender address
        let senderAddressData: any = { useOfficeAddress: false };
        if (createDto.useOfficeAddress && pengelolaUser) {
          const Pengelola = await this.prisma.pengelola.findUnique({
            where: { id: pengelolaUser.pengelolaId },
            select: {
              address: true,
              city: true,
              province: true,
              primaryContactName: true,
              primaryContactPhone: true,
            },
          });
          if (Pengelola && Pengelola.address) {
            senderAddressData = {
              useOfficeAddress: true,
              senderAddress: Pengelola.address || null,
              senderCity: Pengelola.city || null,
              senderProvince: Pengelola.province || null,
              senderContactName: Pengelola.primaryContactName || null,
              senderContactPhone: Pengelola.primaryContactPhone || null,
            };
          } else {
            senderAddressData = {
              useOfficeAddress: false,
              senderAddress: createDto.senderAddress || null,
              senderCity: createDto.senderCity || null,
              senderProvince: createDto.senderProvince || null,
              senderPostalCode: createDto.senderPostalCode || null,
              senderContactName: createDto.senderContactName || null,
              senderContactPhone: createDto.senderContactPhone || null,
            };
          }
        } else {
          senderAddressData = {
            useOfficeAddress: false,
            senderAddress: createDto.senderAddress || null,
            senderCity: createDto.senderCity || null,
            senderProvince: createDto.senderProvince || null,
            senderPostalCode: createDto.senderPostalCode || null,
            senderContactName: createDto.senderContactName || null,
            senderContactPhone: createDto.senderContactPhone || null,
          };
        }
        
        deliveryData = {
          sentBy: reporterUserId,
          shippedDate,
          estimatedArrival: estimatedArrival || undefined,
          courierService: createDto.courierService,
          trackingNumber: createDto.trackingNumber,
          ...senderAddressData,
        };
      }

      // Create ticket, delivery (if provided), and update cassette status in ONE transaction
      this.logger.debug('Starting transaction to create ticket + delivery');
      const createdTicket = await this.prisma.$transaction(async (tx) => {
        // 1. Update cassette status
        this.logger.debug(`Inside transaction - Updating cassette status to ${initialCassetteStatus}`);
        const updateCount = await tx.$executeRaw`
          UPDATE cassettes 
          SET status = ${initialCassetteStatus}, updated_at = NOW()
          WHERE id = ${cassette.id}
        `;
        this.logger.debug(`Transaction: Cassette status updated. Rows affected: ${updateCount}`);

        // 2. Create ticket with appropriate status
        this.logger.debug('Inside transaction - Creating problem ticket');
        const ticket = await tx.problemTicket.create({
        data: {
          ticketNumber,
          cassetteId: cassette.id,
          machineId: machine?.id || null,
          reportedBy: reporterUserId,
          title: createDto.title,
          description: createDto.description,
          priority: createDto.priority || 'MEDIUM',
          affectedComponents: createDto.affectedComponents || null,
          wsid: createDto.wsid || null,
          errorCode: createDto.errorCode || null,
          deliveryMethod: createDto.deliveryMethod || null,
          courierService: createDto.courierService || null,
          trackingNumber: createDto.trackingNumber || null,
          status: initialTicketStatus as any, // Set status based on delivery info
        } as any,
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: {
                select: {
                  id: true,
                  bankCode: true,
                  bankName: true,
                },
              },
            },
          },
          machine: {
            include: {
              customerBank: {
                select: {
                  id: true,
                  bankCode: true,
                  bankName: true,
                },
              },
              pengelola: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          reporter: {
            select: {
              fullName: true,
              pengelola: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        } as any,
        });
        
        this.logger.debug(`Inside transaction - Ticket created: ${ticket.ticketNumber}, Status: ${ticket.status}`);

        // 3. Create delivery if delivery info provided
        if (hasDeliveryInfo && deliveryData) {
          this.logger.debug('Inside transaction - Creating delivery');
          await tx.cassetteDelivery.create({
            data: {
              ticketId: ticket.id,
              cassetteId: cassette.id,
              ...deliveryData,
            },
          } as any);
          this.logger.debug('Delivery created in same transaction');
            }
        
        return ticket;
      });
      
      this.logger.log(`Transaction completed. Ticket created: ${createdTicket.ticketNumber}, Status: ${createdTicket.status}`);
      if (hasDeliveryInfo) {
        this.logger.debug('Delivery created in same transaction. Ticket status: IN_DELIVERY, Cassette status: IN_TRANSIT_TO_RC');
      }

      // Fetch ticket again with delivery info if created
      // Re-fetch to ensure we have the latest cassette status after transaction
      const finalTicket = await this.prisma.problemTicket.findUnique({
        where: { id: createdTicket.id },
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: {
                select: {
                  id: true,
                  bankCode: true,
                  bankName: true,
                },
              },
            },
          } as any,
          machine: {
            include: {
              customerBank: {
                select: {
                  id: true,
                  bankCode: true,
                  bankName: true,
                },
              },
              pengelola: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          reporter: {
            select: {
              fullName: true,
              pengelola: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          cassetteDelivery: {
            include: {
              cassette: {
                include: {
                  cassetteType: true,
                },
              },
            },
          } as any,
        } as any,
      });

      if (!finalTicket) {
        throw new Error('Failed to fetch created ticket');
      }

      // Verify ticket status
      this.logger.debug(`Final ticket status: ${(finalTicket as any).ticketNumber}, Status: ${(finalTicket as any).status}, HasDelivery: ${!!(finalTicket as any).cassetteDelivery}`);

      // Verify cassette status is BAD (or IN_TRANSIT_TO_RC if delivery was auto-created)
      // Always re-fetch cassette directly from database using raw query to ensure fresh data
      
      // Use raw query to force fresh read from database (bypass any connection pooling/caching)
      const verifyCassetteRaw = await this.prisma.$queryRaw`
        SELECT 
          c.id,
          c.serial_number as serialNumber,
          c.status,
          c.cassette_type_id as cassetteTypeId,
          c.customer_bank_id as customerBankId,
          c.notes,
          c.created_at as createdAt,
          c.updated_at as updatedAt
        FROM cassettes c
        WHERE c.id = ${cassette.id}
      ` as any[];
      
      if (verifyCassetteRaw && verifyCassetteRaw.length > 0) {
        const rawCassette = verifyCassetteRaw[0];
        this.logger.debug(`Raw Query Verification - Database cassette status: ${rawCassette.serialNumber} = ${rawCassette.status}`);
        
        if (rawCassette.status !== 'BAD' && rawCassette.status !== 'IN_TRANSIT_TO_RC') {
          this.logger.error(`CRITICAL: Cassette status NOT updated! Expected BAD or IN_TRANSIT_TO_RC, got: ${rawCassette.status}. Transaction may not have committed properly.`);
        }
        
        // Now fetch with relations using the confirmed status
        const verifyCassette = await this.prisma.cassette.findUnique({
          where: { id: cassette.id },
          include: {
            cassetteType: true,
            customerBank: {
              select: {
                id: true,
                bankCode: true,
                bankName: true,
              },
            },
          },
        });
        
        if (verifyCassette) {
          this.logger.debug(`Full Query Verification - Database cassette status: ${verifyCassette.serialNumber} = ${verifyCassette.status}`);
          
          if (verifyCassette.status !== rawCassette.status) {
            this.logger.warn('WARNING: Status mismatch between raw query and Prisma query! Using raw query result.');
            verifyCassette.status = rawCassette.status as any;
          }
          
          // Update finalTicket cassette with verified data
          if ((finalTicket as any).cassette) {
            (finalTicket as any).cassette = verifyCassette;
            this.logger.debug(`Updated response cassette with verified status: ${verifyCassette.status}`);
          }
        }
      } else {
        this.logger.error('ERROR: Could not verify cassette status using raw query');
      }
      
      const cassetteStatus = (finalTicket as any).cassette?.status;
      this.logger.debug(`Final ticket response includes cassette with status: ${cassetteStatus}`);
      
      if (cassetteStatus !== 'BAD' && cassetteStatus !== 'IN_TRANSIT_TO_RC') {
        this.logger.error(`CRITICAL ERROR: Response cassette status is incorrect! Expected BAD or IN_TRANSIT_TO_RC, got: ${cassetteStatus}`);
      }

      // Verify ticket status using raw query
      const verifyTicketRaw = await this.prisma.$queryRaw`
        SELECT 
          pt.id,
          pt.ticket_number as ticketNumber,
          pt.status,
          pt.cassette_id as cassetteId,
          pt.created_at as createdAt,
          pt.updated_at as updatedAt
        FROM problem_tickets pt
        WHERE pt.id = ${createdTicket.id}
      ` as any[];
      
      if (verifyTicketRaw && verifyTicketRaw.length > 0) {
        const rawTicket = verifyTicketRaw[0];
        this.logger.debug(`Raw Query Verification - Database ticket status: ${rawTicket.ticketNumber} = ${rawTicket.status}`);
        
        // Check if delivery exists
        const deliveryExists = await this.prisma.$queryRaw`
          SELECT id, ticket_id, tracking_number
          FROM cassette_deliveries
          WHERE ticket_id = ${createdTicket.id}
          LIMIT 1
        ` as any[];
        
        this.logger.debug('Delivery check:', {
          hasDelivery: deliveryExists.length > 0,
          trackingNumber: deliveryExists[0]?.tracking_number || 'none',
        });
        
        // If delivery was created, ticket should be IN_DELIVERY
        if (deliveryExists.length > 0 && rawTicket.status !== 'IN_DELIVERY') {
          this.logger.error('CRITICAL ERROR: Delivery exists but ticket status is not IN_DELIVERY!', {
            expected: 'IN_DELIVERY',
            actual: rawTicket.status,
          });
          // Update ticket status to IN_DELIVERY using raw SQL
          await this.prisma.$executeRaw`
            UPDATE problem_tickets 
            SET status = ${'IN_DELIVERY'}, updated_at = NOW()
            WHERE id = ${createdTicket.id}
          `;
          this.logger.warn('Auto-fixed: Updated ticket status to IN_DELIVERY');
          
          // Re-fetch ticket with updated status
          const fixedTicket = await this.prisma.problemTicket.findUnique({
            where: { id: createdTicket.id },
            include: {
              cassette: {
                include: {
                  cassetteType: true,
                  customerBank: {
                    select: {
                      id: true,
                      bankCode: true,
                      bankName: true,
                    },
                  },
                },
              } as any,
              machine: {
                include: {
                  customerBank: {
                    select: {
                      id: true,
                      bankCode: true,
                      bankName: true,
                    },
                  },
                  pengelola: {
                    select: {
                      id: true,
                      companyName: true,
                    },
                  },
                },
              },
              reporter: {
                select: {
                  fullName: true,
                  pengelola: {
                    select: {
                      companyName: true,
                    },
                  },
                },
              },
              cassetteDelivery: {
                include: {
                  cassette: {
                    include: {
                      cassetteType: true,
                    },
                  },
                },
              } as any,
            } as any,
          });
          
          if (fixedTicket) {
            this.logger.debug(`Returned fixed ticket with status: ${fixedTicket.status}`);
            return fixedTicket;
          }
        } else if (deliveryExists.length > 0 && rawTicket.status === 'IN_DELIVERY') {
          this.logger.debug('Ticket status is correct: IN_DELIVERY with delivery');
        }
        
        // Update finalTicket status if different from raw query
        if ((finalTicket as any).status !== rawTicket.status) {
          this.logger.warn('WARNING: Ticket status mismatch! Using database status.');
          (finalTicket as any).status = rawTicket.status as any;
        }
      }
      
      return finalTicket;
      } catch (error) {
      this.logger.error('Error in create ticket', error instanceof Error ? error.stack : error);
        throw error;
      }
    }

  /**
   * CREATE MULTI-CASSETTE TICKET
   * Creates 1 ticket with multiple cassettes (up to 5)
   */
  async createMultiCassetteTicket(createDto: CreateMultiTicketDto, userId: string, userType: string) {
    try {
      this.logger.debug(`createMultiCassetteTicket called: userId=${userId}, userType=${userType}, cassettes=${createDto.cassettes.length}`);

      // Only Pengelola users can create tickets
      if (userType?.toUpperCase() !== 'PENGELOLA') {
        throw new ForbiddenException('Only Pengelola users can create problem tickets');
      }

      // Verify Pengelola user permissions
      const pengelolaUser = await this.prisma.pengelolaUser.findUnique({
        where: { id: userId },
        include: {
          pengelola: {
            include: {
              bankAssignments: {
                select: { customerBankId: true },
              },
            },
          },
        },
      });

      if (!pengelolaUser) {
        throw new NotFoundException('Pengelola user not found');
      }

      if (!pengelolaUser.canCreateTickets) {
        throw new ForbiddenException('You do not have permission to create tickets');
      }

      const accessibleBankIds = pengelolaUser.pengelola.bankAssignments.map(a => a.customerBankId);

      // Validate all cassettes
      const cassettePromises = createDto.cassettes.map(async (cassetteDetail) => {
        const cassette = await this.prisma.cassette.findUnique({
          where: { serialNumber: cassetteDetail.cassetteSerialNumber },
          include: {
            cassetteType: true,
            customerBank: true,
            machine: true,
          },
        });

        if (!cassette) {
          throw new NotFoundException(`Cassette ${cassetteDetail.cassetteSerialNumber} not found`);
        }

        // Check Pengelola access to bank
        if (!accessibleBankIds.includes(cassette.customerBankId)) {
          throw new ForbiddenException(`You do not have access to cassette ${cassette.serialNumber}`);
        }

        // ✅ VALIDATE: Check for active problem tickets
        // Also check if repair ticket is COMPLETED - if so, ignore IN_PROGRESS status
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
                  notIn: ['RESOLVED', 'CLOSED'], // RESOLVED and CLOSED are considered completed
                },
              },
            ],
          },
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            title: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Check if repair ticket is COMPLETED - if so, we can ignore IN_PROGRESS problem ticket
        const latestRepairTicket = await this.prisma.repairTicket.findFirst({
          where: {
            cassetteId: cassette.id,
          },
          select: {
            id: true,
            status: true,
            completedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const repairCompleted = latestRepairTicket && ['COMPLETED', 'SCRAPPED'].includes(latestRepairTicket.status);
        
        // Only block if there's an active ticket AND repair is not completed
        // If repair is completed, problem ticket should be RESOLVED, but if it's still IN_PROGRESS,
        // we allow it because repair is done and cassette is ready for new tickets
        if (activeTicket && !repairCompleted) {
          const statusLabels: Record<string, string> = {
            'OPEN': 'Terbuka',
            'IN_DELIVERY': 'Dalam Pengiriman',
            'RECEIVED': 'Diterima',
            'IN_PROGRESS': 'Sedang Diperbaiki',
            'RESOLVED': 'Selesai',
            'RETURN_SHIPPED': 'Dikirim Kembali',
            'CLOSED': 'Ditutup',
          };
          
          const statusLabel = statusLabels[activeTicket.status] || activeTicket.status;
          const ticketDate = new Date(activeTicket.createdAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          
          throw new BadRequestException(
            `Kaset ${cassette.serialNumber} sudah memiliki tiket aktif:\n` +
            `- Tiket: ${activeTicket.ticketNumber}\n` +
            `- Status: ${statusLabel} (${activeTicket.status})\n` +
            `- Dibuat: ${ticketDate}\n` +
            `- Judul: ${activeTicket.title || 'Tidak ada judul'}\n\n` +
            `Tidak dapat membuat tiket baru untuk kaset yang sedang dalam proses perbaikan. ` +
            `Silakan tutup atau selesaikan tiket yang ada terlebih dahulu, atau gunakan tiket yang sudah ada.`
          );
        }

        // ✅ VALIDATE: Check for active PM tasks
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
            `Kaset ${cassette.serialNumber} sedang dalam PM task aktif (${activePM.pmNumber} - ${activePM.status}). Tidak dapat membuat tiket masalah saat PM sedang berlangsung.`
          );
        }

        // ✅ VALIDATE: Check cassette status - should not be in transit or in repair
        const restrictedStatuses = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'IN_TRANSIT_TO_PENGELOLA'];
        if (restrictedStatuses.includes(cassette.status)) {
          throw new BadRequestException(
            `Kaset ${cassette.serialNumber} sedang dalam status ${cassette.status}. Tidak dapat membuat tiket untuk kaset yang sedang dalam proses repair.`
          );
        }

        return cassette;
      });

      const cassettes = await Promise.all(cassettePromises);

      // Validate machine if provided
      let machine: any = null;
      if (createDto.machineId) {
        machine = await this.prisma.machine.findUnique({
          where: { id: createDto.machineId },
        });

        if (!machine) {
          throw new NotFoundException('Machine not found');
        }

        // Validate machine belongs to Pengelola
        if (machine.pengelolaId !== pengelolaUser.pengelolaId) {
          throw new ForbiddenException('You do not have access to this machine');
        }
      }

      // Generate ticket number
      // Format: SO-DDMMYY[urutan]
      // Example: SO-2111241, SO-2111242, SO-21112410 (auto increment tanpa padding dan strip)
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      // Count tickets created today to get sequence number
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const todayTicketCount = await this.prisma.problemTicket.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      
      // Auto increment tanpa padding
      const sequenceNumber = todayTicketCount + 1;
      const ticketNumber = `SO-${day}${month}${year}${sequenceNumber}`;

      // Use first cassette's info as primary for the ticket
      const primaryCassette = cassettes[0];

        // Determine if we have delivery info
        // For SELF_DELIVERY, also set status to IN_DELIVERY so RC can confirm receipt
        const hasDeliveryInfo = (createDto.courierService && createDto.trackingNumber) || createDto.deliveryMethod === 'SELF_DELIVERY';
        const initialTicketStatus = hasDeliveryInfo ? 'IN_DELIVERY' : 'OPEN';
        const initialCassetteStatus = hasDeliveryInfo ? 'IN_TRANSIT_TO_RC' : 'BAD';
      
      this.logger.debug(`Multi-cassette ticket will be created with status: ${initialTicketStatus}, Cassettes status: ${initialCassetteStatus}`);

      // CREATE TICKET with TRANSACTION
      const createdTicket = await this.prisma.$transaction(async (tx) => {
        // 1. Update all cassettes status based on delivery info
        await Promise.all(
          cassettes.map((cassette) =>
            tx.$executeRaw`
              UPDATE cassettes 
              SET status = ${initialCassetteStatus}, updated_at = NOW()
              WHERE id = ${cassette.id}
            `
          )
        );
        this.logger.debug(`Updated ${cassettes.length} cassettes to status: ${initialCassetteStatus}`);

        // 2. Create problem ticket with appropriate status
        const firstDetail = createDto.cassettes[0];
        const ticket = await tx.problemTicket.create({
          data: {
            ticketNumber,
            cassetteId: primaryCassette.id, // Primary cassette for backward compatibility
            machineId: createDto.machineId || null,
            reportedBy: userId,
            title: firstDetail.title,
            description: firstDetail.description,
            priority: firstDetail.priority || 'MEDIUM',
            affectedComponents: firstDetail.affectedComponents || null,
            wsid: firstDetail.wsid || null,
            errorCode: firstDetail.errorCode || null,
            deliveryMethod: createDto.deliveryMethod,
            courierService: createDto.courierService || null,
            trackingNumber: createDto.trackingNumber || null,
            status: initialTicketStatus as any, // Set status based on delivery info
          } as any,
        });
        this.logger.debug(`Created ticket with status: ${initialTicketStatus}`);

        // 3. Create cassette details for ALL cassettes (including the first one)
        await Promise.all(
          cassettes.map((cassette, index) => {
            const detail = createDto.cassettes[index];
            // Use root-level requestReplacement and replacementReason (ignore if sent at cassette level)
            return tx.ticketCassetteDetail.create({
              data: {
                ticketId: ticket.id,
                cassetteId: cassette.id,
                title: detail.title,
                description: detail.description,
                priority: detail.priority || 'MEDIUM',
                affectedComponents: detail.affectedComponents || undefined,
                wsid: detail.wsid || undefined,
                errorCode: detail.errorCode || undefined,
                // Always use root-level requestReplacement and replacementReason (not from detail object)
                requestReplacement: createDto.requestReplacement || false,
                replacementReason: createDto.requestReplacement ? createDto.replacementReason : undefined,
              },
            });
          })
        );

        // 4. Create delivery record for both COURIER and SELF_DELIVERY methods
        if (createDto.deliveryMethod === 'COURIER' || createDto.deliveryMethod === 'SELF_DELIVERY') {
          const senderAddressData = createDto.useOfficeAddress
            ? {
                senderAddress: pengelolaUser.pengelola.address,
                senderCity: pengelolaUser.pengelola.city,
                senderProvince: pengelolaUser.pengelola.province,
                senderPostalCode: null,
                senderContactName: pengelolaUser.pengelola.primaryContactName,
                senderContactPhone: pengelolaUser.pengelola.primaryContactPhone,
              }
            : {
                senderAddress: createDto.senderAddress,
                senderCity: createDto.senderCity,
                senderProvince: createDto.senderProvince,
                senderPostalCode: createDto.senderPostalCode,
                senderContactName: createDto.senderContactName,
                senderContactPhone: createDto.senderContactPhone,
              };

          await tx.cassetteDelivery.create({
            data: {
              ticketId: ticket.id,
              cassetteId: primaryCassette.id, // Use primary cassette
              sentBy: userId,
              courierService: createDto.deliveryMethod === 'SELF_DELIVERY' ? 'SELF_DELIVERY' : createDto.courierService,
              trackingNumber: createDto.deliveryMethod === 'SELF_DELIVERY' ? null : createDto.trackingNumber,
              shippedDate: createDto.deliveryMethod === 'SELF_DELIVERY' ? new Date() : (createDto.shippedDate ? new Date(createDto.shippedDate) : new Date()),
              estimatedArrival: createDto.deliveryMethod === 'SELF_DELIVERY' ? null : (createDto.estimatedArrival ? new Date(createDto.estimatedArrival) : null),
              useOfficeAddress: createDto.useOfficeAddress || false,
              ...senderAddressData,
            } as any,
          });
        }

        return ticket;
      });

      // Fetch complete ticket with relations
      const completeTicket = await this.prisma.problemTicket.findUnique({
        where: { id: createdTicket.id },
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: true,
            },
          },
          machine: true,
          reporter: {
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
          cassetteDelivery: true,
        },
      });

      this.logger.debug(`Multi-cassette ticket ${ticketNumber} created with ${cassettes.length} cassettes`);
      if (hasDeliveryInfo) {
        this.logger.debug(`Status: ${initialTicketStatus}, Cassettes: ${initialCassetteStatus}, Delivery tracking: ${createDto.trackingNumber}`);
      }
      return completeTicket;
    } catch (error) {
      this.logger.error('Error in createMultiCassetteTicket', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateTicketDto, userId: string, userType: string) {
    const ticket = await this.findOne(id, userType);

    // Prevent manual update to RESOLVED - status should only be updated automatically
    // when all repair tickets are completed
    if (updateDto.status === 'RESOLVED') {
      // Verify if all repair tickets are actually completed
      const cassetteIds: string[] = [];
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        ticket.cassetteDetails.forEach((detail: any) => {
          if (detail.cassette?.id) {
            cassetteIds.push(detail.cassette.id);
          }
        });
      } else if (ticket.cassette && !Array.isArray(ticket.cassette) && (ticket.cassette as any)?.id) {
        cassetteIds.push((ticket.cassette as any).id);
      }

      if (cassetteIds.length > 0) {
        const ticketCreatedAt = ticket.createdAt;
        const allRepairTickets = await this.prisma.repairTicket.findMany({
          where: {
            cassetteId: {
              in: cassetteIds,
            },
            createdAt: {
              gte: ticketCreatedAt,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        const expectedRepairCount = cassetteIds.length;
        const completedCount = allRepairTickets.filter(rt => rt.status === 'COMPLETED').length;
        const allCompleted = allRepairTickets.length === expectedRepairCount && 
          allRepairTickets.every(rt => rt.status === 'COMPLETED');

        if (!allCompleted) {
          throw new BadRequestException(
            `Cannot manually set status to RESOLVED. Only ${completedCount}/${expectedRepairCount} repair tickets are completed. ` +
            `Status will be automatically updated to RESOLVED when all repair tickets are completed.`
          );
        }
      }
    }

    return this.prisma.problemTicket.update({
      where: { id },
      data: updateDto as any,
    });
  }

  async createDelivery(createDto: CreateDeliveryDto, userId: string, userType: string) {
    // SUPER ADMIN (HITACHI) can create delivery for testing
    // Pengelola USERS can create delivery normally
    if (userType !== 'pengelola' && userType !== 'HITACHI') {
      throw new ForbiddenException('Only Pengelola users or admin can create delivery forms');
    }

    // Verify ticket exists and is in OPEN status
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id: createDto.ticketId },
      include: {
        cassette: {
          include: {
            customerBank: true,
          },
        },
        machine: {
          include: {
            pengelola: {
              include: {
                users: {
                  take: 1,
                },
              },
            },
            customerBank: true,
          },
        },
      } as any,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== 'OPEN') {
      throw new BadRequestException(`Cannot create delivery for ticket with status ${ticket.status}. Ticket must be OPEN first.`);
    }

    // Check if delivery already exists
    const existingDelivery = await this.prisma.cassetteDelivery.findUnique({
      where: { ticketId: createDto.ticketId },
    });

    if (existingDelivery) {
      throw new BadRequestException('Delivery form already exists for this ticket');
    }

    // Verify cassette exists and belongs to same bank as machine
    const cassette = await this.prisma.cassette.findUnique({
      where: { id: createDto.cassetteId },
      include: { customerBank: true },
    });

    if (!cassette) {
      throw new NotFoundException('Cassette not found');
    }

    // Find machine if machineId is provided
    let machine: any = null;
    if (ticket.machineId) {
      const foundMachine = await this.prisma.machine.findUnique({
        where: { id: ticket.machineId },
        include: { 
          customerBank: true,
          pengelola: {
            include: {
              users: {
                take: 1,
              },
            },
          },
        },
      });

      if (!foundMachine) {
        throw new NotFoundException('Machine not found');
      }

      machine = foundMachine;

      if (cassette.customerBankId !== machine.customerBankId) {
        throw new BadRequestException('Cassette must belong to same bank as machine');
      }
    } else {
      // If no machineId, validate cassette belongs to same bank as ticket's cassette
      const ticketWithCassette = ticket as any;
      if (ticketWithCassette.cassette && ticketWithCassette.cassette.customerBankId !== cassette.customerBankId) {
        throw new BadRequestException('Cassette must belong to same bank as ticket\'s cassette');
      }
    }

    // Check cassette status
    if ((cassette.status as string) !== 'OK' && (cassette.status as string) !== 'BAD') {
      throw new BadRequestException(
        `Cannot send cassette with status ${cassette.status}. Only OK or BAD cassettes can be sent.`,
      );
    }

    // For admin users, use the machine's Pengelola user as sender
    let senderUserId = userId;
    if (userType === 'HITACHI') {
      const ticketMachine = (ticket as any).machine;
      if (ticketMachine && ticketMachine.pengelola && ticketMachine.pengelola.users && ticketMachine.pengelola.users.length > 0) {
        senderUserId = ticketMachine.pengelola.users[0].id;
        this.logger.debug(`Admin creating delivery - using Pengelola user as sender: ${senderUserId}`);
      } else if (machine && (machine as any).pengelola) {
        // Use Pengelola users from machine query result
        const machineVendor = (machine as any).pengelola;
        if (machineVendor && machineVendor.users && machineVendor.users.length > 0) {
          senderUserId = machineVendor.users[0].id;
          this.logger.debug(`Admin creating delivery - using Pengelola user as sender: ${senderUserId}`);
        } else {
          throw new BadRequestException('Machine has no assigned Pengelola users. Cannot create delivery.');
        }
      } else {
        throw new BadRequestException('Machine not found or has no assigned Pengelola users. Cannot create delivery.');
      }
    }

    // Create delivery and update cassette status
    return this.prisma.$transaction(async (tx) => {
      // Update cassette status
      await tx.cassette.update({
        where: { id: createDto.cassetteId },
        data: {
          status: 'IN_TRANSIT_TO_RC',
        },
      });

      // Create delivery record
      const delivery = await tx.cassetteDelivery.create({
        data: {
          ticketId: createDto.ticketId,
          cassetteId: createDto.cassetteId,
          sentBy: senderUserId,
          shippedDate: new Date(createDto.shippedDate),
          courierService: createDto.courierService,
          trackingNumber: createDto.trackingNumber,
          estimatedArrival: createDto.estimatedArrival ? new Date(createDto.estimatedArrival) : null,
          notes: createDto.notes,
        },
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: true,
            },
          },
          ticket: true,
        },
      });

      // Update ticket status
      await tx.problemTicket.update({
        where: { id: createDto.ticketId },
        data: {
          status: 'IN_DELIVERY' as any,
        },
      });

      return delivery;
    });
  }

  async receiveDelivery(ticketId: string, receiveDto: ReceiveDeliveryDto, userId: string, userType: string) {
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi RC staff can receive cassettes');
    }

    // Find ticket first to check deliveryMethod
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id: ticketId },
      include: {
        cassetteDetails: {
          include: {
            cassette: true,
          },
        },
        cassette: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Find delivery
    let delivery = await this.prisma.cassetteDelivery.findUnique({
      where: { ticketId },
      include: {
        cassette: true,
      },
    });

    // If no delivery record but ticket has SELF_DELIVERY, create one
    if (!delivery && ticket.deliveryMethod === 'SELF_DELIVERY') {
      // Get primary cassette
      const primaryCassette = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
        ? ticket.cassetteDetails[0].cassette
        : ticket.cassette;

      if (!primaryCassette) {
        throw new BadRequestException('No cassette found for this ticket');
      }

      // Create delivery record for SELF_DELIVERY
      delivery = await this.prisma.cassetteDelivery.create({
        data: {
          ticketId: ticket.id,
          cassetteId: primaryCassette.id,
          sentBy: ticket.reportedBy,
          courierService: 'SELF_DELIVERY',
          trackingNumber: null,
          shippedDate: new Date(),
          estimatedArrival: null,
          useOfficeAddress: false,
        } as any,
        include: {
          cassette: true,
        },
      });
    }

    if (!delivery) {
      throw new NotFoundException('Delivery not found. Please ensure ticket has delivery information.');
    }

    if (delivery.receivedAtRc) {
      throw new BadRequestException('Cassette already received at RC');
    }

    // For SELF_DELIVERY, ticket status can be OPEN or IN_DELIVERY
    // For COURIER, ticket status should be IN_DELIVERY
    if (delivery.courierService !== 'SELF_DELIVERY' && ticket.status !== 'IN_DELIVERY') {
      throw new BadRequestException(`Ticket status must be IN_DELIVERY to receive delivery. Current status: ${ticket.status}`);
    }

    // Update delivery and cassette status
    return this.prisma.$transaction(async (tx) => {
      // Update delivery record
      const updatedDelivery = await tx.cassetteDelivery.update({
        where: { id: delivery.id },
        data: {
          receivedAtRc: new Date(),
          receivedBy: userId,
          notes: receiveDto.notes,
        },
      });

      // Update cassette status to IN_TRANSIT_TO_RC if not already
      // Get all cassettes from ticket details and delivery
      const cassetteIds: string[] = [];
      
      // From ticket details
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        ticket.cassetteDetails.forEach((detail: any) => {
          if (detail.cassette?.id && !cassetteIds.includes(detail.cassette.id)) {
            cassetteIds.push(detail.cassette.id);
          }
        });
      }
      
      // From delivery
      if (delivery.cassetteId && !cassetteIds.includes(delivery.cassetteId)) {
        cassetteIds.push(delivery.cassetteId);
      }
      
      // Check if this is a replacement ticket
      const isReplacementTicket = (ticket.cassetteDetails as any)?.some((detail: any) => detail.requestReplacement === true) || (ticket as any).requestReplacement === true;
      
      // Update cassette status
      // For replacement tickets: SCRAPPED cassettes should remain SCRAPPED (not changed to IN_REPAIR)
      // For repair tickets: cassettes should be updated to IN_REPAIR
      if (cassetteIds.length > 0) {
        if (isReplacementTicket) {
          // For replacement tickets, only update cassettes that are NOT SCRAPPED
          // SCRAPPED cassettes remain SCRAPPED (they will be replaced, not repaired)
          await tx.cassette.updateMany({
            where: {
              id: { in: cassetteIds },
              status: { not: 'SCRAPPED' },
            },
            data: {
              status: 'IN_REPAIR',
              updatedAt: new Date(),
            },
          });
          this.logger.debug(`RC Receive (Replacement): Updated non-SCRAPPED cassettes to IN_REPAIR. SCRAPPED cassettes remain SCRAPPED.`);
        } else {
          // For repair tickets, update all cassettes to IN_REPAIR
          await tx.cassette.updateMany({
            where: {
              id: { in: cassetteIds },
            },
            data: {
              status: 'IN_REPAIR',
              updatedAt: new Date(),
            },
          });
          this.logger.debug(`RC Receive: Updated ${cassetteIds.length} cassettes to IN_REPAIR (arrived at RC, ready for repair)`);
        }
      }

      // Update ticket status ke RECEIVED (barang sudah diterima, belum mulai repair)
      await tx.problemTicket.update({
        where: { id: ticketId },
        data: {
          status: 'RECEIVED' as any,
        },
      });
      this.logger.debug('RC Receive: Updated ticket status to RECEIVED');

      // Note: Repair ticket akan dibuat manual saat teknisi klik "Mulai Repair"
      // Tidak auto-create repair ticket di sini

      return updatedDelivery;
    });
  }

  async createReturn(createDto: CreateReturnDto, userId: string, userType: string) {
    try {
      this.logger.debug(`Confirming pickup: ticketId=${createDto.ticketId}, userId=${userId}, userType=${userType}`);

      // Only RC staff can confirm pickup (they handle the pickup confirmation on behalf of Pengelola)
      if (userType !== 'HITACHI') {
        throw new ForbiddenException('Only RC staff can confirm pickup');
      }

    // Verify ticket exists and is RESOLVED
    // Include cassetteDetails to check for replacement requests
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id: createDto.ticketId },
      include: {
        cassetteDelivery: {
          include: {
            cassette: true,
          },
        },
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
          // Include requestReplacement and replacementReason fields
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Get full ticket with machine info
    const fullTicket = await this.prisma.problemTicket.findUnique({
      where: { id: createDto.ticketId },
      include: {
        machine: true,
      },
    });

    if (!fullTicket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if ticket is RESOLVED OR if all repair tickets are completed (for multi-cassette tickets)
    // This handles cases where backend status hasn't synced yet but all repairs are done
    let canConfirmPickup = ticket.status === 'RESOLVED';
    
    if (!canConfirmPickup) {
      // Check if all repair tickets are completed (even if ticket.status is still IN_PROGRESS)
      const ticketCreatedAt = ticket.createdAt;
      
      // Get all cassette IDs from this ticket
      const cassetteIds: string[] = [];
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
        ticket.cassetteDetails.forEach((detail: any) => {
          if (detail.cassette?.id) {
            cassetteIds.push(detail.cassette.id);
          }
        });
      } else if (ticket.cassetteDelivery?.cassette?.id) {
        cassetteIds.push(ticket.cassetteDelivery.cassette.id);
      }
      
      if (cassetteIds.length > 0) {
        // Find all repair tickets for these cassettes created after ticket creation
        const allRepairTicketsRaw = await this.prisma.repairTicket.findMany({
          where: {
            cassetteId: { in: cassetteIds },
            createdAt: { gte: ticketCreatedAt },
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
        
        // Get latest repair ticket per cassette
        const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string; createdAt: Date }>();
        for (const rt of allRepairTicketsRaw) {
          if (!latestRepairsMap.has(rt.cassetteId)) {
            latestRepairsMap.set(rt.cassetteId, rt);
          }
        }
        const latestRepairs = Array.from(latestRepairsMap.values());
        
        // Check if we have repair tickets for all cassettes and all are COMPLETED
        const expectedRepairCount = cassetteIds.length;
        const actualRepairCount = latestRepairs.length;
        const allCompleted = actualRepairCount === expectedRepairCount && 
          latestRepairs.every(rt => rt.status === 'COMPLETED');
        
        if (allCompleted) {
          canConfirmPickup = true;
          this.logger.debug(`Pickup allowed: All ${actualRepairCount}/${expectedRepairCount} repair tickets are COMPLETED, even though ticket.status is ${ticket.status}`);
        }
      }
    }
    
    if (!canConfirmPickup) {
      throw new BadRequestException(
        `Cannot confirm pickup for ticket with status ${ticket.status}. Ticket must be RESOLVED or all repair tickets must be COMPLETED first.`,
      );
    }

    if (!ticket.cassetteDelivery) {
      throw new BadRequestException('No delivery found for this ticket. Cannot create return.');
    }

    // Check if return already exists
    const existingReturn = await (this.prisma as any).cassetteReturn.findUnique({
      where: { ticketId: createDto.ticketId },
    });

    // If return already exists, pickup has already been confirmed
    if (existingReturn) {
      throw new BadRequestException('Pickup confirmation already exists for this ticket');
    }

    // Check if this is a replacement ticket
    // requestReplacement is stored in cassetteDetails (not at ticket level)
    const isReplacementTicket = ticket.cassetteDetails && 
      ticket.cassetteDetails.some((detail: any) => detail.requestReplacement === true);

    this.logger.debug(`Checking replacement ticket: ticketId=${createDto.ticketId}, detailsCount=${ticket.cassetteDetails?.length || 0}, isReplacement=${isReplacementTicket}`);

    let cassette: any;

    if (isReplacementTicket) {
      // For replacement tickets: find the NEW cassette (with replacementTicketId = this ticket.id)
      const newCassette = await this.prisma.cassette.findFirst({
        where: {
          replacementTicketId: createDto.ticketId,
        },
        include: {
          cassetteType: true,
          customerBank: true,
        },
      });

      if (!newCassette) {
        throw new BadRequestException(
          'Kaset baru untuk replacement belum ditemukan. Pastikan proses replacement sudah selesai dilakukan.',
        );
      }

      // Verify new cassette is in OK status (replacement completed)
      if ((newCassette.status as string) !== 'OK') {
        throw new BadRequestException(
          `Kaset baru harus dalam status OK untuk bisa di-pickup. Status saat ini: ${newCassette.status}`,
        );
      }

      cassette = newCassette;
      this.logger.debug(`Replacement ticket: Using NEW cassette ${newCassette.serialNumber} for return`);
    } else {
      // For repair tickets: use the cassette from delivery (the one that was repaired)
      cassette = ticket.cassetteDelivery.cassette;

      this.logger.debug(`Repair ticket - cassette status: id=${cassette.id}, serialNumber=${cassette.serialNumber}, status=${cassette.status}`);

      // Verify cassette is in READY_FOR_PICKUP status (repair completed, QC passed, ready for pickup)
      // Status READY_FOR_PICKUP berarti kaset sudah selesai diperbaiki dan siap untuk di-pickup
      // OR SCRAPPED status (for disposal confirmation - kaset tidak bisa diperbaiki, tetap di RC)
      if ((cassette.status as string) !== 'READY_FOR_PICKUP' && (cassette.status as string) !== 'SCRAPPED') {
        throw new BadRequestException(
          `Cannot confirm pickup for cassette with status ${cassette.status}. Cassette must be in READY_FOR_PICKUP status (repair completed and QC passed) or SCRAPPED status (for disposal confirmation).`,
        );
      }

      // Handle SCRAPPED cassette (disposal confirmation - kaset tidak bisa diperbaiki, tetap di RC)
      if ((cassette.status as string) === 'SCRAPPED') {
        // Check if there's a new cassette for this ticket (replacement ticket)
        const newCassette = await this.prisma.cassette.findFirst({
          where: {
            replacementTicketId: createDto.ticketId,
          },
          include: {
            cassetteType: true,
            customerBank: true,
          },
        });

        if (newCassette) {
          // This is a replacement ticket - use the new cassette for pickup
          this.logger.warn(`Replacement ticket detected: Old cassette is SCRAPPED, found new cassette: ${newCassette.serialNumber}.`);
          
          // Verify new cassette is in OK status
          if ((newCassette.status as string) !== 'OK') {
            throw new BadRequestException(
              `Kaset baru harus dalam status OK untuk bisa di-pickup. Status saat ini: ${newCassette.status}`,
            );
          }

          // Use the new cassette instead
          cassette = newCassette;
          this.logger.debug(`Using NEW cassette ${newCassette.serialNumber} for return (replacement ticket)`);
        } else {
          // No replacement - this is a disposal confirmation for SCRAPPED cassette
          // Kaset SCRAPPED tetap di RC, tidak di-pickup, hanya konfirmasi disposal
          this.logger.debug(`Disposal confirmation: Cassette ${cassette.serialNumber} is SCRAPPED, will remain at RC. Creating disposal record.`);
        }
      } else {
        this.logger.debug(`Repair ticket: Using repaired cassette ${cassette.serialNumber} (READY_FOR_PICKUP) for pickup`);
      }
    }

    // Check if this is a disposal confirmation for SCRAPPED cassette (no replacement)
    const isDisposalConfirmation = (cassette.status as string) === 'SCRAPPED' && !isReplacementTicket;
    
    // Confirm pickup/disposal and update cassette status accordingly
    return this.prisma.$transaction(async (tx) => {
      // For disposal confirmation: SCRAPPED cassettes remain SCRAPPED (stay at RC)
      // For normal pickup: READY_FOR_PICKUP cassettes become OK (picked up)
      let cassettesToUpdate: string[] = [];
      
      if (isDisposalConfirmation) {
        // Disposal confirmation: SCRAPPED cassettes remain at RC, status stays SCRAPPED
        // Get all SCRAPPED cassettes in this ticket
        if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
          const cassettesInTicket = ticket.cassetteDetails.map((detail: any) => detail.cassette);
          const scrappedCassettes = cassettesInTicket.filter((c: any) => c && c.status === 'SCRAPPED');
          cassettesToUpdate = scrappedCassettes.map((c: any) => c.id);
          this.logger.debug(`Disposal confirmation: Found ${scrappedCassettes.length} SCRAPPED cassette(s) - will remain at RC`);
        } else {
          // Single cassette ticket
          if (cassette.status === 'SCRAPPED') {
            cassettesToUpdate = [cassette.id];
            this.logger.debug(`Disposal confirmation: Single SCRAPPED cassette ${cassette.serialNumber} - will remain at RC`);
          }
        }
        // Note: We don't update SCRAPPED cassettes - they stay SCRAPPED at RC
      } else {
        // Normal pickup: READY_FOR_PICKUP cassettes become OK
        cassettesToUpdate = [cassette.id];
        
        // Check if this is a multi-cassette ticket
        if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
          // Get all cassettes in this ticket that are in READY_FOR_PICKUP status (completed repair, ready for pickup)
          const cassettesInTicket = ticket.cassetteDetails.map((detail: any) => detail.cassette);
          const readyCassettes = cassettesInTicket.filter((c: any) => c && c.status === 'READY_FOR_PICKUP');
          cassettesToUpdate = readyCassettes.map((c: any) => c.id);
          
          this.logger.debug(`Multi-cassette ticket: Found ${readyCassettes.length} cassettes in READY_FOR_PICKUP status to update for pickup`);
        }
        
        // Update all cassettes to OK status immediately (picked up by Pengelola at RC)
        if (cassettesToUpdate.length > 0) {
          // Update each cassette individually to ensure all are updated
          await Promise.all(
            cassettesToUpdate.map((cassetteId) =>
              tx.$executeRaw`
                UPDATE cassettes 
                SET status = ${'OK'}, updated_at = NOW()
                WHERE id = ${cassetteId}
              `
            )
          );
          this.logger.debug(`Confirm Pickup: Updated ${cassettesToUpdate.length} cassette(s) status to OK (${isReplacementTicket ? 'Replacement' : 'Repair'})`);
        }
      }

      // Create return record with pickup/disposal confirmation
      // Since pickup/disposal is done at RC, we set receivedAtPengelola immediately
      let notes = createDto.notes?.trim() || null;
      
      // For disposal confirmation, add disposal information to notes
      if (isDisposalConfirmation) {
        const disposalInfo = `\n\n=== DISPOSAL CONFIRMATION ===\n` +
          `Kaset dengan status SCRAPPED (tidak bisa diperbaiki, tidak lolos QC)\n` +
          `Kaset tetap di RC untuk disposal\n` +
          `Tanggal konfirmasi: ${new Date().toLocaleString('id-ID')}\n` +
          `Dikonfirmasi oleh: RC Staff\n` +
          `Alasan: Kaset tidak dapat diperbaiki atau tidak lolos Quality Control setelah perbaikan`;
        notes = notes ? `${notes}${disposalInfo}` : disposalInfo;
      }
      
      // Store signature (RC staff confirms pickup on behalf of Pengelola)
      const signatureData = createDto.rcSignature || createDto.signature || null;
      
      if (signatureData) {
        this.logger.debug(`RC ${isDisposalConfirmation ? 'Disposal' : 'Pickup'} signature received for ticket ${createDto.ticketId} (length: ${signatureData.length} chars)`);
      }
      
      const pickupDate = new Date(); // Pickup/disposal date is now

      // For multi-cassette tickets, use the primary cassette (first one from cassetteDetails or from delivery)
      // Since ticketId is unique in CassetteReturn, we can only create one return record per ticket
      let primaryCassetteId = cassette.id;
      
      // For multi-cassette tickets, prefer using the first READY_FOR_PICKUP cassette
      if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0 && !isDisposalConfirmation) {
        const readyCassettes = ticket.cassetteDetails
          .map((detail: any) => detail.cassette)
          .filter((c: any) => c && c.status === 'READY_FOR_PICKUP');
        
        if (readyCassettes.length > 0) {
          primaryCassetteId = readyCassettes[0].id;
          this.logger.debug(`Multi-cassette ticket: Using primary cassette ${readyCassettes[0].serialNumber} for return record`);
        }
      }

      // Create new return record (RC confirmation only)
      const returnRecord = await tx.cassetteReturn.create({
        data: {
          ticketId: createDto.ticketId,
          cassetteId: primaryCassetteId, // Use primary cassette ID
          sentBy: userId,
          shippedDate: pickupDate, // Use pickup/disposal date as shippedDate for backward compatibility
          courierService: null, // No courier service for pickup/disposal
          trackingNumber: null, // No tracking number for pickup/disposal
          estimatedArrival: null, // No estimated arrival for pickup/disposal
          receivedAtPengelola: pickupDate, // Set immediately since RC confirms on behalf of Pengelola
          receivedBy: null, // RC confirms on behalf of Pengelola, no specific Pengelola user ID available
          notes: notes,
          signature: signatureData, // Store signature base64 data
          // RC confirmation (RC staff confirms pickup)
          confirmedByRc: userId,
          rcSignature: signatureData,
          rcConfirmedAt: pickupDate,
        },
        include: {
          cassette: {
            include: {
              cassetteType: true,
              customerBank: true,
            },
          },
          ticket: true,
          sender: {
            select: {
              fullName: true,
              role: true,
            },
          },
          rcConfirmer: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
      });

      // Update ticket status to CLOSED immediately after RC confirmation
      const shouldCloseTicket = true;
      
      // Update ticket status to CLOSED immediately after RC confirmation
      // RC staff confirms pickup on behalf of Pengelola
      await tx.problemTicket.update({
        where: { id: createDto.ticketId },
        data: {
          status: 'CLOSED' as any,
          closedAt: pickupDate,
        },
      });
      this.logger.debug(`Pickup confirmed by RC: Ticket ${createDto.ticketId} status updated to CLOSED`);

      return returnRecord;
    });
    } catch (error: any) {
      this.logger.error(`Error in createReturn: ticketId=${createDto.ticketId}`, error instanceof Error ? error.stack : error);

      // Re-throw known exceptions with their messages
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(`Failed to confirm pickup: ${error.message || 'Unknown error'}`);
    }
  }

  async receiveReturn(ticketId: string, receiveDto: ReceiveReturnDto, userId: string, userType: string) {
    // Only Pengelola users can receive returns
    if (userType?.toUpperCase() !== 'PENGELOLA') {
      throw new ForbiddenException('Only Pengelola users can receive cassette returns');
    }

    // Find return record
    const returnRecord = await (this.prisma as any).cassetteReturn.findUnique({
      where: { ticketId },
      include: {
        ticket: true,
        cassette: true,
      },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return delivery not found');
    }

    if (returnRecord.receivedAtPengelola) {
      throw new BadRequestException('Cassette already received at Pengelola');
    }

    // Verify Pengelola user has access to this ticket's machine or is the reporter
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id: ticketId },
      include: {
        machine: {
          include: {
            pengelola: {
              include: {
                users: {
                  where: { id: userId },
                },
              },
            },
          },
        },
        reporter: {
          select: {
            pengelolaId: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const pengelolaUser = await this.prisma.pengelolaUser.findUnique({
      where: { id: userId },
    });

    if (!pengelolaUser) {
      throw new NotFoundException('Pengelola user not found');
    }

    // Check if Pengelola has access: machine.pengelolaId OR reporter.pengelolaId matches
    const hasMachineAccess = ticket.machine && pengelolaUser.pengelolaId === ticket.machine.pengelolaId;
    const isReporter = (ticket.reporter as any)?.pengelolaId === pengelolaUser.pengelolaId;
    
    if (!hasMachineAccess && !isReporter) {
      throw new ForbiddenException('You do not have access to receive this cassette return');
    }

    // Verify ticket status is RETURN_SHIPPED (barang sudah dikirim dari RC)
    if (returnRecord.ticket.status !== 'RETURN_SHIPPED') {
      throw new BadRequestException(
        `Cannot receive return for ticket with status ${returnRecord.ticket.status}. Ticket must be in RETURN_SHIPPED status first.`,
      );
    }

    // Update return and cassette status
    return this.prisma.$transaction(async (tx) => {
      // Update return record
      const updatedReturn = await tx.cassetteReturn.update({
        where: { id: returnRecord.id },
        data: {
          receivedAtPengelola: new Date(),
          receivedBy: userId,
          notes: receiveDto.notes,
        },
      });

      // For multi-cassette tickets: update ALL cassettes in the ticket that are in IN_TRANSIT_TO_PENGELOLA status
      // For single-cassette tickets: update only the cassette being returned
      let cassettesToUpdate: string[] = [returnRecord.cassetteId];
      
      // Check if this is a multi-cassette ticket
      const ticketWithDetails = await tx.problemTicket.findUnique({
        where: { id: ticketId },
        include: {
          cassetteDetails: {
            include: {
              cassette: {
                select: {
                  id: true,
                  status: true,
                  serialNumber: true,
                },
              },
            },
          },
        },
      });
      
      if (ticketWithDetails && ticketWithDetails.cassetteDetails && ticketWithDetails.cassetteDetails.length > 0) {
        // Get all cassettes in this ticket that are in IN_TRANSIT_TO_PENGELOLA status (being returned)
        const cassettesInTicket = ticketWithDetails.cassetteDetails.map((detail: any) => detail.cassette);
        const cassettesInTransit = cassettesInTicket.filter((c: any) => c && c.status === 'IN_TRANSIT_TO_PENGELOLA');
        cassettesToUpdate = cassettesInTransit.map((c: any) => c.id);
        
        this.logger.debug(`Multi-cassette ticket: Found ${cassettesInTransit.length} cassettes in IN_TRANSIT_TO_PENGELOLA status to update to OK`);
      }
      
      // Update all cassettes that need to be updated to OK
      if (cassettesToUpdate.length > 0) {
        // Update each cassette individually to ensure all are updated
        await Promise.all(
          cassettesToUpdate.map((cassetteId) =>
            tx.$executeRaw`
              UPDATE cassettes 
              SET status = ${'OK'}, updated_at = NOW()
              WHERE id = ${cassetteId}
            `
          )
        );
        this.logger.debug(`Receive Return: Updated ${cassettesToUpdate.length} cassette(s) status to OK`);
        
        // Verify the updates were successful
        const updatedCassettes = await tx.cassette.findMany({
          where: { id: { in: cassettesToUpdate } },
          select: { id: true, status: true, serialNumber: true },
        });
        
        const failedUpdates = updatedCassettes.filter(c => c.status !== 'OK');
        if (failedUpdates.length > 0) {
          this.logger.error(`Receive Return: Failed to update ${failedUpdates.length} cassette(s) status to OK:`, failedUpdates.map(c => `${c.serialNumber} (${c.status})`));
          // Try again with Prisma update as fallback
          await Promise.all(
            failedUpdates.map((c) =>
              tx.cassette.update({
                where: { id: c.id },
                data: { status: 'OK' as any },
              })
            )
          );
          this.logger.debug(`Receive Return: Fallback update successful for ${failedUpdates.length} cassette(s)`);
        }
      }

      // Update ticket status to CLOSED
      await tx.problemTicket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED' as any,
          closedAt: new Date(),
        },
      });

      return updatedReturn;
    });
  }

  /**
   * Get cassettes that need confirmation (pending confirmation)
   * Kaset dengan status IN_TRANSIT_TO_PENGELOLA yang sudah tiba (estimated arrival date sudah lewat)
   * dan belum dikonfirmasi oleh pengelola
   */
  async getPendingConfirmations(pengelolaId?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const take = limit;
    const now = new Date();

    // Find cassettes with status IN_TRANSIT_TO_PENGELOLA that have return records
    // and not yet received by pengelola
    // Show all cassettes in transit, not just those with estimatedArrival passed
    // This allows pengelola to confirm even if estimatedArrival hasn't passed yet (early arrival)
    const whereClause: any = {
      status: 'IN_TRANSIT_TO_PENGELOLA',
      returns: {
        some: {
          receivedAtPengelola: null, // Not yet received - this is the key condition
          // Remove estimatedArrival filter to show all pending confirmations
          // estimatedArrival can be null, in the past, or in the future - all should be shown
        },
      },
    };

    // Filter by pengelola if provided
    if (pengelolaId) {
      // Get bank IDs assigned to this pengelola
      const pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            select: {
              customerBankId: true,
            },
          },
        },
      });

      if (pengelola && pengelola.bankAssignments.length > 0) {
        const bankIds = pengelola.bankAssignments.map((a) => a.customerBankId);
        whereClause.customerBankId = { in: bankIds };
      } else {
        // No bank assignments, return empty
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          statistics: {
            total: 0,
            byUrgency: {
              normal: 0,
              attention: 0,
              urgent: 0,
              very_urgent: 0,
            },
            averageDaysWaiting: 0,
            overThreshold: 0,
          },
        };
      }
    }

    const cassettes = await this.prisma.cassette.findMany({
      where: whereClause,
      include: {
        cassetteType: true,
        customerBank: {
          select: {
            id: true,
            bankCode: true,
            bankName: true,
          },
        },
        returns: {
          where: {
            receivedAtPengelola: null, // Not yet received - this is the key condition
            // Include all return records, not just those with estimatedArrival passed
          },
          orderBy: [
            { estimatedArrival: 'asc' }, // Prioritize by estimated arrival if available
            { shippedDate: 'desc' }, // Otherwise by shipped date
          ],
          take: 1, // Get the most relevant return record
          select: {
            id: true,
            estimatedArrival: true,
            shippedDate: true,
            trackingNumber: true,
            courierService: true,
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'asc', // Oldest first (priority to confirm)
      },
      skip,
      take,
    });

    // Calculate days waiting for confirmation
    const cassettesWithDays = cassettes.map((cassette) => {
      const returnRecord = cassette.returns[0];
      // Use estimatedArrival if available, otherwise use shippedDate, otherwise use updatedAt
      // Use estimatedArrival if available, otherwise use shippedDate, otherwise use updatedAt
      const referenceDate = returnRecord?.estimatedArrival || returnRecord?.shippedDate || cassette.updatedAt;
      const daysWaiting = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine urgency level
      // If daysWaiting is negative (estimatedArrival in the future), treat as normal
      // Otherwise, use the same urgency logic
      let urgency: 'normal' | 'attention' | 'urgent' | 'very_urgent' = 'normal';
      if (daysWaiting < 0) {
        // Estimated arrival in the future - normal priority (early arrival)
        urgency = 'normal';
      } else if (daysWaiting < 1) {
        urgency = 'normal';
      } else if (daysWaiting < 3) {
        urgency = 'attention';
      } else if (daysWaiting < 7) {
        urgency = 'urgent';
      } else {
        urgency = 'very_urgent';
      }

      return {
        ...cassette,
        daysWaiting,
        urgency,
        estimatedArrival: returnRecord?.estimatedArrival || null,
        returnRecord: returnRecord ? {
          id: returnRecord.id,
          shippedDate: returnRecord.shippedDate,
          trackingNumber: returnRecord.trackingNumber,
          courierService: returnRecord.courierService,
          ticketId: returnRecord.ticket?.id,
          ticketNumber: returnRecord.ticket?.ticketNumber,
        } : null,
      };
    });

    // Get total count
    const total = await this.prisma.cassette.count({
      where: whereClause,
    });

    // Calculate statistics
    const stats = {
      total,
      byUrgency: {
        normal: cassettesWithDays.filter((c) => c.urgency === 'normal').length,
        attention: cassettesWithDays.filter((c) => c.urgency === 'attention').length,
        urgent: cassettesWithDays.filter((c) => c.urgency === 'urgent').length,
        very_urgent: cassettesWithDays.filter((c) => c.urgency === 'very_urgent').length,
      },
      averageDaysWaiting: cassettesWithDays.length > 0
        ? Math.round(cassettesWithDays.reduce((sum, c) => sum + c.daysWaiting, 0) / cassettesWithDays.length)
        : 0,
      overThreshold: cassettesWithDays.filter((c) => c.daysWaiting >= 3).length, // Threshold: 3 days
    };

    return {
      data: cassettesWithDays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: stats,
    };
  }

  async close(id: string, resolutionNotes: string, userId: string, userType: string) {
    await this.findOne(id, userType);

    return this.prisma.problemTicket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        resolutionNotes,
        resolvedAt: new Date(),
        closedAt: new Date(),
      },
    });
  }

  async getStatistics() {
    try {
      const [total, open, inProgress, resolved, critical] = await Promise.all([
        this.prisma.problemTicket.count(),
        this.prisma.problemTicket.count({ where: { status: 'OPEN' } }),
        this.prisma.problemTicket.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.problemTicket.count({ where: { status: 'RESOLVED' } }),
        this.prisma.problemTicket.count({ 
          where: { 
            priority: 'CRITICAL',
            status: { not: 'CLOSED' }
          } 
        }),
      ]);

      return {
        total,
        open,
        inProgress,
        resolved,
        critical,
        activeTickets: open + inProgress,
      };
    } catch (error) {
      this.logger.error('Error in getStatistics', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Get count of new tickets (OPEN and IN_DELIVERY) for badge notification
   * This is optimized to only return count, not the actual data
   */
  async getNewTicketsCount(userType: string, pengelolaId?: string): Promise<number> {
    try {
      const whereClause: any = {
        deletedAt: null,
        status: { in: ['OPEN', 'IN_DELIVERY'] },
      };

      // Apply role-based filtering
      if (userType === 'HITACHI') {
        // Admin can see everything - no filter
      } else if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
        // Pengelola can see tickets where:
        // 1. Machine is assigned to them, OR
        // 2. They are the reporter (created the ticket)
        whereClause.OR = [
          {
            machine: {
              pengelolaId,
            },
          },
          {
            reporter: {
              pengelolaId,
            },
          },
        ];
      }

      const count = await this.prisma.problemTicket.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      this.logger.error('Error in getNewTicketsCount', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async getReplacementRequestsCount(userType: string, pengelolaId?: string): Promise<number> {
    try {
      const whereClause: any = {
        deletedAt: null,
        cassetteDetails: {
          some: {
            requestReplacement: true,
          },
        },
      };

      // Apply role-based filtering
      if (userType === 'HITACHI') {
        // Admin can see everything - no filter
      } else if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
        // Pengelola can see tickets where:
        // 1. Machine is assigned to them, OR
        // 2. They are the reporter (created the ticket)
        whereClause.OR = [
          {
            machine: {
              pengelolaId,
            },
          },
          {
            reporter: {
              pengelolaId,
            },
          },
        ];
      }

      const count = await this.prisma.problemTicket.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      this.logger.error('Error in getReplacementRequestsCount', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async getPendingConfirmationsCount(pengelolaId?: string): Promise<number> {
    try {
      const whereClause: any = {
        status: 'IN_TRANSIT_TO_PENGELOLA',
        returns: {
          some: {
            receivedAtPengelola: null, // Not yet received
          },
        },
      };

      // Filter by pengelola if provided
      if (pengelolaId) {
        // Get bank IDs assigned to this pengelola
        const pengelola = await this.prisma.pengelola.findUnique({
          where: { id: pengelolaId },
          include: {
            bankAssignments: {
              select: {
                customerBankId: true,
              },
            },
          },
        });

        if (pengelola && pengelola.bankAssignments.length > 0) {
          const bankIds = pengelola.bankAssignments.map((a) => a.customerBankId);
          whereClause.customerBankId = { in: bankIds };
        } else {
          // No bank assignments, return 0
          return 0;
        }
      }

      const count = await this.prisma.cassette.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      this.logger.error('Error in getPendingConfirmationsCount', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async softDelete(id: string, userId: string, userType: string) {
    // Only Hitachi users can delete tickets
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi users can delete tickets');
    }

    // Find the ticket
    const ticket = await this.prisma.problemTicket.findUnique({
      where: { id },
      include: {
        cassetteDelivery: {
          include: {
            cassette: true,
          },
        },
        cassetteDetails: {
          include: {
            cassette: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (ticket.deletedAt) {
      throw new BadRequestException('Ticket already deleted');
    }

    // Check user role - only SUPER_ADMIN can delete CLOSED tickets
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // If ticket is CLOSED, only SUPER_ADMIN can delete it
    if (ticket.status === 'CLOSED' && user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete CLOSED tickets');
    }

    // Soft delete ticket and restore cassette status
    return this.prisma.$transaction(async (tx) => {
      // 1. Soft delete the ticket
      await tx.problemTicket.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // 2. Get all cassettes from ticket details and delivery
      const cassetteIds: string[] = [];
      
      // From ticket details
      ticket.cassetteDetails.forEach((detail) => {
        if (!cassetteIds.includes(detail.cassetteId)) {
          cassetteIds.push(detail.cassetteId);
        }
      });
      
      // From delivery (if exists)
      if (ticket.cassetteDelivery?.cassetteId) {
        if (!cassetteIds.includes(ticket.cassetteDelivery.cassetteId)) {
          cassetteIds.push(ticket.cassetteDelivery.cassetteId);
        }
      }
      
      // 3. Soft delete repair tickets associated with this ticket
      // Find repair tickets for these cassettes that were created after this ticket
      const ticketCreatedAt = ticket.createdAt;
      const repairTickets = await tx.repairTicket.findMany({
        where: {
          cassetteId: { in: cassetteIds },
          createdAt: { gte: ticketCreatedAt },
          deletedAt: null, // Only delete non-deleted repair tickets
        },
        select: { id: true },
      });

      if (repairTickets.length > 0) {
        const repairTicketIds = repairTickets.map((rt) => rt.id);
        await tx.repairTicket.updateMany({
          where: { id: { in: repairTicketIds } },
          data: {
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });
        this.logger.debug(`Soft deleted ${repairTickets.length} repair tickets for ticket ${ticket.ticketNumber}`);
      }
      
      // 4. Restore each cassette to OK status
      await Promise.all(
        cassetteIds.map((cassetteId) =>
          tx.$executeRaw`
            UPDATE cassettes 
            SET status = ${'OK'}, updated_at = NOW()
            WHERE id = ${cassetteId}
          `
        )
      );

      this.logger.debug(`Soft deleted ticket ${ticket.ticketNumber}, restored ${cassetteIds.length} cassettes to OK, deleted ${repairTickets.length} repair tickets`);

      return {
        message: 'Ticket berhasil dihapus',
        ticketNumber: ticket.ticketNumber,
        cassettesRestored: cassetteIds.length,
        repairTicketsDeleted: repairTickets.length,
      };
    });
  }
}

