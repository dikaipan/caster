import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineDto, UpdateMachineDto, UpdateWsidDto } from './dto';

@Injectable()
export class MachinesService {
  private readonly logger = new Logger(MachinesService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(
    userType: string,
    pengelolaId?: string,
    userId?: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    customerBankId?: string,
  ) {
    const whereClause: any = {};

    // SUPER ADMIN (HITACHI) can see ALL machines
    // Pengelola users can only see their assigned machines
    // BANK users can only see machines from their own bank
    if (userType === 'HITACHI') {
      // Admin can see everything - no filter
      // But if customerBankId is provided, filter by it
      if (customerBankId) {
        whereClause.customerBankId = customerBankId;
      }
      if (pengelolaId) {
        whereClause.pengelolaId = pengelolaId;
      }
      this.logger.debug('Admin user - showing all machines');
    } else if (userType === 'BANK' && customerBankId) {
      // BANK users can only see machines from their own bank
      whereClause.customerBankId = customerBankId;
      this.logger.debug('BANK user - showing machines from their bank');
    } else if (userType === 'PENGELOLA' && pengelolaId) {
      // SECURITY: Pengelola can only see machines from banks they are assigned to
      // First, get all banks assigned to this pengelola
      const bankAssignments = await this.prisma.bankPengelolaAssignment.findMany({
        where: {
          pengelolaId,
          status: 'ACTIVE',
        },
        select: {
          customerBankId: true,
        },
      });

      // If pengelola has no bank assignments, they should see NO machines
      if (!bankAssignments || bankAssignments.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      // Filter machines by assigned banks
      const assignedBankIds = bankAssignments.map(a => a.customerBankId);
      whereClause.customerBankId = { in: assignedBankIds };

      // Also filter by pengelolaId to ensure machine is assigned to this pengelola
      // (machines without pengelolaId should not be visible to pengelola)
      whereClause.pengelolaId = pengelolaId;

      // If customerBankId is provided, validate that pengelola has access to this bank
      if (customerBankId) {
        // Verify that pengelola is assigned to this bank
        const hasAccess = assignedBankIds.includes(customerBankId);
        if (!hasAccess) {
          // Pengelola doesn't have access to this bank, return empty result
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }

        whereClause.customerBankId = customerBankId;
      }

      // Users with assigned branches can only see machines in their assigned branches
      const pengelolaUser = await this.prisma.pengelolaUser.findUnique({
        where: { id: userId },
        select: { role: true, assignedBranches: true },
      });

      if (pengelolaUser && pengelolaUser.assignedBranches) {
        try {
          const branches = JSON.parse(pengelolaUser.assignedBranches) as string[];
          whereClause.branchCode = { in: branches };
        } catch (error) {
          // If parsing fails, treat as single branch code
          whereClause.branchCode = pengelolaUser.assignedBranches;
        }
      }
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Search by Serial Number (primary identifier, immutable) or machine code
    // Note: WSID is optional and can change, so not used for search
    let finalWhereClause = whereClause;
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchConditions = {
        OR: [
          { serialNumberManufacturer: { contains: searchTerm.toLowerCase() } },
          { machineCode: { contains: searchTerm.toLowerCase() } },
          { branchCode: { contains: searchTerm.toLowerCase() } },
          { modelName: { contains: searchTerm.toLowerCase() } },
        ],
      };

      // Combine search with existing whereClause using AND
      if (Object.keys(whereClause).length > 0) {
        finalWhereClause = {
          AND: [{ ...whereClause }, searchConditions],
        };
      } else {
        finalWhereClause = searchConditions;
      }
    }

    // Get total count for pagination
    const total = await this.prisma.machine.count({
      where: finalWhereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Fetch machines with pagination (ringan, tanpa loop berat)
    const machines = await this.prisma.machine.findMany({
      where: finalWhereClause,
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
            pengelolaCode: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            problemTickets: true,
            cassettes: true,
          },
        },
      },
      orderBy: this.getOrderBy(sortBy || 'createdAt', sortOrder),
      skip,
      take,
    });

    // Tambahkan cassetteCount dari _count.cassettes supaya frontend tetap bisa menampilkan jumlah kaset
    const machinesWithCassetteCount: any[] = machines.map((m) => ({
      ...m,
      cassetteCount: m._count?.cassettes ?? 0,
    }));

    return {
      data: machinesWithCassetteCount,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): any {
    const validSortFields: Record<string, string> = {
      serialNumber: 'serialNumberManufacturer',
      serialNumberManufacturer: 'serialNumberManufacturer',
      machineCode: 'machineCode',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      branchCode: 'branchCode',
    };

    const field = sortBy && validSortFields[sortBy] ? validSortFields[sortBy] : 'createdAt';
    return { [field]: sortOrder };
  }

  async findOne(id: string, userType: string, pengelolaId?: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        customerBank: true,
        pengelola: true,
        identifierHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        problemTickets: {
          orderBy: { reportedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    // SECURITY: Pengelola users can only access machines assigned to them AND from banks they are assigned to
    if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      // Check if machine is assigned to this pengelola (must match exactly, including null check)
      if (!machine.pengelolaId || machine.pengelolaId !== pengelolaId) {
        throw new ForbiddenException(
          machine.pengelolaId
            ? 'You do not have access to this machine. This machine is assigned to another pengelola.'
            : 'You do not have access to this machine. This machine is not assigned to any pengelola yet.'
        );
      }

      // Check if pengelola has access to the machine's bank
      const bankAssignment = await this.prisma.bankPengelolaAssignment.findFirst({
        where: {
          pengelolaId,
          customerBankId: machine.customerBankId,
          status: 'ACTIVE',
        },
      });

      if (!bankAssignment) {
        throw new ForbiddenException(
          `You do not have access to machines from bank ${machine.customerBank?.bankName || machine.customerBankId}. ` +
          `Please contact your administrator to assign this bank to your pengelola.`
        );
      }
    }

    return machine;
  }

  async create(createMachineDto: CreateMachineDto, userId: string) {
    // Check if machine code already exists
    const existingMachine = await this.prisma.machine.findUnique({
      where: { machineCode: createMachineDto.machineCode },
    });

    if (existingMachine) {
      throw new ConflictException(
        `Machine with code ${createMachineDto.machineCode} already exists`,
      );
    }

    // Verify bank and Pengelola exist
    await Promise.all([
      this.prisma.customerBank.findUniqueOrThrow({
        where: { id: createMachineDto.customerBankId },
      }),
      this.prisma.pengelola.findUniqueOrThrow({
        where: { id: createMachineDto.pengelolaId },
      }),
    ]);

    return this.prisma.machine.create({
      data: createMachineDto as any, // Type assertion needed due to Prisma client type mismatch
      include: {
        customerBank: true,
        pengelola: true,
      },
    });
  }

  async update(id: string, updateMachineDto: UpdateMachineDto, userId: string, userType: string) {
    await this.findOne(id, userType);

    // If updating machine code, check for conflicts
    if (updateMachineDto.machineCode) {
      const existingMachine = await this.prisma.machine.findUnique({
        where: { machineCode: updateMachineDto.machineCode },
      });

      if (existingMachine && existingMachine.id !== id) {
        throw new ConflictException(
          `Machine with code ${updateMachineDto.machineCode} already exists`,
        );
      }
    }

    // Prepare update data - exclude undefined/null/empty values and handle special fields
    const updateData: any = {};
    for (const [key, value] of Object.entries(updateMachineDto)) {
      if (value !== undefined && value !== null) {
        // Handle empty strings - treat as null (don't update)
        if (typeof value === 'string' && value.trim().length === 0) {
          // For optional string fields, set to null if empty
          if (['branchCode', 'city', 'province', 'currentWsid', 'notes'].includes(key)) {
            updateData[key] = null;
          }
          // For other string fields, skip if empty
          continue;
        }

        // Handle pengelolaId - only include if valid (not empty)
        if (key === 'pengelolaId') {
          if (typeof value === 'string' && value.trim().length > 0) {
            updateData[key] = value;
          }
          // If empty, don't include it (keep existing value)
          continue;
        }

        // Handle installationDate - convert date string to Date object
        if (key === 'installationDate') {
          if (typeof value === 'string' && value.trim().length > 0) {
            // If it's just a date (YYYY-MM-DD), convert to Date object
            const dateStr = value.trim();
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // For Date field in Prisma, we can use just the date string
              // Prisma will handle the conversion
              updateData[key] = new Date(dateStr + 'T00:00:00.000Z');
            } else {
              // Already a DateTime string, parse it
              const dateObj = new Date(value);
              if (isNaN(dateObj.getTime())) {
                // Invalid date, skip it
                continue;
              }
              updateData[key] = dateObj;
            }
          } else {
            // Empty date, set to null
            updateData[key] = null;
          }
          continue;
        }

        // For all other fields, include the value
        updateData[key] = value;
      }
    }

    return this.prisma.machine.update({
      where: { id },
      data: updateData,
      include: {
        customerBank: true,
        pengelola: true,
      },
    });
  }

  async updateWsid(id: string, updateWsidDto: UpdateWsidDto, userId: string, username: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      select: { currentWsid: true },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    // Log the change in history
    await this.prisma.machineIdentifierHistory.create({
      data: {
        machineId: id,
        identifierType: 'WSID',
        oldValue: machine.currentWsid,
        newValue: updateWsidDto.newWsid,
        changeReason: updateWsidDto.reason,
        changedBy: username,
      },
    });

    // Update the machine's current WSID
    return this.prisma.machine.update({
      where: { id },
      data: { currentWsid: updateWsidDto.newWsid },
      include: {
        customerBank: true,
        pengelola: true,
      },
    });
  }

  async getIdentifierHistory(identifier: string, type: 'id' | 'serialNumber' = 'serialNumber') {
    let machine: { id: string; serialNumberManufacturer: string; machineCode: string; currentWsid: string | null };

    if (type === 'serialNumber') {
      // Find machine by serial number (SN is the primary identifier, WSID changes frequently)
      const foundMachine = await this.prisma.machine.findFirst({
        where: { serialNumberManufacturer: identifier },
        select: {
          id: true,
          serialNumberManufacturer: true,
          machineCode: true,
          currentWsid: true
        },
      });

      if (!foundMachine) {
        throw new NotFoundException(`Machine with Serial Number "${identifier}" not found`);
      }

      machine = foundMachine;
    } else {
      // Find machine by ID (UUID)
      const foundMachine = await this.prisma.machine.findUnique({
        where: { id: identifier },
        select: {
          id: true,
          serialNumberManufacturer: true,
          machineCode: true,
          currentWsid: true
        },
      });

      if (!foundMachine) {
        throw new NotFoundException(`Machine with ID "${identifier}" not found`);
      }

      machine = foundMachine;
    }

    // Get identifier history for the machine
    const history = await this.prisma.machineIdentifierHistory.findMany({
      where: { machineId: machine.id },
      orderBy: { changedAt: 'desc' },
    });

    return {
      machine: {
        id: machine.id,
        serialNumber: machine.serialNumberManufacturer,
        machineCode: machine.machineCode,
        currentWsid: machine.currentWsid,
      },
      history,
    };
  }

  async remove(id: string, userType: string) {
    // Only super admin can delete machines
    if (userType !== 'HITACHI') {
      throw new ForbiddenException('Only Hitachi Super Admin can delete machines');
    }

    await this.findOne(id, userType);

    // Note: Machine can be deleted without checking cassettes since cassettes don't have currentMachineId anymore

    return this.prisma.machine.delete({
      where: { id },
    });
  }

  async getMachineStatistics(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        problemTickets: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    // Get cassette statistics separately since cassettes relation was removed
    const [okCassettesCount, badCassettesCount] = await Promise.all([
      this.prisma.cassette.count({ where: { customerBankId: machine.customerBankId, status: 'OK' as any } }),
      this.prisma.cassette.count({ where: { customerBankId: machine.customerBankId, status: 'BAD' as any } }),
    ]);

    const openTickets = machine.problemTickets.filter(t => t.status === 'OPEN').length;
    const criticalTickets = machine.problemTickets.filter(
      t => t.priority === 'CRITICAL' && t.status !== 'CLOSED',
    ).length;

    return {
      machineId: machine.id,
      machineCode: machine.machineCode,
      status: machine.status,
      okCassettes: okCassettesCount,
      badCassettes: badCassettesCount,
      totalProblemTickets: machine.problemTickets.length,
      openTickets,
      criticalTickets,
    };
  }

  async getDashboardStats(userType: string, pengelolaId?: string, customerBankId?: string) {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Filter by Pengelola if not admin
    const whereClause: any = {};
    const cassetteWhereClause: any = {};
    
    if (userType === 'BANK' && customerBankId) {
      // BANK users can only see machines and cassettes from their own bank
      whereClause.customerBankId = customerBankId;
      cassetteWhereClause.customerBankId = customerBankId;
    } else if (userType !== 'HITACHI' && pengelolaId) {
      whereClause.pengelolaId = pengelolaId;
    }

    // Recent tickets where clause
    const ticketWhere = userType !== 'HITACHI' && pengelolaId ? {
      reporter: {
        pengelolaId: pengelolaId,
      },
    } : userType === 'BANK' && customerBankId ? {
      machine: {
        customerBankId: customerBankId,
      },
    } : {};

    this.logger.debug(`Dashboard getDashboardStats: userType=${userType}, pengelolaId=${pengelolaId}, customerBankId=${customerBankId}`);

    // Basic counts
    const [
      totalMachines,
      totalCassettes,
      totalBanks,
      totalVendors,
      machinesLastMonth,
      cassettesLastMonth,
      machinesByStatus,
      cassettesByStatus,
      topBanks,
      recentTickets,
      criticalTickets,
      longRepairs,
      badCassettes,
      totalTickets,
      ticketsByStatus,
      ticketsByPriority,
    ] = await Promise.all([
      // Total counts
      this.prisma.machine.count({ where: whereClause }),
      // Exclude SCRAPPED cassettes from total count
      this.prisma.cassette.count({
        where: {
          status: {
            not: 'SCRAPPED',
          },
          ...cassetteWhereClause,
        },
      }),
      this.prisma.customerBank.count(),
      this.prisma.pengelola.count(),

      // Last month counts for trends
      this.prisma.machine.count({
        where: {
          ...whereClause,
          createdAt: { lt: lastMonth },
        },
      }),
      // Exclude SCRAPPED cassettes from last month count
      this.prisma.cassette.count({
        where: {
          status: {
            not: 'SCRAPPED',
          },
          createdAt: { lt: lastMonth },
          ...cassetteWhereClause,
        },
      }),

      // Status breakdowns
      this.prisma.machine.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      // Exclude SCRAPPED cassettes from status breakdown
      this.prisma.cassette.groupBy({
        by: ['status'],
        where: {
          status: {
            not: 'SCRAPPED',
          },
          ...cassetteWhereClause,
        },
        _count: true,
      }),

      // Top 5 banks by machine count
      this.prisma.machine.groupBy({
        by: ['customerBankId'],
        where: whereClause,
        _count: true,
        orderBy: {
          _count: {
            customerBankId: 'desc',
          },
        },
        take: 5,
      }),

      // Recent tickets - last 15 tickets
      this.prisma.problemTicket.findMany({
        where: ticketWhere,
        orderBy: { updatedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          reportedAt: true,
          cassette: {
            select: {
              serialNumber: true,
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
        },
      }),

      // Critical alerts - open critical tickets
      this.prisma.problemTicket.count({
        where: {
          priority: 'CRITICAL',
          status: 'OPEN',
          machine: whereClause.pengelolaId ? { pengelolaId: whereClause.pengelolaId } : undefined,
        },
      }),

      // Machines in repair > 7 days
      this.prisma.machine.count({
        where: {
          ...whereClause,
          status: 'UNDER_REPAIR',
          updatedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Cassettes with BAD status
      this.prisma.cassette.count({
        where: {
          status: 'BAD',
          ...cassetteWhereClause,
        },
      }),

      // Tickets analytics (respecting ticketWhere filter)
      this.prisma.problemTicket.count({
        where: ticketWhere,
      }),
      this.prisma.problemTicket.groupBy({
        by: ['status'],
        where: ticketWhere,
        _count: true,
      }),
      this.prisma.problemTicket.groupBy({
        by: ['priority'],
        where: ticketWhere,
        _count: true,
      }),
    ]);

    // Calculate trends
    const machineTrend = machinesLastMonth > 0
      ? ((totalMachines - machinesLastMonth) / machinesLastMonth * 100).toFixed(1)
      : '0';
    const cassetteTrend = cassettesLastMonth > 0
      ? ((totalCassettes - cassettesLastMonth) / cassettesLastMonth * 100).toFixed(1)
      : '0';

    // Format status breakdowns
    const machineStatusMap: any = {};
    machinesByStatus.forEach(item => {
      machineStatusMap[item.status] = item._count;
    });

    const cassetteStatusMap: any = {};
    cassettesByStatus.forEach(item => {
      cassetteStatusMap[item.status] = item._count;
    });

    const ticketStatusMap: any = {};
    ticketsByStatus.forEach(item => {
      ticketStatusMap[item.status] = item._count;
    });

    const ticketPriorityMap: any = {};
    ticketsByPriority.forEach(item => {
      ticketPriorityMap[item.priority] = item._count;
    });

    // Get bank details for top banks
    const bankIds = topBanks.map(b => b.customerBankId).filter(Boolean);
    const bankDetails = await this.prisma.customerBank.findMany({
      where: { id: { in: bankIds } },
      select: { id: true, bankName: true, bankCode: true },
    });

    const topBanksWithNames = topBanks.map(bank => {
      const details = bankDetails.find(b => b.id === bank.customerBankId);
      return {
        bankId: bank.customerBankId,
        bankName: details?.bankName || 'Unknown',
        branchName: details?.bankCode || '-',
        machineCount: bank._count,
      };
    });

    // Health score calculation
    const totalOperational = (machineStatusMap.OPERATIONAL || 0);
    const healthScore = totalMachines > 0
      ? ((totalOperational / totalMachines) * 100).toFixed(1)
      : '0';

    let ticketUsageByCassetteAndPengelola: {
      pengelolaId: string;
      pengelolaName: string;
      cassetteSerialNumber: string;
      openTickets: number;
    }[] = [];

    if (userType === 'HITACHI') {
      try {
        ticketUsageByCassetteAndPengelola = await this.prisma.$queryRaw<
          {
            pengelolaId: string;
            pengelolaName: string;
            cassetteSerialNumber: string;
            openTickets: number;
          }[]
        >`
          WITH ticket_cassettes AS (
            -- Single cassette tickets (where cassette is primary)
            SELECT DISTINCT t.id AS ticket_id, t.reported_by, t.cassette_id
            FROM problem_tickets t
            WHERE t.cassette_id IS NOT NULL
              AND t.deleted_at IS NULL
            UNION
            -- Multi-cassette tickets (where cassette is in details)
            SELECT DISTINCT t.id AS ticket_id, t.reported_by, d.cassette_id
            FROM ticket_cassette_details d
            JOIN problem_tickets t ON d.ticket_id = t.id
            WHERE d.cassette_id IS NOT NULL
              AND t.deleted_at IS NULL
          )
          SELECT 
            pu.pengelola_id AS pengelolaId,
            pe.company_name AS pengelolaName,
            c.serial_number AS cassetteSerialNumber,
            CAST(COUNT(DISTINCT tc.ticket_id) AS SIGNED) AS openTickets
          FROM ticket_cassettes tc
          JOIN pengelola_users pu ON tc.reported_by = pu.id
          JOIN pengelola pe ON pu.pengelola_id = pe.id
          JOIN cassettes c ON tc.cassette_id = c.id
          GROUP BY pu.pengelola_id, pe.company_name, c.serial_number
          ORDER BY COUNT(DISTINCT tc.ticket_id) DESC
          LIMIT 50
        `;
      } catch (error) {
        this.logger.error('Error generating ticketUsageByCassetteAndPengelola analytics', error.stack);
        ticketUsageByCassetteAndPengelola = [];
      }
    }

    let repairUsageByCassette: {
      cassetteSerialNumber: string;
      repairCount: number;
    }[] = [];

    if (userType === 'HITACHI') {
      try {
        repairUsageByCassette = await this.prisma.$queryRaw<
          {
            cassetteSerialNumber: string;
            repairCount: number;
          }[]
        >`
          SELECT 
            c.serial_number AS cassetteSerialNumber,
            CAST(COUNT(*) AS SIGNED) AS repairCount
          FROM repair_tickets r
          JOIN cassettes c ON r.cassette_id = c.id
          WHERE r.cassette_id IS NOT NULL
          GROUP BY c.serial_number
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
      } catch (error) {
        this.logger.error('Error generating repairUsageByCassette analytics', error.stack);
        repairUsageByCassette = [];
      }
    }

    // Format recent activities
    const recentActivities = (() => {
      this.logger.debug(`Dashboard: Processing ${recentTickets?.length || 0} recentTickets`);
      if (recentTickets && recentTickets.length > 0) {
      }

      if (!recentTickets || recentTickets.length === 0) {
        return [];
      }

      const formattedActivities = recentTickets.map(ticket => {
        const statusLabels: Record<string, string> = {
          'OPEN': 'Dibuka',
          'IN_DELIVERY': 'Dikirim ke RC',
          'RECEIVED': 'Diterima di RC',
          'IN_PROGRESS': 'Sedang Diperbaiki',
          'RESOLVED': 'Selesai Diperbaiki',
          'CLOSED': 'Ditutup',
        };

        const priorityLabels: Record<string, string> = {
          'CRITICAL': 'Kritis',
          'HIGH': 'Tinggi',
          'MEDIUM': 'Sedang',
          'LOW': 'Rendah',
        };

        const activityType = ticket.status === 'OPEN' || ticket.status === 'IN_DELIVERY'
          ? 'ticket_created'
          : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
            ? 'ticket_resolved'
            : 'ticket_updated';

        return {
          type: activityType,
          description: `SO ${ticket.ticketNumber || ticket.id.substring(0, 8)}: ${ticket.title || 'No title'}`,
          details: `${statusLabels[ticket.status] || ticket.status} • ${priorityLabels[ticket.priority] || ticket.priority}${ticket.cassette ? ` • ${ticket.cassette.serialNumber}` : ''}${ticket.reporter ? ` • ${ticket.reporter.fullName}` : ''}`,
          timestamp: ticket.updatedAt || ticket.createdAt,
          ticketId: ticket.id,
        };
      });

      this.logger.debug(`Dashboard: Found ${recentTickets.length} recent tickets, formatted ${formattedActivities.length} activities`);

      return formattedActivities;
    })();

    const result = {
      // Basic stats
      totalMachines,
      totalCassettes,
      totalBanks,
      totalVendors,

      // Trends
      machineTrend: parseFloat(machineTrend),
      cassetteTrend: parseFloat(cassetteTrend),

      // Status breakdowns
      machineStatus: {
        operational: machineStatusMap.OPERATIONAL || 0,
        underRepair: machineStatusMap.UNDER_REPAIR || 0,
        inactive: machineStatusMap.INACTIVE || 0,
      },
      cassetteStatus: {
        ok: cassetteStatusMap.OK || 0,
        bad: cassetteStatusMap.BAD || 0,
        inTransit: cassetteStatusMap.IN_TRANSIT_TO_RC || 0,
        inRepair: cassetteStatusMap.IN_REPAIR || 0,
      },

      // Health score
      healthScore: parseFloat(healthScore),

      // Top banks
      topBanks: topBanksWithNames,

      ticketStats: {
        total: totalTickets,
        byStatus: {
          OPEN: ticketStatusMap.OPEN || 0,
          IN_DELIVERY: ticketStatusMap.IN_DELIVERY || 0,
          RECEIVED: ticketStatusMap.RECEIVED || 0,
          IN_PROGRESS: ticketStatusMap.IN_PROGRESS || 0,
          RESOLVED: ticketStatusMap.RESOLVED || 0,
          CLOSED: ticketStatusMap.CLOSED || 0,
        },
        byPriority: {
          LOW: ticketPriorityMap.LOW || 0,
          MEDIUM: ticketPriorityMap.MEDIUM || 0,
          HIGH: ticketPriorityMap.HIGH || 0,
          CRITICAL: ticketPriorityMap.CRITICAL || 0,
        },
      },

      ticketUsageByCassetteAndPengelola,

      repairUsageByCassette,

      // Recent activities - tickets
      recentActivities,

      // Critical alerts
      alerts: {
        criticalTickets,
        longRepairs,
        badCassettes,
      },
    };

    this.logger.debug(`Dashboard: Returning result with ${result.recentActivities.length} recentActivities`);

    return result;
  }

  /**
   * Delete a machine (Super Admin only)
   * Note: This is a hard delete. Consider adding soft delete if needed.
   * Before deleting, check if machine has active cassettes or repair tickets.
   */
  async delete(id: string, userId: string, userRole: string) {
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete machines');
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        cassettes: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    // Check if machine has active cassettes
    // Query cassettes directly to ensure we get all related cassettes
    const allCassettes = await this.prisma.cassette.findMany({
      where: { machineId: id },
      select: {
        id: true,
        serialNumber: true,
        status: true,
      },
    });

    const activeCassettes = allCassettes.filter(
      (c) => c.status !== 'SCRAPPED',
    );

    if (activeCassettes.length > 0) {
      throw new BadRequestException(
        `Cannot delete machine. It has ${activeCassettes.length} active cassette(s): ${activeCassettes.map(c => c.serialNumber).join(', ')}. Please remove or scrap all cassettes first.`,
      );
    }

    // Delete machine
    return this.prisma.machine.delete({
      where: { id },
    });
  }

  async bulkAssignMachines(pengelolaId: string, machineIds: string[], userId: string) {
    // Verify pengelola exists
    const pengelola = await this.prisma.pengelola.findUnique({
      where: { id: pengelolaId },
    });

    if (!pengelola) {
      throw new NotFoundException(`Pengelola with ID ${pengelolaId} not found`);
    }

    // Verify all machines exist and get their bank IDs
    const machines = await this.prisma.machine.findMany({
      where: { id: { in: machineIds } },
      select: {
        id: true,
        machineCode: true,
        serialNumberManufacturer: true,
        customerBankId: true,
      },
    });

    if (machines.length !== machineIds.length) {
      const foundIds = machines.map(m => m.id);
      const missingIds = machineIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Some machines not found: ${missingIds.join(', ')}`);
    }

    // Get unique bank IDs from machines
    const bankIds = [...new Set(machines.map(m => m.customerBankId).filter(Boolean))];

    // Create or update bank-pengelola assignments for all banks
    const assignmentPromises = bankIds.map(bankId =>
      this.prisma.bankPengelolaAssignment.upsert({
        where: {
          customerBankId_pengelolaId: {
            customerBankId: bankId,
            pengelolaId,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          customerBankId: bankId,
          pengelolaId,
          status: 'ACTIVE',
        },
      })
    );

    // Update all machines and create assignments in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Create/update bank-pengelola assignments
      await Promise.all(assignmentPromises);

      // Update all machines
      await tx.machine.updateMany({
        where: { id: { in: machineIds } },
        data: { pengelolaId },
      });
    });

    const result = { count: machines.length };

    this.logger.log(`Bulk assigned ${result.count} machines to pengelola ${pengelola.companyName} (${pengelola.pengelolaCode}) and created ${bankIds.length} bank assignment(s) by user ${userId}`);

    return {
      success: true,
      assignedCount: result.count,
      pengelola: {
        id: pengelola.id,
        companyName: pengelola.companyName,
        pengelolaCode: pengelola.pengelolaCode,
      },
      machines: machines.map(m => ({
        id: m.id,
        machineCode: m.machineCode,
        serialNumberManufacturer: m.serialNumberManufacturer,
      })),
      bankAssignmentsCreated: bankIds.length,
    };
  }

  async distributeMachines(pengelolaIds: string[], customerBankId?: string, userId?: string) {
    // Verify all pengelola exist
    const pengelolaList = await this.prisma.pengelola.findMany({
      where: { id: { in: pengelolaIds } },
      select: { id: true, companyName: true, pengelolaCode: true },
    });

    if (pengelolaList.length !== pengelolaIds.length) {
      const foundIds = pengelolaList.map(p => p.id);
      const missingIds = pengelolaIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Some pengelola not found: ${missingIds.join(', ')}`);
    }

    // Get all unassigned machines (or from specific bank)
    const whereClause: any = {
      pengelolaId: null, // Only unassigned machines
    };

    if (customerBankId) {
      whereClause.customerBankId = customerBankId;
    }

    const unassignedMachines = await this.prisma.machine.findMany({
      where: whereClause,
      select: { id: true, machineCode: true, serialNumberManufacturer: true, customerBankId: true },
      orderBy: { createdAt: 'asc' }, // Distribute in order
    });

    if (unassignedMachines.length === 0) {
      throw new BadRequestException('No unassigned machines found' + (customerBankId ? ' for this bank' : ''));
    }

    // Distribute machines evenly
    const machinesPerPengelola = Math.floor(unassignedMachines.length / pengelolaIds.length);
    const remainder = unassignedMachines.length % pengelolaIds.length;

    const assignments: Array<{ pengelolaId: string; machineIds: string[] }> = [];
    let machineIndex = 0;

    for (let i = 0; i < pengelolaIds.length; i++) {
      const pengelolaId = pengelolaIds[i];
      const count = machinesPerPengelola + (i < remainder ? 1 : 0); // Distribute remainder to first pengelola
      const machineIds = unassignedMachines.slice(machineIndex, machineIndex + count).map(m => m.id);

      if (machineIds.length > 0) {
        assignments.push({ pengelolaId, machineIds });
        machineIndex += count;
      }
    }

    // Execute assignments in a transaction
    const results: Array<{
      pengelolaId: string;
      pengelola: { id: string; companyName: string; pengelolaCode: string } | undefined;
      assignedCount: number;
      machineIds: string[];
      bankAssignmentsCreated: number;
    }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        // Get bank IDs for machines in this assignment
        const assignmentMachines = unassignedMachines.filter(m =>
          assignment.machineIds.includes(m.id)
        );
        const bankIds = [...new Set(assignmentMachines.map(m => m.customerBankId).filter(Boolean))];

        // Create or update bank-pengelola assignments for this pengelola
        const assignmentPromises = bankIds.map(bankId =>
          tx.bankPengelolaAssignment.upsert({
            where: {
              customerBankId_pengelolaId: {
                customerBankId: bankId,
                pengelolaId: assignment.pengelolaId,
              },
            },
            update: { status: 'ACTIVE' },
            create: {
              customerBankId: bankId,
              pengelolaId: assignment.pengelolaId,
              status: 'ACTIVE',
            },
          })
        );

        await Promise.all(assignmentPromises);

        // Update machines
        const result = await tx.machine.updateMany({
          where: { id: { in: assignment.machineIds } },
          data: { pengelolaId: assignment.pengelolaId },
        });

        results.push({
          pengelolaId: assignment.pengelolaId,
          pengelola: pengelolaList.find(p => p.id === assignment.pengelolaId),
          assignedCount: result.count,
          machineIds: assignment.machineIds,
          bankAssignmentsCreated: bankIds.length,
        });
      }
    });

    this.logger.log(`Distributed ${unassignedMachines.length} machines to ${pengelolaIds.length} pengelola and created bank assignments by user ${userId}`);

    return {
      success: true,
      totalMachines: unassignedMachines.length,
      totalPengelola: pengelolaIds.length,
      machinesPerPengelola,
      remainder,
      assignments: results,
    };
  }

  async unassignMachines(pengelolaId?: string, customerBankId?: string, machineIds?: string[], userId?: string) {
    const whereClause: any = {};

    // If specific machine IDs provided, only unassign those
    if (machineIds && machineIds.length > 0) {
      whereClause.id = { in: machineIds };
    } else {
      // Otherwise, filter by pengelolaId or customerBankId
      if (pengelolaId) {
        whereClause.pengelolaId = pengelolaId;
      } else {
        // If no pengelolaId specified, unassign all machines (pengelolaId is not null)
        whereClause.pengelolaId = { not: null };
      }

      if (customerBankId) {
        whereClause.customerBankId = customerBankId;
      }
    }

    // Get machines that will be unassigned (for logging)
    const machinesToUnassign = await this.prisma.machine.findMany({
      where: whereClause,
      select: { id: true, machineCode: true, serialNumberManufacturer: true, pengelolaId: true, customerBankId: true },
    });

    if (machinesToUnassign.length === 0) {
      throw new BadRequestException('No machines found to unassign' +
        (pengelolaId ? ` for pengelola ${pengelolaId}` : '') +
        (customerBankId ? ` for bank ${customerBankId}` : ''));
    }

    // Unassign machines (set pengelolaId to null)
    const result = await this.prisma.machine.updateMany({
      where: whereClause,
      data: { pengelolaId: null },
    });

    this.logger.log(`Unassigned ${result.count} machine(s) by user ${userId}` +
      (pengelolaId ? ` from pengelola ${pengelolaId}` : '') +
      (customerBankId ? ` from bank ${customerBankId}` : ''));

    return {
      success: true,
      unassignedCount: result.count,
      machines: machinesToUnassign.map(m => ({
        id: m.id,
        machineCode: m.machineCode,
        serialNumberManufacturer: m.serialNumberManufacturer,
        previousPengelolaId: m.pengelolaId,
      })),
    };
  }

  async getMachineCassettes(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    return this.prisma.cassette.findMany({
      where: { machineId: id },
      include: {
        cassetteType: true,
      },
    });
  }
}

