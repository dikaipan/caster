import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  version: string;
  createdAt: string;
  database: string;
  tables: {
    [key: string]: any[];
  };
}

async function restoreFromBackup(backupFilePath: string) {
  console.log('🔄 Starting restore from JSON backup...');
  console.log(`📁 Reading backup file: ${backupFilePath}`);

  if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found: ${backupFilePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(backupFilePath, 'utf-8');
  const backup: BackupData = JSON.parse(fileContent);

  console.log(`\n📊 Backup Info:`);
  console.log(`   Date: ${backup.createdAt}`);
  console.log(`   Database: ${backup.database}`);
  console.log(`   Tables: ${Object.keys(backup.tables).length}`);

  // Show counts
  console.log(`\n📈 Data Counts:`);
  Object.keys(backup.tables).forEach((tableName) => {
    const count = backup.tables[tableName]?.length || 0;
    console.log(`   ${tableName}: ${count} records`);
  });

  // Restore order: Master data first, then dependent data
  const restoreOrder = [
    'cassette_types',
    'customers_banks',
    'pengelola',
    'bank_pengelola_assignments',
    'hitachi_users',
    'pengelola_users',
    'machines',
    'cassettes',
    'problem_tickets',
    'repair_tickets',
    'cassette_deliveries',
    'cassette_returns',
    'preventive_maintenances',
    'pm_cassette_details',
    'ticket_cassette_details',
    'warranty_configurations',
    'refresh_tokens',
  ];

  console.log(`\n🔄 Starting restore process...\n`);

  for (const tableName of restoreOrder) {
    const data = backup.tables[tableName];
    if (!data || data.length === 0) {
      console.log(`⏭️  Skipping ${tableName} (no data)`);
      continue;
    }

    console.log(`📦 Restoring ${tableName} (${data.length} records)...`);

    try {
      // Map table names to Prisma models
      const modelMap: { [key: string]: any } = {
        cassette_types: prisma.cassetteType,
        customers_banks: prisma.customerBank,
        pengelola: prisma.pengelola,
        bank_pengelola_assignments: prisma.bankPengelolaAssignment,
        hitachi_users: prisma.hitachiUser,
        pengelola_users: prisma.pengelolaUser,
        machines: prisma.machine,
        cassettes: prisma.cassette,
        problem_tickets: prisma.problemTicket,
        repair_tickets: prisma.repairTicket,
        cassette_deliveries: prisma.cassetteDelivery,
        cassette_returns: prisma.cassetteReturn,
        preventive_maintenances: prisma.preventiveMaintenance,
        pm_cassette_details: prisma.pMCassetteDetail,
        ticket_cassette_details: prisma.ticketCassetteDetail,
        warranty_configurations: prisma.warrantyConfiguration,
        refresh_tokens: prisma.refreshToken,
      };

      const model = modelMap[tableName];
      if (!model) {
        console.log(`   ⚠️  Model not found for ${tableName}, skipping...`);
        continue;
      }

      // Batch insert for large datasets
      const batchSize = 1000;
      let inserted = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Use createMany for better performance
        // Note: Some models might need individual creates due to relations
        if (tableName === 'machines' || tableName === 'cassettes' || tableName === 'problem_tickets') {
          // These might have relations, use individual creates
          for (const record of batch) {
            try {
              await model.create({
                data: record,
              });
              inserted++;
            } catch (error: any) {
              // Skip duplicates or errors
              if (error.code === 'P2002') {
                // Unique constraint violation - record already exists
                continue;
              }
              console.error(`   ⚠️  Error inserting record: ${error.message}`);
            }
          }
        } else {
          // Use createMany for simple tables
          try {
            await model.createMany({
              data: batch,
              skipDuplicates: true,
            });
            inserted += batch.length;
          } catch (error: any) {
            // Fallback to individual creates if createMany fails
            for (const record of batch) {
              try {
                await model.create({
                  data: record,
                });
                inserted++;
              } catch (err: any) {
                if (err.code === 'P2002') {
                  continue;
                }
                console.error(`   ⚠️  Error inserting record: ${err.message}`);
              }
            }
          }
        }

        if (i % 5000 === 0 && i > 0) {
          console.log(`   ⏳ Progress: ${inserted}/${data.length} records...`);
        }
      }

      console.log(`   ✅ ${tableName}: ${inserted} records restored`);
    } catch (error: any) {
      console.error(`   ❌ Error restoring ${tableName}: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }

  console.log(`\n🎉 Restore completed!\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const backupFile = args[0] || path.join(__dirname, '..', 'backups', 'backup_hcm_development_2025-12-03_1764727982975.json');

  try {
    await restoreFromBackup(backupFile);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

