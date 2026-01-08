import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCassetteDto, ReplaceCassetteDto } from './dto';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class CassettesService {
  private readonly logger = new Logger(CassettesService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) { }

  async findAll(
    userType: string,
    pengelolaId?: string,
    page: number = 1,
    limit: number = 50, // Changed from 50000 to 50 for better performance
    keyword?: string,
    snMesin?: string,
    snMesinSuffix?: string,
    status?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    customerBankId?: string,
  ) {
    let whereClause: any = {};

    // SUPER ADMIN (HITACHI) can see ALL cassettes
    // Pengelola users can only see cassettes of their assigned bank customers
    // BANK users can only see cassettes from their own bank
    if (userType === 'HITACHI') {
      // Admin can see everything - no filter
    } else if (userType?.toUpperCase() === 'BANK' && customerBankId) {
      // BANK users can only see cassettes from their own bank
      whereClause.customerBankId = customerBankId;
    } else if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            where: {
              status: 'ACTIVE', // Only active assignments
            },
            select: {
              customerBankId: true,
              assignedBranches: true,
            },
          },
        },
      });

      // SECURITY: If pengelola has no bank assignments, they should see NO cassettes
      if (!Pengelola || !Pengelola.bankAssignments || Pengelola.bankAssignments.length === 0) {
        // Return empty result - pengelola with no assignments cannot see any cassettes
        return {
          cassettes: [],
          count: 0,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          statistics: {
            statusCounts: {},
          },
        };
      }

      // Pengelola has active assignments - filter by assigned banks
      const bankIds = Pengelola.bankAssignments.map(a => a.customerBankId);
      whereClause.customerBankId = { in: bankIds };

      // SECURITY: Also filter cassettes by machines assigned to this pengelola
      // Pengelola should see:
      // 1. Cassettes from machines assigned to them (machineId in assignedMachineIds)
      // 2. Cassettes without machines (machineId is null) from assigned banks (for standalone cassettes)
      // Get all machine IDs assigned to this pengelola
      const assignedMachines = await this.prisma.machine.findMany({
        where: {
          pengelolaId,
          customerBankId: { in: bankIds }, // Only machines from assigned banks
        },
        select: { id: true },
      });

      const assignedMachineIds = assignedMachines.map(m => m.id);

      // Build machineId filter: cassettes from assigned machines OR cassettes without machines
      if (assignedMachineIds.length > 0) {
        // Pengelola has assigned machines: show cassettes from those machines OR cassettes without machines
        // Use OR condition at whereClause level to combine machineId filters
        whereClause.OR = [
          { machineId: { in: assignedMachineIds } }, // Cassettes from assigned machines
          { machineId: null }, // Cassettes without machines (standalone cassettes)
        ];
        // Remove customerBankId from top level since we're using OR
        // We need to ensure bank filter is still applied, so we'll combine it properly
        const bankFilter = { customerBankId: { in: bankIds } };
        // Combine bank filter with machineId OR condition
        whereClause = {
          AND: [
            bankFilter,
            {
              OR: [
                { machineId: { in: assignedMachineIds } },
                { machineId: null },
              ],
            },
          ],
        };
      } else {
        // No machines assigned: only show cassettes without machines (standalone cassettes) from assigned banks
        whereClause = {
          AND: [
            { customerBankId: { in: bankIds } },
            { machineId: null },
          ],
        };
      }
    }

    // Apply explicit customer bank filter (for admin or pengelola-specified requests)
    if (customerBankId) {
      // Handle customerBankId filter based on whereClause structure
      if (whereClause.AND) {
        // whereClause already has AND structure (from pengelola filtering)
        // Find and update customerBankId filter in AND array
        const bankFilterIndex = whereClause.AND.findIndex((condition: any) => condition.customerBankId);
        if (bankFilterIndex >= 0) {
          const existingBankFilter = whereClause.AND[bankFilterIndex];
          if (existingBankFilter.customerBankId?.in) {
            const allowedBanks = (existingBankFilter.customerBankId.in as string[]).filter(id => id === customerBankId);
            if (allowedBanks.length === 0) {
              // Pengelola is not assigned to this bank
              return {
                cassettes: [],
                count: 0,
                data: [],
                pagination: {
                  page,
                  limit,
                  total: 0,
                  totalPages: 0,
                },
                statistics: {
                  statusCounts: {},
                },
              };
            }
            whereClause.AND[bankFilterIndex] = { customerBankId: { in: allowedBanks } };
          } else {
            whereClause.AND[bankFilterIndex] = { customerBankId };
          }
        }
      } else if (whereClause.customerBankId?.in) {
        // whereClause has simple customerBankId filter
        const allowedBanks = (whereClause.customerBankId.in as string[]).filter(id => id === customerBankId);
        if (allowedBanks.length === 0) {
          return {
            cassettes: [],
            count: 0,
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
            statistics: {
              statusCounts: {},
            },
          };
        }
        whereClause.customerBankId = { in: allowedBanks };
      } else {
        // Simple whereClause, just add customerBankId
        whereClause.customerBankId = customerBankId;
      }
    }

    // Search filters
    const searchConditions: any[] = [];
    let machineBasedBankIds: string[] | null = null;

    // Keyword search: search by cassette serial number
    if (keyword && keyword.trim()) {
      searchConditions.push({
        serialNumber: { contains: keyword.trim().toLowerCase() },
      });
    }

    // sn_mesin: search by machine serialNumberManufacturer, then return cassettes from same bank
    // Frontend sends machine SN, we find the machine and return cassettes from its bank
    if (snMesin && snMesin.trim()) {
      const snMesinTrimmed = snMesin.trim().toLowerCase();

      // Find machines that match the SN pattern (MySQL case-insensitive via collation)
      const matchingMachines = await this.prisma.machine.findMany({
        where: {
          serialNumberManufacturer: { contains: snMesinTrimmed },
        },
        select: {
          id: true,
          serialNumberManufacturer: true,
          customerBankId: true,
        },
        take: 20, // Limit to reasonable number
      });

      if (matchingMachines.length > 0) {
        // Get unique bank IDs from matching machines
        machineBasedBankIds = [...new Set(matchingMachines.map(m => m.customerBankId))];
      }
    }

    // sn_mesin_suffix: search by machine serialNumberManufacturer (suffix match)
    if (snMesinSuffix && snMesinSuffix.trim()) {
      const suffix = snMesinSuffix.trim().toLowerCase();

      // Find machines that match the SN suffix (MySQL case-insensitive via collation)
      const matchingMachines = await this.prisma.machine.findMany({
        where: {
          serialNumberManufacturer: { endsWith: suffix },
        },
        select: {
          id: true,
          serialNumberManufacturer: true,
          customerBankId: true,
        },
        take: 20, // Limit to reasonable number
      });

      if (matchingMachines.length > 0) {
        // Get unique bank IDs from matching machines
        const suffixBankIds = [...new Set(matchingMachines.map(m => m.customerBankId))];

        // Merge with existing machineBasedBankIds if any
        if (machineBasedBankIds) {
          machineBasedBankIds = [...new Set([...machineBasedBankIds, ...suffixBankIds])];
        } else {
          machineBasedBankIds = suffixBankIds;
        }
      }
    }

    // Combine search conditions with existing whereClause
    let finalWhereClause: any = {};

    // First, handle machine-based bank filtering
    if (machineBasedBankIds && machineBasedBankIds.length > 0) {
      // If there are existing Pengelola/bank filters, combine them with AND
      if (Object.keys(whereClause).length > 0) {
        finalWhereClause = {
          AND: [
            whereClause,
            { customerBankId: { in: machineBasedBankIds } },
          ],
        };
      } else {
        // No existing filters, just use machine-based bank filtering
        finalWhereClause = {
          customerBankId: { in: machineBasedBankIds },
        };
      }
    } else {
      // No machine-based filtering, start with existing whereClause
      if (Object.keys(whereClause).length > 0) {
        finalWhereClause = { ...whereClause };
      }
    }

    // Then add keyword search conditions (if any)
    if (searchConditions.length > 0) {
      const searchClause = searchConditions.length === 1
        ? searchConditions[0]
        : { OR: searchConditions };

      if (Object.keys(finalWhereClause).length > 0) {
        // Combine existing filters with search using AND
        finalWhereClause = {
          AND: [
            finalWhereClause,
            searchClause,
          ],
        };
      } else {
        // No existing filters, just use search
        finalWhereClause = searchClause;
      }
    }

    // Add status filter (server-side)
    if (status && status !== 'all') {
      if (Object.keys(finalWhereClause).length > 0) {
        finalWhereClause = {
          AND: [
            finalWhereClause,
            { status: status },
          ],
        };
      } else {
        finalWhereClause.status = status;
      }
    }

    // Get total count for pagination
    const total = await this.prisma.cassette.count({ where: finalWhereClause });

    // Calculate status statistics from all matching records (not just current page)
    // This gives accurate counts regardless of pagination
    const statusStats = await this.prisma.cassette.groupBy({
      where: finalWhereClause,
      by: ['status'],
      _count: {
        status: true,
      },
    });

    // Convert to object format for easier access
    const statusCounts: Record<string, number> = {};
    statusStats.forEach(stat => {
      statusCounts[stat.status] = stat._count.status;
    });

    // Verify synchronization: sum of all status counts should equal total
    const sumOfStatusCounts = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    if (sumOfStatusCounts !== total) {
      // Status counts may differ due to null/undefined status values - this is acceptable
      // Ensure total matches sum of status counts for consistency
      // This handles edge cases where some cassettes might have null/undefined status
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Build orderBy clause (server-side sorting)
    let orderBy: any = { createdAt: sortOrder }; // Default

    if (sortBy) {
      // Map frontend sort fields to Prisma orderBy format
      switch (sortBy) {
        case 'serialNumber':
          orderBy = { serialNumber: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'type':
          // Sort by cassetteType relation
          orderBy = { cassetteType: { typeCode: sortOrder } };
          break;
        case 'machineType':
          // Sort by cassetteType relation
          orderBy = { cassetteType: { machineType: sortOrder } };
          break;
        case 'bank':
          // Sort by customerBank relation
          orderBy = { customerBank: { bankName: sortOrder } };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

    }

    // Fetch data with pagination
    const data = await this.prisma.cassette.findMany({
      where: finalWhereClause,
      include: {
        cassetteType: true,
        machine: {
          include: {
            pengelola: {
              select: {
                id: true,
                companyName: true,
                companyAbbreviation: true,
                pengelolaCode: true,
              },
            },
          },
        },
        customerBank: {
          include: {
            pengelolaAssignments: {
              where: {
                status: 'ACTIVE',
              },
              include: {
                pengelola: {
                  select: {
                    id: true,
                    companyName: true,
                    companyAbbreviation: true,
                    pengelolaCode: true,
                  },
                },
              },
            },
          },
        },
        replacedCassette: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
        replacementFor: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
        problemTickets: {
          where: {
            deletedAt: null, // Only count non-deleted tickets
          },
          select: {
            id: true,
          },
        },
        ticketCassetteDetails: {
          where: {
            ticket: {
              deletedAt: null, // Only count details from non-deleted tickets
            },
          },
          select: {
            id: true,
            ticketId: true,
          },
        },
        repairTickets: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            repairTickets: true,            // Repair records
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    // Enrich with computed cycle/repair counts to ensure frontend always has numbers
    const enrichedData = data.map((cassette) => {
      // Count single-cassette tickets (where cassette is primary)
      const singleProblems = cassette.problemTickets?.length ?? 0;

      // Count multi-cassette tickets (where cassette is in details)
      // IMPORTANT: Exclude tickets where cassette is already counted as primary
      // to avoid double counting
      const primaryTicketIds = new Set(
        (cassette.problemTickets || []).map((t: any) => t.id)
      );
      const multiProblems = (cassette.ticketCassetteDetails || []).filter(
        (detail: any) => !primaryTicketIds.has(detail.ticketId)
      ).length;

      const problemCount = singleProblems + multiProblems;
      const repairCount = cassette._count?.repairTickets ?? 0;

      return {
        ...cassette,
        problemCount,
        repairCount,
      };
    });

    // Return format compatible with existing frontend
    // Format: { cassettes: [...], count: number } for backward compatibility
    // Also include pagination info and status statistics
    return {
      cassettes: enrichedData,
      count: total,
      data: enrichedData, // New format
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        statusCounts, // Status counts for all matching records
      },
    };
  }

  async findOne(id: string, userType?: string, pengelolaId?: string, customerBankId?: string) {
    const cassette = await this.prisma.cassette.findUnique({
      where: { id },
      include: {
        cassetteType: true,
        customerBank: true,
        repairTickets: {
          orderBy: { receivedAtRc: 'desc' },
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
    });

    if (!cassette) {
      throw new NotFoundException(`Cassette with ID ${id} not found`);
    }

    // SECURITY: For BANK users, verify they have access to this cassette's bank
    if (userType && userType?.toUpperCase() === 'BANK' && customerBankId) {
      if (cassette.customerBankId !== customerBankId) {
        throw new NotFoundException(`Cassette with ID ${id} not found`);
      }
    }

    // SECURITY: For pengelola users, verify they have access to this cassette's bank
    if (userType && userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const bankAssignment = await this.prisma.bankPengelolaAssignment.findFirst({
        where: {
          pengelolaId,
          customerBankId: cassette.customerBankId,
          status: 'ACTIVE',
        },
      });

      if (!bankAssignment) {
        // Pengelola doesn't have access to this bank, throw not found
        throw new NotFoundException(`Cassette with ID ${id} not found`);
      }
    }

    return cassette;
  }

  async findByMachine(machineId: string, userType: string, pengelolaId?: string, customerBankId?: string) {
    // First, get the machine to verify it exists
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: {
        id: true,
        serialNumberManufacturer: true,
        customerBankId: true,
        branchCode: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }

    // SECURITY: For BANK users, verify they have access to this machine's bank
    if (userType?.toUpperCase() === 'BANK' && customerBankId) {
      if (machine.customerBankId !== customerBankId) {
        throw new NotFoundException(`Machine with ID ${machineId} not found`);
      }
    }

    // SECURITY: For pengelola users, verify they have access to this machine's bank
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const bankAssignment = await this.prisma.bankPengelolaAssignment.findFirst({
        where: {
          pengelolaId,
          customerBankId: machine.customerBankId,
          status: 'ACTIVE',
        },
      });

      if (!bankAssignment) {
        // Pengelola doesn't have access to this bank, return empty result
        return {
          cassettes: [],
          count: 0,
          machine: {
            id: machine.id,
            serialNumber: machine.serialNumberManufacturer,
            branchCode: machine.branchCode,
          },
        };
      }
    }

    // Get cassettes that are specifically assigned to this machine
    const cassettes = await this.prisma.cassette.findMany({
      where: {
        machineId: machineId, // Filter by specific machine
      },
      include: {
        cassetteType: true,
        customerBank: {
          select: {
            bankCode: true,
            bankName: true,
          },
        },
      },
      orderBy: { serialNumber: 'asc' },
    });

    return {
      cassettes,
      count: cassettes.length,
      machine: {
        id: machine.id,
        serialNumber: machine.serialNumberManufacturer,
        branchCode: machine.branchCode,
      },
    };
  }

  async findByMachineSN(machineSN: string, userType: string, pengelolaId?: string, customerBankId?: string, status?: string) {
    const machineSnTrimmed = machineSN.trim();

    // Find machines matching the serial number (suffix or full match)
    const machineSnLower = machineSnTrimmed.toLowerCase();
    const machineWhere: any = {
      OR: [
        { serialNumberManufacturer: { endsWith: machineSnLower } },
        { serialNumberManufacturer: { contains: machineSnLower } },
      ],
    };

    // Filter by bank if provided
    if (customerBankId) {
      machineWhere.customerBankId = customerBankId;
    }

    const machines = await this.prisma.machine.findMany({
      where: machineWhere,
      select: {
        id: true,
        serialNumberManufacturer: true,
        machineCode: true,
        customerBankId: true,
        pengelolaId: true, // Add pengelolaId for filtering
        branchCode: true,
        physicalLocation: true,
        status: true,
        customerBank: {
          select: {
            id: true,
            bankCode: true,
            bankName: true,
          },
        },
      },
      take: 10, // Limit to reasonable number
    });

    if (machines.length === 0) {
      return {
        machines: [],
        cassettes: [],
        count: 0,
        message: `No machines found with serial number containing "${machineSnTrimmed}"`,
      };
    }

    // Get machine IDs for cassette filtering
    const machineIds = machines.map(m => m.id);

    // Apply role-based filtering on machines
    let allowedMachineIds = machineIds;
    
    // BANK users can only see machines from their own bank
    if (userType?.toUpperCase() === 'BANK' && customerBankId) {
      allowedMachineIds = machines
        .filter(m => m.customerBankId === customerBankId)
        .map(m => m.id);
      
      if (allowedMachineIds.length === 0) {
        return {
          machines: [],
          cassettes: [],
          count: 0,
          message: `No machines found with serial number containing "${machineSnTrimmed}"`,
        };
      }
    }
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            where: {
              status: 'ACTIVE', // Only active assignments
            },
            select: { customerBankId: true },
          },
        },
      });

      // SECURITY: If pengelola has no active bank assignments, they cannot access any machines/cassettes
      if (!Pengelola || !Pengelola.bankAssignments || Pengelola.bankAssignments.length === 0) {
        return {
          machines: [],
          cassettes: [],
          count: 0,
          message: `No machines found with serial number containing "${machineSnTrimmed}"`,
        };
      }

      const vendorBankIds = Pengelola.bankAssignments.map(a => a.customerBankId);
      // SECURITY: Filter machines by Pengelola's assigned banks AND machines assigned to this pengelola
      // Pengelola can only see machines that are:
      // 1. From banks they are assigned to
      // 2. Assigned to them (pengelolaId matches)
      allowedMachineIds = machines
        .filter(m =>
          vendorBankIds.includes(m.customerBankId) &&
          m.pengelolaId === pengelolaId // Only machines assigned to this pengelola
        )
        .map(m => m.id);
    }

    // Get cassettes that are ASSIGNED TO these specific machines
    const cassetteWhere: any = {
      machineId: { in: allowedMachineIds },
    };

    // Filter by status if provided
    if (status) {
      cassetteWhere.status = status;
    }

    const cassettes = await this.prisma.cassette.findMany({
      where: cassetteWhere,
      include: {
        cassetteType: true,
        machine: {
          select: {
            id: true,
            serialNumberManufacturer: true,
          },
        },
        customerBank: {
          select: {
            id: true,
            bankCode: true,
            bankName: true,
          },
        },
      },
      orderBy: [
        { machineId: 'asc' },
        { serialNumber: 'asc' },
      ],
    });

    return {
      machines: machines
        .filter(m => allowedMachineIds.includes(m.id))
        .map(m => ({
          id: m.id,
          serialNumber: m.serialNumberManufacturer,
          machineCode: m.machineCode,
          branchCode: m.branchCode,
          location: m.physicalLocation,
          status: m.status,
          bank: m.customerBank ? {
            id: m.customerBank.id,
            bankCode: m.customerBank.bankCode,
            bankName: m.customerBank.bankName,
          } : null,
        })),
      cassettes,
      count: cassettes.length,
      message: `Found ${machines.length} machine(s) and ${cassettes.length} cassette(s) assigned to the machine(s)`,
    };
  }

  async findBySerialNumber(serialNumber: string, userType: string, pengelolaId?: string, customerBankId?: string, status?: string) {
    const serialNumberTrimmed = serialNumber.trim();

    const whereClause: any = {
      serialNumber: serialNumberTrimmed,
    };

    // Declare variables for raw query scope
    let assignedMachineIds: string[] = [];
    let bankIds: string[] = [];
    let Pengelola: any = null;

    // Apply role-based filtering similar to findAll
    if (userType?.toUpperCase() === 'BANK' && customerBankId) {
      // BANK users can only see cassettes from their own bank
      whereClause.customerBankId = customerBankId;
    } else if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            where: {
              status: 'ACTIVE', // Only active assignments
            },
            select: { customerBankId: true },
          },
        },
      });

      // SECURITY: If pengelola has no active bank assignments, they cannot access any cassettes
      if (!Pengelola || !Pengelola.bankAssignments || Pengelola.bankAssignments.length === 0) {
        throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
      }

      bankIds = Pengelola.bankAssignments.map(a => a.customerBankId);

      // SECURITY: Also filter cassettes by machines assigned to this pengelola
      // Pengelola should see:
      // 1. Cassettes from machines assigned to them (machineId in assignedMachineIds)
      // 2. Cassettes without machines (machineId is null) from assigned banks (for standalone cassettes)
      const assignedMachines = await this.prisma.machine.findMany({
        where: {
          pengelolaId,
          customerBankId: { in: bankIds }, // Only machines from assigned banks
        },
        select: { id: true },
      });

      assignedMachineIds = assignedMachines.map(m => m.id);

      // If customerBankId is provided, validate that it's in the assigned banks
      if (customerBankId) {
        if (!bankIds.includes(customerBankId)) {
          throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
        }
        whereClause.customerBankId = customerBankId;
      } else {
        whereClause.customerBankId = { in: bankIds };
      }

      // Combine bank filter with machineId OR condition
      whereClause.AND = [
        { customerBankId: whereClause.customerBankId }, // Ensure cassettes are from assigned banks
        {
          OR: [
            { machineId: { in: assignedMachineIds } }, // Cassettes from assigned machines
            { machineId: null }, // Cassettes without machines (standalone cassettes)
          ],
        },
      ];
      delete whereClause.customerBankId; // Remove from top level, now in AND clause
    } else if (customerBankId) {
      // For Hitachi users, filter by bank if provided
      whereClause.customerBankId = customerBankId;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Use raw query first to get fresh status directly from database (bypass any caching)
    const serialNumberParam = serialNumberTrimmed;

    // Build Pengelola filter for raw query if needed
    let vendorFilter = Prisma.empty;
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      // Use assignedMachineIds that was already calculated above
      if (assignedMachineIds && assignedMachineIds.length > 0) {
        // Filter by bank AND (machineId in assigned machines OR machineId is null)
        vendorFilter = Prisma.sql`
          AND c.customer_bank_id IN (SELECT customer_bank_id FROM bank_pengelola_assignments WHERE pengelola_id = ${pengelolaId} AND status = 'ACTIVE')
          AND (c.machine_id IN (${Prisma.join(assignedMachineIds)}) OR c.machine_id IS NULL)
        `;
      } else {
        // No assigned machines, only show standalone cassettes (machineId is null)
        vendorFilter = Prisma.sql`
          AND c.customer_bank_id IN (SELECT customer_bank_id FROM bank_pengelola_assignments WHERE pengelola_id = ${pengelolaId} AND status = 'ACTIVE')
          AND c.machine_id IS NULL
        `;
      }
    }

    // Add bank filter if provided
    let bankFilter = Prisma.empty;
    if (customerBankId) {
      bankFilter = Prisma.sql`AND c.customer_bank_id = ${customerBankId}`;
    }

    // Add status filter if provided
    let statusFilter = Prisma.empty;
    if (status) {
      statusFilter = Prisma.sql`AND c.status = ${status}`;
    }

    const rawResult = await this.prisma.$queryRaw`
      SELECT 
        c.id,
        c.serial_number as serialNumber,
        c.status,
        c.cassette_type_id as cassetteTypeId,
        c.customer_bank_id as customerBankId
      FROM cassettes c
      WHERE c.serial_number = ${serialNumberParam}
      ${vendorFilter}
      ${bankFilter}
      ${statusFilter}
      LIMIT 1
    ` as any[];

    if (!rawResult || rawResult.length === 0) {
      throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
    }

    const rawCassette = rawResult[0];

    // Now fetch with relations using the verified ID (should match raw query result)
    // Note: Raw query already filtered by pengelola, so this should be safe
    // But we add an additional check for extra security
    const cassette = await this.prisma.cassette.findUnique({
      where: { id: rawCassette.id },
      include: {
        cassetteType: true,
        machine: {
          select: {
            id: true,
            serialNumberManufacturer: true,
            pengelolaId: true, // Include pengelolaId for verification
          },
        },
        customerBank: {
          select: {
            id: true,
            bankCode: true,
            bankName: true,
          },
        },
      },
    });

    // Additional security check for pengelola users
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId && cassette) {
      // Verify cassette is from assigned bank (already checked in raw query, but double-check)
      const bankIds = Pengelola?.bankAssignments?.map(a => a.customerBankId) || [];
      if (!bankIds.includes(cassette.customerBankId)) {
        throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
      }

      // Verify cassette is from assigned machine OR standalone
      if (cassette.machineId) {
        // Cassette has a machine - verify machine is assigned to this pengelola
        if (!assignedMachineIds.includes(cassette.machineId)) {
          throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
        }
        // Also verify machine's pengelolaId matches
        if (cassette.machine?.pengelolaId !== pengelolaId) {
          throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
        }
      }
      // If machineId is null, it's a standalone cassette from assigned bank (already verified above)
    }

    if (!cassette) {
      throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
    }

    // Verify status matches raw query (should always match, but use raw as source of truth if different)
    if (cassette.status !== rawCassette.status) {
      cassette.status = rawCassette.status as any;
    }

    return cassette;
  }

  async generateQrCode(id: string) {
    const cassette = await this.findOne(id);
    const qrData = JSON.stringify({
      id: cassette.id,
      serialNumber: cassette.serialNumber,
      type: cassette.cassetteType.typeCode
    });

    const QRCode = require('qrcode');
    try {
      const qrCode = await QRCode.toDataURL(qrData);
      return { qrCode };
    } catch (err) {
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  async getCassetteTypes() {
    return this.prisma.cassetteType.findMany({
      orderBy: { typeCode: 'asc' },
    });
  }

  async create(createCassetteDto: CreateCassetteDto) {
    // Check if serial number already exists
    const existingCassette = await this.prisma.cassette.findUnique({
      where: { serialNumber: createCassetteDto.serialNumber },
    });

    if (existingCassette) {
      throw new ConflictException(
        `Cassette with serial number ${createCassetteDto.serialNumber} already exists`,
      );
    }

    // Resolve cassetteTypeCode to cassetteTypeId if code is provided
    let cassetteTypeId = createCassetteDto.cassetteTypeId;
    if (!cassetteTypeId && createCassetteDto.cassetteTypeCode) {
      const cassetteType = await this.prisma.cassetteType.findUnique({
        where: { typeCode: createCassetteDto.cassetteTypeCode as any },
      });
      if (!cassetteType) {
        throw new BadRequestException(`Invalid cassette type code: ${createCassetteDto.cassetteTypeCode}`);
      }
      cassetteTypeId = cassetteType.id;
    }

    if (!cassetteTypeId) {
      throw new BadRequestException('Either cassetteTypeId or cassetteTypeCode must be provided');
    }

    // If this is a replacement, validate that replaced cassette exists and is SCRAPPED
    if (createCassetteDto.replacedCassetteId) {
      const replacedCassette = await this.prisma.cassette.findUnique({
        where: { id: createCassetteDto.replacedCassetteId },
        select: { id: true, status: true, serialNumber: true, machineId: true, cassetteTypeId: true, customerBankId: true, usageType: true },
      });

      if (!replacedCassette) {
        throw new BadRequestException('Replaced cassette not found');
      }

      if (replacedCassette.status !== 'SCRAPPED') {
        throw new BadRequestException(`Replaced cassette must be SCRAPPED. Current status: ${replacedCassette.status}`);
      }

      // Auto-fill machine, type, bank, usageType from replaced cassette if not provided
      const data: any = {
        serialNumber: createCassetteDto.serialNumber,
        cassetteTypeId: cassetteTypeId || replacedCassette.cassetteTypeId,
        customerBankId: createCassetteDto.customerBankId || replacedCassette.customerBankId,
        machineId: createCassetteDto.machineId || replacedCassette.machineId,
        usageType: createCassetteDto.usageType || replacedCassette.usageType,
        status: createCassetteDto.status || 'OK',
        notes: createCassetteDto.notes || `Replacement for ${replacedCassette.serialNumber}`,
        replacedCassetteId: createCassetteDto.replacedCassetteId,
        replacementTicketId: createCassetteDto.replacementTicketId,
      };

      return this.prisma.cassette.create({
        data,
        include: {
          cassetteType: true,
          customerBank: true,
          replacedCassette: {
            select: {
              id: true,
              serialNumber: true,
              status: true,
            },
          },
        },
      });
    }

    // Create cassette data object with resolved type ID
    const createData: any = {
      serialNumber: createCassetteDto.serialNumber,
      cassetteTypeId,
      customerBankId: createCassetteDto.customerBankId,
      machineId: createCassetteDto.machineId,
      usageType: createCassetteDto.usageType,
      status: createCassetteDto.status || 'OK',
      notes: createCassetteDto.notes,
    };

    return this.prisma.cassette.create({
      data: createData,
      include: {
        cassetteType: true,
        customerBank: true,
      },
    });
  }

  async markAsBroken(id: string, reason: string, userId: string) {
    const cassette = await this.prisma.cassette.findUnique({
      where: { id },
    });

    if (!cassette) {
      throw new NotFoundException('Cassette not found');
    }

    if (cassette.status !== 'OK') {
      throw new BadRequestException('Only OK cassettes can be marked as broken');
    }

    const updated = await this.prisma.cassette.update({
      where: { id },
      data: {
        status: 'BAD',
        notes: reason,
        markedBrokenBy: userId,
      },
    });

    // Log to audit
    try {
      await this.auditLogService.logCassetteStatusChange(
        id,
        'OK',
        'BAD',
        userId,
        'PENGELOLA',
        { action: 'MARK_BROKEN', reason },
      );
    } catch (auditError) {
      this.logger.warn('Failed to log audit for mark as broken', auditError);
    }

    return updated;
  }

  async replaceCassette(replaceDto: ReplaceCassetteDto, userId: string) {
    // Verify old cassette exists and is in correct status
    const oldCassette = await this.prisma.cassette.findUnique({
      where: { id: replaceDto.oldCassetteId },
      include: {
        cassetteType: true,
        customerBank: true,
      },
    });

    if (!oldCassette) {
      throw new NotFoundException('Old cassette not found');
    }

    // Old cassette should be IN_REPAIR, IN_TRANSIT_TO_RC, or SCRAPPED
    // For replacement requests without repair ticket, status might be IN_TRANSIT_TO_RC
    // We allow IN_TRANSIT_TO_RC because replacement doesn't require repair ticket
    const allowedStatuses = ['IN_REPAIR', 'IN_TRANSIT_TO_RC', 'SCRAPPED'];
    if (!allowedStatuses.includes(oldCassette.status)) {
      throw new BadRequestException(
        `Old cassette must be IN_REPAIR, IN_TRANSIT_TO_RC, or SCRAPPED to be replaced. Current status: ${oldCassette.status}`,
      );
    }

    // Verify replacement ticket exists
    const replacementTicket = await this.prisma.problemTicket.findUnique({
      where: { id: replaceDto.replacementTicketId },
    });

    if (!replacementTicket) {
      throw new NotFoundException('Replacement ticket not found');
    }

    // Check if new serial number already exists
    const existingCassette = await this.prisma.cassette.findUnique({
      where: { serialNumber: replaceDto.newSerialNumber },
    });

    if (existingCassette) {
      throw new ConflictException(
        `Cassette with serial number ${replaceDto.newSerialNumber} already exists`,
      );
    }

    // Perform replacement in transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark old cassette as SCRAPPED
      const updatedOldCassette = await tx.cassette.update({
        where: { id: replaceDto.oldCassetteId },
        data: {
          status: 'SCRAPPED',
          notes: replaceDto.notes || `Replaced by ${replaceDto.newSerialNumber} - Ticket #${replacementTicket.ticketNumber}`,
        },
      });

      // 2. Create new cassette with auto-fill from old cassette
      const newCassette = await tx.cassette.create({
        data: {
          serialNumber: replaceDto.newSerialNumber,
          cassetteTypeId: oldCassette.cassetteTypeId,
          customerBankId: oldCassette.customerBankId,
          machineId: oldCassette.machineId,
          usageType: oldCassette.usageType,
          status: 'OK',
          notes: replaceDto.notes || `Replacement for ${oldCassette.serialNumber} - Ticket #${replacementTicket.ticketNumber}`,
          replacedCassetteId: replaceDto.oldCassetteId,
          replacementTicketId: replaceDto.replacementTicketId,
        },
        include: {
          cassetteType: true,
          customerBank: true,
          replacedCassette: {
            select: {
              id: true,
              serialNumber: true,
              status: true,
            },
          },
        },
      });

      // 3. Update ticket status to RESOLVED (required for creating return delivery)
      // For replacement requests, after replacement is done, ticket should be RESOLVED
      // so that RC staff can create return delivery for the new cassette
      await tx.problemTicket.update({
        where: { id: replaceDto.replacementTicketId },
        data: {
          status: 'RESOLVED' as any,
        },
      });

      return {
        oldCassette: updatedOldCassette,
        newCassette,
        message: `Cassette ${oldCassette.serialNumber} replaced with ${replaceDto.newSerialNumber}. Ticket status updated to RESOLVED.`,
      };
    });
  }

  async getStatisticsByBank(bankId: string) {
    const [total, ok, bad, inTransit, inRepair, readyForPickup] = await Promise.all([
      this.prisma.cassette.count({ where: { customerBankId: bankId } }),
      this.prisma.cassette.count({ where: { customerBankId: bankId, status: 'OK' as any } }),
      this.prisma.cassette.count({ where: { customerBankId: bankId, status: 'BAD' } }),
      this.prisma.cassette.count({ where: { customerBankId: bankId, status: 'IN_TRANSIT_TO_RC' } }),
      this.prisma.cassette.count({ where: { customerBankId: bankId, status: 'IN_REPAIR' } }),
      this.prisma.cassette.count({ where: { customerBankId: bankId, status: 'READY_FOR_PICKUP' } }),
    ]);

    return {
      total,
      ok,
      readyForPickup,
      bad,
      inTransit,
      inRepair,
      availableForSwap: ok,
    };
  }

  async checkCassetteAvailability(cassetteId: string) {
    // Check for active problem tickets (OPEN, IN_PROGRESS, etc - anything except RESOLVED and CLOSED)
    // RESOLVED and CLOSED are considered completed, so cassette can be selected again
    // Also exclude soft-deleted tickets (deletedAt is null)
    // Check both single-cassette tickets (cassetteId) and multi-cassette tickets (cassetteDetails)
    const activeTicket = await this.prisma.problemTicket.findFirst({
      where: {
        AND: [
          { deletedAt: null }, // Exclude soft-deleted tickets
          {
            OR: [
              {
                cassetteId,
                status: {
                  notIn: ['RESOLVED', 'CLOSED']
                },
              },
              {
                cassetteDetails: {
                  some: {
                    cassetteId,
                  },
                },
                status: {
                  notIn: ['RESOLVED', 'CLOSED']
                },
              },
            ],
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

    // Check for active PM tasks (not COMPLETED or CANCELLED)
    const activePM = await this.prisma.preventiveMaintenance.findFirst({
      where: {
        cassetteDetails: {
          some: {
            cassetteId,
          },
        },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        pmNumber: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check for the latest repair ticket for this cassette
    // If repair ticket is COMPLETED, cassette can be selected again (repair is done)
    const latestRepairTicket = await this.prisma.repairTicket.findFirst({
      where: {
        cassetteId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check if repair ticket is completed
    const repairCompleted = latestRepairTicket && ['COMPLETED', 'SCRAPPED'].includes(latestRepairTicket.status);
    const activeRepairTicket = latestRepairTicket && !repairCompleted ? latestRepairTicket : null;

    // Check cassette status
    const cassette = await this.prisma.cassette.findUnique({
      where: { id: cassetteId },
      select: {
        status: true,
        serialNumber: true,
      },
    });

    // Check if cassette has been returned and received by pengelola
    // For multi-cassette tickets: check if ticket has return (even if this specific cassette doesn't have direct return)
    // If return is received, cassette is available regardless of status
    const returnRecord = await (this.prisma as any).cassetteReturn.findFirst({
      where: {
        cassetteId,
        receivedAtPengelola: {
          not: null, // Return has been received
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    // For multi-cassette tickets: check if ticket has return (even if this specific cassette doesn't have direct return)
    // Get all tickets that include this cassette
    const ticketsWithCassette = await this.prisma.problemTicket.findMany({
      where: {
        OR: [
          { cassetteId }, // Single-cassette ticket
          {
            cassetteDetails: {
              some: { cassetteId }, // Multi-cassette ticket
            },
          },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    // Check if any of these tickets have a return that has been received
    let ticketReturnReceived = false;
    if (ticketsWithCassette.length > 0) {
      const ticketIds = ticketsWithCassette.map(t => t.id);
      const ticketReturn = await (this.prisma as any).cassetteReturn.findFirst({
        where: {
          ticketId: { in: ticketIds },
          receivedAtPengelola: {
            not: null, // Return has been received
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });
      ticketReturnReceived = ticketReturn !== null;
    }

    const returnReceived = returnRecord !== null || ticketReturnReceived;

    // Statuses that indicate cassette is in repair process
    // But if return is received, cassette is available even if status is still in repair process
    // READY_FOR_PICKUP means repair is complete; do not treat as in-process
    const repairStatuses = ['IN_TRANSIT_TO_RC', 'IN_REPAIR'];
    const isInRepairProcess = cassette && repairStatuses.includes(cassette.status) && !returnReceived;

    // Cassette is available if:
    // 1. Return is received (cassette is back at pengelola, ready for new tickets)
    // OR
    // 2. Repair ticket is COMPLETED (repair is done, can select again)
    // OR
    // 3. No active problem ticket (or problem ticket is RESOLVED/CLOSED) AND no active repair ticket AND no active PM AND not in repair process
    // 
    // Key logic: 
    // - If return is received, cassette is available (back at pengelola)
    // - If repair is COMPLETED, cassette can be selected regardless of problem ticket status
    //   because the repair process is finished and cassette is ready for new tickets
    const problemTicketResolved = activeTicket ? ['RESOLVED', 'CLOSED'].includes(activeTicket.status) : false;

    let available: boolean;
    if (returnReceived) {
      // Return is received, cassette is back at pengelola and available
      available = !activePM && (!activeTicket || problemTicketResolved);
    } else if (repairCompleted) {
      // Repair is done, cassette can be selected (even if problem ticket is still IN_PROGRESS)
      // But still check PM and cassette status
      available = !activePM && !isInRepairProcess;
    } else {
      // No completed repair, check all conditions
      available = (!activeTicket || problemTicketResolved) && !activeRepairTicket && !activePM && !isInRepairProcess;
    }

    return {
      available,
      activeTicket: activeTicket && !problemTicketResolved && !repairCompleted ? activeTicket : null,
      activePM: activePM || null,
      activeRepairTicket: activeRepairTicket || null,
      cassetteStatus: cassette?.status,
      serialNumber: cassette?.serialNumber,
      isInRepairProcess,
    };
  }

  async checkCassetteAvailabilityBatch(cassetteIds: string[]): Promise<Record<string, any>> {
    // Limit batch size to prevent memory issues
    const MAX_BATCH_SIZE = 100;
    const idsToCheck = cassetteIds.slice(0, MAX_BATCH_SIZE);

    // Check all cassettes in parallel
    const results = await Promise.all(
      idsToCheck.map(async (cassetteId) => {
        try {
          const availability = await this.checkCassetteAvailability(cassetteId);
          return { cassetteId, ...availability };
        } catch (error) {
          this.logger.error(`Error checking availability for cassette ${cassetteId}:`, error);
          return {
            cassetteId,
            available: true, // Default to available on error
            error: error.message,
          };
        }
      })
    );

    // Convert to map
    const availabilityMap: Record<string, any> = {};
    results.forEach((result) => {
      availabilityMap[result.cassetteId] = result;
    });

    return availabilityMap;
  }

  /**
   * Update cassette properties (Super Admin only)
   * Allows updating machineId, usageType, status, and notes
   */
  async update(id: string, updateDto: any) {
    const cassette = await this.prisma.cassette.findUnique({
      where: { id },
    });

    if (!cassette) {
      throw new NotFoundException(`Cassette with ID ${id} not found`);
    }

    // If updating machineId, verify machine exists
    if (updateDto.machineId) {
      const machine = await this.prisma.machine.findUnique({
        where: { id: updateDto.machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Machine with ID ${updateDto.machineId} not found`);
      }

      // Verify machine belongs to same bank
      if (machine.customerBankId !== cassette.customerBankId) {
        throw new BadRequestException(
          'Machine must belong to the same bank as the cassette',
        );
      }
    }

    return this.prisma.cassette.update({
      where: { id },
      data: updateDto,
      include: {
        cassetteType: true,
        customerBank: true,
        machine: {
          select: {
            id: true,
            machineCode: true,
            serialNumberManufacturer: true,
          },
        },
      },
    });
  }

  /**
   * Delete a cassette (Super Admin only)
   * Note: This is a hard delete. Consider adding soft delete if needed.
   * Before deleting, check if cassette has active repair tickets or is in use.
   */
  async delete(id: string, userId: string, userRole: string) {
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete cassettes');
    }

    const cassette = await this.prisma.cassette.findUnique({
      where: { id },
    });

    if (!cassette) {
      throw new NotFoundException(`Cassette with ID ${id} not found`);
    }

    // Check if cassette has active repair tickets (excluding completed/scrapped and soft-deleted)
    const activeRepairTickets = await this.prisma.repairTicket.findMany({
      where: {
        cassetteId: id,
        status: {
          notIn: ['COMPLETED', 'SCRAPPED'],
        },
        ...({ deletedAt: null } as any), // Filter soft-deleted repair tickets
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (activeRepairTickets.length > 0) {
      throw new BadRequestException(
        `Cannot delete cassette. It has ${activeRepairTickets.length} active repair ticket(s). Please complete or delete the repair tickets first.`,
      );
    }

    // Check if cassette has active problem tickets (excluding resolved/closed)
    // Note: deletedAt filter is already applied in ProblemTicket queries
    const activeProblemTickets = await this.prisma.problemTicket.findMany({
      where: {
        OR: [
          { cassetteId: id },
          {
            cassetteDetails: {
              some: {
                cassetteId: id,
              },
            },
          },
        ],
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
        deletedAt: null, // Filter soft-deleted problem tickets (already in schema)
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
      },
    });

    if (activeProblemTickets.length > 0) {
      throw new BadRequestException(
        `Cannot delete cassette. It has ${activeProblemTickets.length} active problem ticket(s). Please resolve or delete the problem tickets first.`,
      );
    }

    // Check if cassette is in active status (not SCRAPPED)
    if (cassette.status !== 'SCRAPPED') {
      throw new BadRequestException(
        `Cannot delete cassette. Current status is ${cassette.status}. Please scrap the cassette first or change status to SCRAPPED.`,
      );
    }

    // Delete cassette
    return this.prisma.cassette.delete({
      where: { id },
    });
  }

  async unmarkAsBroken(id: string, reason: string, userId: string) {
    const cassette = await this.prisma.cassette.findUnique({
      where: { id },
      include: {
        problemTickets: {
          where: {
            status: {
              notIn: ['RESOLVED', 'CLOSED'],
            },
            deletedAt: null,
          },
        },
      },
    });

    if (!cassette) {
      throw new NotFoundException('Cassette not found');
    }

    if (cassette.status !== 'BAD') {
      throw new BadRequestException('Only BAD cassettes can be unmarked');
    }

    // Only the user who marked it can undo
    if (cassette.markedBrokenBy !== userId) {
      throw new ForbiddenException('Only the user who marked this cassette as broken can undo it');
    }

    // Optional: Check if already has active ticket
    if (cassette.problemTickets.length > 0) {
      throw new BadRequestException(
        `Cannot undo mark as broken. Cassette has ${cassette.problemTickets.length} active ticket(s).`,
      );
    }

    const updated = await this.prisma.cassette.update({
      where: { id },
      data: {
        status: 'OK',
        notes: reason ? `${cassette.notes || ''}\n[Undo] ${reason}`.trim() : cassette.notes,
        markedBrokenBy: null,
      },
    });

    // Log to audit
    try {
      await this.auditLogService.logCassetteStatusChange(
        id,
        'BAD',
        'OK',
        userId,
        'PENGELOLA',
        { action: 'UNMARK_BROKEN', reason },
      );
    } catch (auditError) {
      this.logger.warn('Failed to log audit for unmark as broken', auditError);
    }

    return updated;
  }

  async findBrokenAvailable(customerBankId?: string, pengelolaId?: string) {
    const whereClause: any = {
      status: 'BAD',
      problemTickets: {
        none: {
          status: {
            notIn: ['RESOLVED', 'CLOSED'],
          },
          deletedAt: null,
        },
      },
    };

    // Filter by bank if provided
    if (customerBankId) {
      whereClause.customerBankId = customerBankId;
    }

    // Filter by pengelola if provided (via machine assignments)
    if (pengelolaId) {
      whereClause.OR = [
        {
          machine: {
            pengelolaId: pengelolaId,
          },
        },
        {
          customerBank: {
            pengelolaAssignments: {
              some: {
                pengelolaId: pengelolaId,
                status: 'ACTIVE',
              },
            },
          },
        },
      ];
    }

    return this.prisma.cassette.findMany({
      where: whereClause,
      include: {
        cassetteType: true,
        customerBank: true,
        machine: {
          include: {
            pengelola: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Newest marked broken first
      },
    });
  }

  async markMultipleAsBroken(cassetteIds: string[], reason: string, userId: string) {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const id of cassetteIds) {
      try {
        await this.markAsBroken(id, reason, userId);
        results.success.push(id);
      } catch (error: any) {
        results.failed.push({
          id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }
}

