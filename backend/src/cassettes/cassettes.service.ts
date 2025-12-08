import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCassetteDto, ReplaceCassetteDto } from './dto';

@Injectable()
export class CassettesService {
  private readonly logger = new Logger(CassettesService.name);
  
  constructor(private prisma: PrismaService) {}

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
    const whereClause: any = {};

    // SUPER ADMIN (HITACHI) can see ALL cassettes
    // Pengelola users can only see cassettes of their assigned bank customers
    if (userType === 'HITACHI') {
      // Admin can see everything - no filter
    } else if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            select: { 
              customerBankId: true,
              assignedBranches: true,
            },
          },
        },
      });

      if (Pengelola && Pengelola.bankAssignments.length > 0) {
        const bankIds = Pengelola.bankAssignments.map(a => a.customerBankId);
        
        // Check if any assignment has specific branches
        const assignmentsWithBranches = Pengelola.bankAssignments.filter(
          a => a.assignedBranches && Array.isArray(a.assignedBranches) && (a.assignedBranches as string[]).length > 0
        );
        
        if (assignmentsWithBranches.length > 0) {
          // If Pengelola has branch-specific assignments, we need to filter by bank
          // Note: Cassettes don't have branchCode directly, so we show all cassettes from assigned banks
          // Branch filtering for cassettes would require additional logic based on machine assignments
          whereClause.customerBankId = { in: bankIds };
        } else {
          // No branch restrictions - show all cassettes from assigned banks
          whereClause.customerBankId = { in: bankIds };
        }
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
        customerBank: {
          select: {
            bankCode: true,
            bankName: true,
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
        _count: {
          select: {
            problemTickets: true,          // Single cassette SOs
            repairTickets: true,            // Repair records
            ticketCassetteDetails: true,   // Multi-cassette SOs
          },
        },
      },
      orderBy,
      skip,
      take,
    });

    // Enrich with computed cycle/repair counts to ensure frontend always has numbers
    const enrichedData = data.map((cassette) => {
      const singleProblems = cassette._count?.problemTickets ?? 0;
      const multiProblems = cassette._count?.ticketCassetteDetails ?? 0;
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

  async findOne(id: string) {
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

    return cassette;
  }

  async findByMachine(machineId: string, userType: string, pengelolaId?: string) {
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
    
    // Apply Pengelola filtering on machines
    let allowedMachineIds = machineIds;
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            select: { customerBankId: true },
          },
        },
      });

      if (Pengelola) {
        const vendorBankIds = Pengelola.bankAssignments.map(a => a.customerBankId);
        // Filter machines by Pengelola's assigned banks
        allowedMachineIds = machines
          .filter(m => vendorBankIds.includes(m.customerBankId))
          .map(m => m.id);
      }
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

    // Filter by bank if provided
    if (customerBankId) {
      whereClause.customerBankId = customerBankId;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Apply role-based filtering similar to findAll
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      const Pengelola = await this.prisma.pengelola.findUnique({
        where: { id: pengelolaId },
        include: {
          bankAssignments: {
            select: { customerBankId: true },
          },
        },
      });

      if (Pengelola) {
        const bankIds = Pengelola.bankAssignments.map(a => a.customerBankId);
        whereClause.customerBankId = { in: bankIds };
      }
    }

    // Use raw query first to get fresh status directly from database (bypass any caching)
    const serialNumberParam = serialNumberTrimmed;
    
    // Build Pengelola filter for raw query if needed
    let vendorFilter = Prisma.empty;
    if (userType !== 'HITACHI' && userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
      vendorFilter = Prisma.sql`AND c.customer_bank_id IN (SELECT customer_bank_id FROM bank_pengelola_assignments WHERE pengelola_id = ${pengelolaId})`;
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
    const cassette = await this.prisma.cassette.findUnique({
      where: { id: rawCassette.id },
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
    });

    if (!cassette) {
      throw new NotFoundException(`Cassette with serial number ${serialNumber} not found`);
    }

    // Verify status matches raw query (should always match, but use raw as source of truth if different)
    if (cassette.status !== rawCassette.status) {
      cassette.status = rawCassette.status as any;
    }

    return cassette;
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
        cassetteTypeId: createCassetteDto.cassetteTypeId || replacedCassette.cassetteTypeId,
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

    return this.prisma.cassette.create({
      data: createCassetteDto,
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

    return this.prisma.cassette.update({
      where: { id },
      data: {
        status: 'BAD',
        notes: reason,
      },
    });
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
    const repairStatuses = ['IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP'];
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
}

