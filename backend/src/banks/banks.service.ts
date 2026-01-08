import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto, UpdateBankDto } from './dto';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.customerBank.findMany({
      include: {
        pengelolaAssignments: {
          include: {
            pengelola: {
              select: {
                id: true,
                pengelolaCode: true,
                companyName: true,
                companyAbbreviation: true,
              },
            },
          },
        },
        _count: {
          select: {
            machines: true,
            cassettes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const bank = await this.prisma.customerBank.findUnique({
      where: { id },
      include: {
        pengelolaAssignments: {
          include: {
            pengelola: true,
          },
        },
        machines: {
          select: {
            id: true,
            machineCode: true,
            modelName: true,
            branchCode: true,
            status: true,
          },
        },
        cassettes: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
      },
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    return bank;
  }

  async create(createBankDto: CreateBankDto) {
    // Check if bank code already exists
    const existingBank = await this.prisma.customerBank.findUnique({
      where: { bankCode: createBankDto.bankCode },
    });

    if (existingBank) {
      throw new ConflictException(`Bank with code ${createBankDto.bankCode} already exists`);
    }

    return this.prisma.customerBank.create({
      data: createBankDto as any,
    });
  }

  async update(id: string, updateBankDto: UpdateBankDto) {
    const bank = await this.findOne(id);

    // If updating bank code, check for conflicts
    if (updateBankDto.bankCode && updateBankDto.bankCode !== bank.bankCode) {
      const existingBank = await this.prisma.customerBank.findUnique({
        where: { bankCode: updateBankDto.bankCode },
      });

      if (existingBank) {
        throw new ConflictException(`Bank with code ${updateBankDto.bankCode} already exists`);
      }
    }

    return this.prisma.customerBank.update({
      where: { id },
      data: updateBankDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if bank has machines
    const machineCount = await this.prisma.machine.count({
      where: { customerBankId: id },
    });

    if (machineCount > 0) {
      throw new ConflictException(
        `Cannot delete bank with ${machineCount} associated machines`,
      );
    }

    return this.prisma.customerBank.delete({
      where: { id },
    });
  }

  async getStatistics(id: string) {
    await this.findOne(id);

    const [totalMachines, operationalMachines, totalCassettes, spareCassettes] =
      await Promise.all([
        this.prisma.machine.count({
          where: { customerBankId: id },
        }),
        this.prisma.machine.count({
          where: { customerBankId: id, status: 'OPERATIONAL' },
        }),
        this.prisma.cassette.count({
          where: { customerBankId: id },
        }),
        this.prisma.cassette.count({
          where: { customerBankId: id, status: 'OK' as any },
        }),
      ]);

    return {
      bankId: id,
      totalMachines,
      operationalMachines,
      maintenanceMachines: totalMachines - operationalMachines,
      totalCassettes,
      spareCassettes,
      installedCassettes: totalCassettes - spareCassettes,
    };
  }

  async assignPengelolaToBank(bankId: string, pengelolaId: string, assignmentDto?: any) {
    // Check if bank exists
    await this.findOne(bankId);

    // Check if pengelola exists
    const pengelola = await this.prisma.pengelola.findUnique({
      where: { id: pengelolaId },
    });

    if (!pengelola) {
      throw new NotFoundException(`Pengelola with ID ${pengelolaId} not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.bankPengelolaAssignment.findUnique({
      where: {
        customerBankId_pengelolaId: {
          customerBankId: bankId,
          pengelolaId: pengelolaId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('This bank-pengelola assignment already exists');
    }

    // Create assignment
    // Store assignedCassetteCount in notes as JSON for now (can be migrated to separate field later)
    const notesData: any = {};
    if (assignmentDto?.assignedCassetteCount) {
      notesData.assignedCassetteCount = assignmentDto.assignedCassetteCount;
    }

    return this.prisma.bankPengelolaAssignment.create({
      data: {
        customerBankId: bankId,
        pengelolaId: pengelolaId,
        contractNumber: assignmentDto?.contractNumber,
        contractStartDate: assignmentDto?.contractStartDate
          ? new Date(assignmentDto.contractStartDate)
          : undefined,
        contractEndDate: assignmentDto?.contractEndDate
          ? new Date(assignmentDto.contractEndDate)
          : undefined,
        assignedBranches: assignmentDto?.assignedBranches ? JSON.stringify(assignmentDto.assignedBranches) : null,
        notes: Object.keys(notesData).length > 0 ? JSON.stringify(notesData) : null,
        status: 'ACTIVE',
      },
      include: {
        customerBank: true,
        pengelola: true,
      },
    });
  }

  async getAssignedCassetteCount(assignmentId: string): Promise<number> {
    const assignment = await this.prisma.bankPengelolaAssignment.findUnique({
      where: { id: assignmentId },
      select: { notes: true },
    });

    if (!assignment || !assignment.notes) {
      return 0;
    }

    try {
      const notesData = JSON.parse(assignment.notes);
      return notesData.assignedCassetteCount || 0;
    } catch {
      return 0;
    }
  }

  async getCurrentAssignedCassetteCount(bankId: string, pengelolaId: string): Promise<number> {
    // Count cassettes that are assigned to this Pengelola through the assignment
    // For now, we'll count all cassettes from the bank (can be refined later with actual assignment tracking)
    const assignment = await this.prisma.bankPengelolaAssignment.findUnique({
      where: {
        customerBankId_pengelolaId: {
          customerBankId: bankId,
          pengelolaId: pengelolaId,
        },
      },
    });

    if (!assignment) {
      return 0;
    }

    // Count cassettes from this bank
    // Note: In the future, we might want to track which cassettes are actually assigned to which Pengelola
    const totalCassettes = await this.prisma.cassette.count({
      where: { customerBankId: bankId },
    });

    return totalCassettes;
  }
}

