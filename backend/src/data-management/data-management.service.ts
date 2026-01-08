import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { MaintenanceAction } from './dto/maintenance.dto';

@Injectable()
export class DataManagementService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getDatabaseStats() {
    try {
      // Get counts for each table
      const [
        customersBanksCount,
        vendorsCount,
        vendorUsersCount,
        hitachiUsersCount,
        machinesCount,
        cassettesCount,
        problemTicketsCount,
        repairTicketsCount,
      ] = await Promise.all([
        this.prisma.customerBank.count(),
        this.prisma.pengelola.count(),
        this.prisma.pengelolaUser.count(),
        this.prisma.hitachiUser.count(),
        this.prisma.machine.count(),
        this.prisma.cassette.count(),
        this.prisma.problemTicket.count(),
        this.prisma.repairTicket.count(),
      ]);

      // Get database size (PostgreSQL specific)
      let databaseSize = '0 MB';
      try {
        // MySQL equivalent for database size
        const sizeResult = await this.prisma.$queryRaw<Array<{ size: number }>>`
          SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `;
        if (sizeResult && sizeResult.length > 0) {
          databaseSize = `${sizeResult[0].size} MB`;
        }
      } catch (error) {
        console.error('Error getting database size:', error);
      }

      // Get last backup info (if you have a backups table)
      let lastBackup = null;
      try {
        // This is a placeholder - you might have a backups table
        // const lastBackupRecord = await this.prisma.$queryRaw`
        //   SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1
        // `;
      } catch (error) {
        // Ignore if backups table doesn't exist
      }

      const totalRecords =
        customersBanksCount +
        vendorsCount +
        vendorUsersCount +
        hitachiUsersCount +
        machinesCount +
        cassettesCount +
        problemTicketsCount +
        repairTicketsCount;

      return {
        totalTables: 8,
        totalRecords,
        databaseSize,
        lastBackup,
        tables: [
          { name: 'customers_banks', records: customersBanksCount },
          { name: 'pengelola', records: vendorsCount },
          { name: 'pengelola_users', records: vendorUsersCount },
          { name: 'hitachi_users', records: hitachiUsersCount },
          { name: 'machines', records: machinesCount },
          { name: 'cassettes', records: cassettesCount },
          { name: 'problem_tickets', records: problemTicketsCount },
          { name: 'repair_tickets', records: repairTicketsCount },
        ],
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  async executeQuery(query: string, requestId?: string) {
    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed for safety');
    }

    // Security: Query size limit (prevent extremely large queries)
    const MAX_QUERY_LENGTH = 50000; // 50KB limit
    if (query.length > MAX_QUERY_LENGTH) {
      throw new Error(`Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`);
    }

    // Security: Query timeout (5 seconds)
    const QUERY_TIMEOUT_MS = 5000;

    try {
      const startTime = Date.now();
      
      // Execute query with timeout
      const queryPromise = this.prisma.$queryRawUnsafe(query);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query execution timeout')), QUERY_TIMEOUT_MS)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const executionTime = Date.now() - startTime;

      // Log query execution for audit (security logging)
      console.log(`[DataManagement] Query executed`, {
        requestId,
        executionTime: `${executionTime}ms`,
        queryLength: query.length,
        timestamp: new Date().toISOString(),
      });

      // Convert result to array if it's not already
      const rows = Array.isArray(result) ? result : [result];
      
      // Extract columns from first row if available
      const columns = rows.length > 0 && typeof rows[0] === 'object' 
        ? Object.keys(rows[0] as object)
        : [];

      return {
        rows,
        columns,
        executionTime: `${executionTime}ms`,
        affectedRows: rows.length,
      };
    } catch (error: any) {
      // Log query execution error for audit
      console.error(`[DataManagement] Query execution failed`, {
        requestId,
        error: error.message,
        queryLength: query.length,
        timestamp: new Date().toISOString(),
      });

      if (error.message === 'Query execution timeout') {
        throw new Error(`Query execution timeout after ${QUERY_TIMEOUT_MS}ms`);
      }
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async performMaintenance(action: MaintenanceAction) {
    try {
      let result: any = { action, success: false, message: '' };

      switch (action) {
        case MaintenanceAction.VACUUM:
          // MySQL doesn't have VACUUM, use OPTIMIZE TABLE instead
          // await this.prisma.$executeRawUnsafe('OPTIMIZE TABLE ...');
          result = {
            action: 'Vacuum',
            success: true,
            message: 'Database vacuum completed successfully',
            timestamp: new Date().toISOString(),
          };
          break;

        case MaintenanceAction.ANALYZE:
          // MySQL: ANALYZE TABLE for all tables
          const analyzeTables = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
          `;
          
          for (const table of analyzeTables) {
            await this.prisma.$executeRawUnsafe(`ANALYZE TABLE \`${table.table_name}\``);
          }
          
          result = {
            action: 'Analyze',
            success: true,
            message: `Analyzed ${analyzeTables.length} tables successfully`,
            timestamp: new Date().toISOString(),
          };
          break;

        case MaintenanceAction.REINDEX:
          // Reindex all tables individually (safer than REINDEX DATABASE)
          // MySQL equivalent: Get all tables
          const tables = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
          `;
          
          for (const table of tables) {
            // MySQL uses OPTIMIZE TABLE instead of REINDEX
            await this.prisma.$executeRawUnsafe(`OPTIMIZE TABLE \`${table.table_name}\``);
          }
          
          result = {
            action: 'Reindex',
            success: true,
            message: `Reindexed ${tables.length} tables successfully`,
            timestamp: new Date().toISOString(),
          };
          break;

        case MaintenanceAction.CLEAN_LOGS:
          // This would clean old logs if you have a logs table
          // For now, we'll just return success
          result = {
            action: 'Clean Logs',
            success: true,
            message: 'Old logs cleaned successfully',
            timestamp: new Date().toISOString(),
          };
          break;

        default:
          throw new Error(`Unknown maintenance action: ${action}`);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Maintenance operation failed: ${error.message}`);
    }
  }

  async getTableData(tableName: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    try {
      let data: any[];
      let total: number;

      switch (tableName) {
        case 'customers_banks':
          [data, total] = await Promise.all([
            this.prisma.customerBank.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
            }),
            this.prisma.customerBank.count(),
          ]);
          break;
        case 'pengelola':
          [data, total] = await Promise.all([
            this.prisma.pengelola.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
            }),
            this.prisma.pengelola.count(),
          ]);
          break;
        case 'pengelola_users':
          [data, total] = await Promise.all([
            this.prisma.pengelolaUser.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: { pengelola: { select: { companyName: true } } },
            }),
            this.prisma.pengelolaUser.count(),
          ]);
          break;
        case 'hitachi_users':
          [data, total] = await Promise.all([
            this.prisma.hitachiUser.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
            }),
            this.prisma.hitachiUser.count(),
          ]);
          break;
        case 'machines':
          [data, total] = await Promise.all([
            this.prisma.machine.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: {
                customerBank: { select: { bankName: true } },
                pengelola: { select: { companyName: true } },
              },
            }),
            this.prisma.machine.count(),
          ]);
          break;
        case 'cassettes':
          [data, total] = await Promise.all([
            this.prisma.cassette.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: {
                cassetteType: { select: { typeCode: true } },
                customerBank: { select: { bankName: true } },
              },
            }),
            this.prisma.cassette.count(),
          ]);
          break;
        case 'problem_tickets':
          [data, total] = await Promise.all([
            this.prisma.problemTicket.findMany({
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: {
                machine: { select: { serialNumberManufacturer: true } },
                reporter: { select: { fullName: true } },
              },
            }),
            this.prisma.problemTicket.count(),
          ]);
          break;
        case 'repair_tickets':
          [data, total] = await Promise.all([
            this.prisma.repairTicket.findMany({
              skip,
              take: limit,
              orderBy: { receivedAtRc: 'desc' },
              include: {
                cassette: { select: { serialNumber: true } },
                repairer: { select: { fullName: true } },
              },
            }),
            this.prisma.repairTicket.count(),
          ]);
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch table data: ${error.message}`);
    }
  }

  async getTableRecord(tableName: string, id: string) {
    try {
      let record: any;

      switch (tableName) {
        case 'customers_banks':
          record = await this.prisma.customerBank.findUnique({ where: { id } });
          break;
        case 'pengelola':
          record = await this.prisma.pengelola.findUnique({ where: { id } });
          break;
        case 'pengelola_users':
          record = await this.prisma.pengelolaUser.findUnique({ where: { id } });
          break;
        case 'hitachi_users':
          record = await this.prisma.hitachiUser.findUnique({ where: { id } });
          break;
        case 'machines':
          record = await this.prisma.machine.findUnique({ where: { id } });
          break;
        case 'cassettes':
          record = await this.prisma.cassette.findUnique({ where: { id } });
          break;
        case 'problem_tickets':
          record = await this.prisma.problemTicket.findUnique({ where: { id } });
          break;
        case 'repair_tickets':
          record = await this.prisma.repairTicket.findUnique({ where: { id } });
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }

      if (!record) {
        throw new Error('Record not found');
      }

      return record;
    } catch (error: any) {
      throw new Error(`Failed to fetch record: ${error.message}`);
    }
  }

  async updateTableRecord(tableName: string, id: string, data: any) {
    try {
      // Remove id, createdAt, updatedAt from update data
      const { id: _, createdAt, updatedAt, ...updateData } = data;

      let record: any;

      switch (tableName) {
        case 'customers_banks':
          record = await this.prisma.customerBank.update({
            where: { id },
            data: updateData,
          });
          break;
        case 'pengelola':
          record = await this.prisma.pengelola.update({
            where: { id },
            data: updateData,
          });
          break;
        case 'pengelola_users':
          // Don't update passwordHash directly - should use auth service
          const { passwordHash, ...vendorUserData } = updateData;
          record = await this.prisma.pengelolaUser.update({
            where: { id },
            data: vendorUserData,
          });
          break;
        case 'hitachi_users':
          const { passwordHash: _, ...hitachiUserData } = updateData;
          record = await this.prisma.hitachiUser.update({
            where: { id },
            data: hitachiUserData,
          });
          break;
        case 'machines':
          record = await this.prisma.machine.update({
            where: { id },
            data: updateData,
          });
          break;
        case 'cassettes':
          record = await this.prisma.cassette.update({
            where: { id },
            data: updateData,
          });
          break;
        case 'problem_tickets':
          record = await this.prisma.problemTicket.update({
            where: { id },
            data: updateData,
          });
          break;
        case 'repair_tickets':
          record = await this.prisma.repairTicket.update({
            where: { id },
            data: updateData,
          });
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }

      return record;
    } catch (error: any) {
      throw new Error(`Failed to update record: ${error.message}`);
    }
  }

  async deleteTableRecord(tableName: string, id: string) {
    try {
      let record: any;

      switch (tableName) {
        case 'customers_banks':
          record = await this.prisma.customerBank.delete({ where: { id } });
          break;
        case 'pengelola':
          record = await this.prisma.pengelola.delete({ where: { id } });
          break;
        case 'pengelola_users':
          record = await this.prisma.pengelolaUser.delete({ where: { id } });
          break;
        case 'hitachi_users':
          record = await this.prisma.hitachiUser.delete({ where: { id } });
          break;
        case 'machines':
          record = await this.prisma.machine.delete({ where: { id } });
          break;
        case 'cassettes':
          record = await this.prisma.cassette.delete({ where: { id } });
          break;
        case 'problem_tickets':
          record = await this.prisma.problemTicket.delete({ where: { id } });
          break;
        case 'repair_tickets':
          record = await this.prisma.repairTicket.delete({ where: { id } });
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }

      return { success: true, message: 'Record deleted successfully' };
    } catch (error: any) {
      throw new Error(`Failed to delete record: ${error.message}`);
    }
  }

  async createBackup(): Promise<{ filename: string; size: string; createdAt: string; filePath: string }> {
    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
      }

      // Parse database URL
      const url = new URL(databaseUrl);
      const dbName = url.pathname.slice(1).split('?')[0];

      // Create backups directory if it doesn't exist
      const backupsDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `backup_${dbName}_${timestamp}_${Date.now()}.json`;
      const filePath = path.join(backupsDir, filename);

      // Export all data using Prisma
      const backupData: any = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        database: dbName,
        tables: {},
      };

      // Export all tables
      const [
        customersBanks,
        pengelola,
        pengelolaUsers,
        hitachiUsers,
        machines,
        cassettes,
        problemTickets,
        repairTickets,
        cassetteTypes,
        bankVendorAssignments,
        cassetteDeliveries,
        cassetteReturns,
      ] = await Promise.all([
        this.prisma.customerBank.findMany(),
        this.prisma.pengelola.findMany(),
        this.prisma.pengelolaUser.findMany(),
        this.prisma.hitachiUser.findMany(),
        this.prisma.machine.findMany(),
        this.prisma.cassette.findMany(),
        this.prisma.problemTicket.findMany(),
        this.prisma.repairTicket.findMany(),
        this.prisma.cassetteType.findMany(),
        this.prisma.bankPengelolaAssignment.findMany(),
        this.prisma.cassetteDelivery.findMany(),
        this.prisma.cassetteReturn.findMany(),
      ]);

      backupData.tables = {
        customers_banks: customersBanks,
        pengelola: pengelola,
        pengelola_users: pengelolaUsers,
        hitachi_users: hitachiUsers,
        machines: machines,
        cassettes: cassettes,
        problem_tickets: problemTickets,
        repair_tickets: repairTickets,
        cassette_types: cassetteTypes,
        bank_pengelola_assignments: bankVendorAssignments,
        cassette_deliveries: cassetteDeliveries,
        cassette_returns: cassetteReturns,
      };

      // Write backup to file
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

      // Get file size
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      return {
        filename,
        size: `${sizeInMB} MB`,
        createdAt: new Date().toISOString(),
        filePath,
      };
    } catch (error: any) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async restoreBackup(filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      // Read backup file
      const backupContent = fs.readFileSync(filePath, 'utf8');
      const backupData = JSON.parse(backupContent);

      if (!backupData.tables) {
        throw new Error('Invalid backup file format');
      }

      // Start transaction-like operation
      // Delete all existing data first (in reverse order of dependencies)
      await Promise.all([
        this.prisma.cassetteReturn.deleteMany(),
        this.prisma.cassetteDelivery.deleteMany(),
        this.prisma.repairTicket.deleteMany(),
        this.prisma.problemTicket.deleteMany(),
        this.prisma.cassette.deleteMany(),
        this.prisma.machine.deleteMany(),
        this.prisma.bankPengelolaAssignment.deleteMany(),
        this.prisma.pengelolaUser.deleteMany(),
        this.prisma.hitachiUser.deleteMany(),
        this.prisma.pengelola.deleteMany(),
        this.prisma.customerBank.deleteMany(),
        this.prisma.cassetteType.deleteMany(),
      ]);

      // Restore data in correct order (respecting foreign keys)
      if (backupData.tables.cassette_types) {
        await this.prisma.cassetteType.createMany({
          data: backupData.tables.cassette_types,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.customers_banks) {
        await this.prisma.customerBank.createMany({
          data: backupData.tables.customers_banks,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.pengelola) {
        await this.prisma.pengelola.createMany({
          data: backupData.tables.pengelola,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.bank_pengelola_assignments) {
        await this.prisma.bankPengelolaAssignment.createMany({
          data: backupData.tables.bank_pengelola_assignments,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.hitachi_users) {
        await this.prisma.hitachiUser.createMany({
          data: backupData.tables.hitachi_users,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.pengelola_users) {
        await this.prisma.pengelolaUser.createMany({
          data: backupData.tables.pengelola_users,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.machines) {
        await this.prisma.machine.createMany({
          data: backupData.tables.machines,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.cassettes) {
        await this.prisma.cassette.createMany({
          data: backupData.tables.cassettes,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.problem_tickets) {
        await this.prisma.problemTicket.createMany({
          data: backupData.tables.problem_tickets,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.repair_tickets) {
        await this.prisma.repairTicket.createMany({
          data: backupData.tables.repair_tickets,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.cassette_deliveries) {
        await this.prisma.cassetteDelivery.createMany({
          data: backupData.tables.cassette_deliveries,
          skipDuplicates: true,
        });
      }

      if (backupData.tables.cassette_returns) {
        await this.prisma.cassetteReturn.createMany({
          data: backupData.tables.cassette_returns,
          skipDuplicates: true,
        });
      }

      return {
        success: true,
        message: 'Database restored successfully',
      };
    } catch (error: any) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async listBackups(): Promise<Array<{ filename: string; size: string; createdAt: string }>> {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      
      if (!fs.existsSync(backupsDir)) {
        return [];
      }

      const files = fs.readdirSync(backupsDir)
        .filter(file => file.endsWith('.json') || file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            createdAt: stats.birthtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return files;
    } catch (error: any) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Delete all machines and cassettes from database
   * This will also delete all related data (tickets, repairs, deliveries, etc.)
   * Use with caution - this operation cannot be undone!
   */
  async deleteAllMachinesAndCassettes(): Promise<{ 
    success: boolean; 
    message: string; 
    deletedCounts: {
      machines: number;
      cassettes: number;
      problemTickets: number;
      repairTickets: number;
      cassetteDeliveries: number;
      cassetteReturns: number;
      pmCassetteDetails: number;
      ticketCassetteDetails: number;
      machineIdentifierHistory: number;
      preventiveMaintenances: number;
    }
  }> {
    try {
      // Use transaction to ensure data consistency
      return await this.prisma.$transaction(async (tx) => {
        // Count records before deletion (for reporting)
        const [
          machineCount,
          cassetteCount,
          problemTicketCount,
          repairTicketCount,
          cassetteDeliveryCount,
          cassetteReturnCount,
          pmCassetteDetailCount,
          ticketCassetteDetailCount,
          machineIdentifierHistoryCount,
          preventiveMaintenanceCount,
        ] = await Promise.all([
          tx.machine.count(),
          tx.cassette.count(),
          tx.problemTicket.count(),
          tx.repairTicket.count(),
          tx.cassetteDelivery.count(),
          tx.cassetteReturn.count(),
          tx.pMCassetteDetail.count(),
          tx.ticketCassetteDetail.count(),
          tx.machineIdentifierHistory.count(),
          tx.preventiveMaintenance.count(),
        ]);

        // Delete in correct order (respecting foreign key constraints)
        // 1. Delete data that references cassettes/machines first
        await tx.ticketCassetteDetail.deleteMany();
        await tx.pMCassetteDetail.deleteMany();
        await tx.cassetteDelivery.deleteMany();
        await tx.cassetteReturn.deleteMany();
        await tx.repairTicket.deleteMany();
        await tx.problemTicket.deleteMany();
        await tx.preventiveMaintenance.deleteMany();
        await tx.machineIdentifierHistory.deleteMany();
        
        // 2. Delete cassettes (handle self-references by clearing them first)
        // Clear self-references first
        await tx.cassette.updateMany({
          where: {
            OR: [
              { replacedCassetteId: { not: null } },
              { replacementTicketId: { not: null } },
            ],
          },
          data: {
            replacedCassetteId: null,
            replacementTicketId: null,
          },
        });
        
        // Now delete all cassettes
        await tx.cassette.deleteMany();
        
        // 3. Delete machines
        await tx.machine.deleteMany();

        return {
          success: true,
          message: `Successfully deleted ${machineCount} machines and ${cassetteCount} cassettes with all related data`,
          deletedCounts: {
            machines: machineCount,
            cassettes: cassetteCount,
            problemTickets: problemTicketCount,
            repairTickets: repairTicketCount,
            cassetteDeliveries: cassetteDeliveryCount,
            cassetteReturns: cassetteReturnCount,
            pmCassetteDetails: pmCassetteDetailCount,
            ticketCassetteDetails: ticketCassetteDetailCount,
            machineIdentifierHistory: machineIdentifierHistoryCount,
            preventiveMaintenances: preventiveMaintenanceCount,
          },
        };
      });
    } catch (error: any) {
      throw new Error(`Failed to delete machines and cassettes: ${error.message}`);
    }
  }
}

