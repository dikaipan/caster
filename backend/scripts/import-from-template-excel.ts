/**
 * Script to import machines and cassettes from Excel template format
 * 
 * This script imports from Excel file with template format:
 * - Sheet: "Machine-Cassette"
 * - Columns: machine_serial_number, cassette_serial_number, bank_code, pengelola_code
 * 
 * Usage:
 *   npm run import:template-excel [bankCode] [pengelolaCode] [excelFilePath]
 * 
 * Example:
 *   npm run import:template-excel BNI PGL-TAG-001 data/BNI_TEMPLATE_FORMAT.xlsx
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface TemplateRecord {
  machine_serial_number?: string;
  cassette_serial_number?: string;
  bank_code?: string;
  pengelola_code?: string;
  [key: string]: any;
}

/**
 * Extract cassette type code from serial number
 */
function extractCassetteTypeFromSN(serialNumber: string): string | undefined {
  if (!serialNumber) return undefined;
  
  const snUpper = serialNumber.toUpperCase();
  
  // Check for cassette type codes in serial number
  if (snUpper.includes('URJB')) return 'URJB';
  if (snUpper.includes('RB')) return 'RB';
  if (snUpper.includes('AB')) return 'AB';
  
  return undefined;
}

async function importFromTemplateExcel(
  bankCode: string,
  pengelolaCode: string,
  excelFilePath?: string
) {
  try {
    console.log('🚀 Excel Template Import Script');
    console.log('================================\n');

    // Determine Excel file path
    let excelFile = excelFilePath;
    if (!excelFile) {
      // Try to find template file
      const possibleFiles = [
        path.join(__dirname, '../data/BNI_TEMPLATE_FORMAT.xlsx'),
        path.join(__dirname, '../data/BNI_CASSETTE_COMPLETE.xlsx'),
      ];

      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          excelFile = file;
          break;
        }
      }
    }

    if (!excelFile || !fs.existsSync(excelFile)) {
      throw new Error(
        `Excel file not found. Please provide path to Excel file.\n` +
        `Usage: npm run import:template-excel [bankCode] [pengelolaCode] [excelFilePath]`
      );
    }

    console.log(`📄 Reading Excel file: ${excelFile}\n`);

    // Read Excel file
    const workbook = XLSX.readFile(excelFile);
    
    // Find Machine-Cassette sheet
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('machine-cassette') ||
      name.toLowerCase().includes('machine') ||
      name.toLowerCase().includes('cassette')
    ) || workbook.SheetNames[0];
    
    console.log(`📊 Reading sheet: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as TemplateRecord[];

    console.log(`📊 Parsed ${records.length} records from Excel\n`);

    // Get bank
    const bank = await prisma.customerBank.findUnique({
      where: { bankCode },
    });

    if (!bank) {
      throw new Error(`Bank not found: ${bankCode}`);
    }

    // Get pengelola (optional)
    let pengelola: { id: string; companyName: string } | null = null;
    if (pengelolaCode) {
      const foundPengelola = await prisma.pengelola.findUnique({
        where: { pengelolaCode },
        select: { id: true, companyName: true },
      });

      if (!foundPengelola) {
        console.warn(`⚠️  Pengelola ${pengelolaCode} not found. Import will continue without pengelola assignment.`);
      } else {
        pengelola = foundPengelola;
      }
    }

    console.log(`🏢 Bank: ${bank.bankName} (${bank.bankCode})`);
    if (pengelola) {
      console.log(`🚚 Pengelola: ${pengelola.companyName} (${pengelolaCode})`);
    } else {
      console.log(`🚚 Pengelola: Not assigned (can be assigned later)`);
    }
    console.log('');

    // Get cassette types
    const cassetteTypes = await prisma.cassetteType.findMany();
    const typeMap = new Map<string, typeof cassetteTypes[0]>(cassetteTypes.map(t => [t.typeCode, t]));
    console.log(`📦 Available cassette types: ${Array.from(typeMap.keys()).join(', ')}\n`);

    // Track processed machines
    const processedMachines = new Map<string, string>();
    const machineCassetteCounts = new Map<string, number>();

    let machineCount = 0;
    let cassetteCount = 0;
    let skippedMachines = 0;
    let skippedCassettes = 0;
    const errors: string[] = [];

    console.log('🔄 Starting import...\n');

    // Process records in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);

      if (i > 0) {
        console.log(`📦 Processing batch ${batchNum}/${totalBatches} (records ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)})...`);
      }

      for (const record of batch) {
        try {
          const machineSN = String(record.machine_serial_number || '').trim();
          const cassetteSN = String(record.cassette_serial_number || '').trim();
          const recordBankCode = String(record.bank_code || bankCode).trim();

          // Skip if no cassette serial number
          if (!cassetteSN) {
            continue;
          }

          // Process machine if provided
          let machineId: string | null = null;
          if (machineSN && !processedMachines.has(machineSN)) {
            try {
              // Check if machine exists
              const existingMachine = await prisma.machine.findFirst({
                where: { serialNumberManufacturer: machineSN },
              });

              if (existingMachine) {
                machineId = existingMachine.id;
                skippedMachines++;
              } else {
                // Create new machine
                const machineCode = `M-${recordBankCode}-${machineSN.slice(-8).replace(/[^A-Z0-9]/g, '') || machineSN.slice(-6)}`;
                const machine = await prisma.machine.create({
                  data: {
                    customerBankId: bank.id,
                    machineCode,
                    modelName: 'SR7500VS',
                    serialNumberManufacturer: machineSN,
                    physicalLocation: `Bank ${bank.bankName}`,
                    status: 'OPERATIONAL',
                    ...(pengelola && { pengelolaId: pengelola.id }),
                  },
                });

                machineId = machine.id;
                machineCount++;

                if (machineCount % 50 === 0) {
                  console.log(`   ✅ Created ${machineCount} machines...`);
                }
              }

              processedMachines.set(machineSN, machineId);
            } catch (error: any) {
              if (error.code === 'P2002') {
                // Duplicate machine code, try to find existing
                const existingMachine = await prisma.machine.findFirst({
                  where: { serialNumberManufacturer: machineSN },
                });
                if (existingMachine) {
                  machineId = existingMachine.id;
                  processedMachines.set(machineSN, machineId);
                }
              } else {
                errors.push(`Machine ${machineSN}: ${error.message}`);
              }
            }
          } else if (machineSN && processedMachines.has(machineSN)) {
            machineId = processedMachines.get(machineSN) || null;
          }

          // Process cassette
          try {
            // Auto-detect cassette type
            let cassetteTypeCode = extractCassetteTypeFromSN(cassetteSN);
            if (!cassetteTypeCode) {
              cassetteTypeCode = 'RB'; // Default
              console.warn(`   ⚠️  Could not detect cassette type from SN: ${cassetteSN}, defaulting to RB`);
            }

            const cassetteType = typeMap.get(cassetteTypeCode);
            if (!cassetteType) {
              throw new Error(`Cassette type ${cassetteTypeCode} not found`);
            }

            // Determine usage type (MAIN or BACKUP) based on order
            let usageType: 'MAIN' | 'BACKUP' | undefined = undefined;
            if (machineSN && machineId) {
              const currentCount = machineCassetteCounts.get(machineSN) || 0;
              usageType = currentCount < 5 ? 'MAIN' : 'BACKUP';
              machineCassetteCounts.set(machineSN, currentCount + 1);
            }

            // Create or update cassette
            await prisma.cassette.upsert({
              where: { serialNumber: cassetteSN },
              update: {
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                ...(machineId && { machineId }),
                ...(usageType && { usageType }),
              },
              create: {
                serialNumber: cassetteSN,
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                ...(machineId && { machineId }),
                ...(usageType && { usageType }),
              },
            });

            cassetteCount++;

            if (cassetteCount % 500 === 0) {
              console.log(`   ✅ Imported ${cassetteCount} cassettes...`);
            }
          } catch (error: any) {
            if (error.code === 'P2002') {
              skippedCassettes++;
            } else {
              errors.push(`Cassette ${cassetteSN}: ${error.message}`);
            }
          }
        } catch (error: any) {
          errors.push(`Record: ${error.message}`);
        }
      }
    }

    // Summary
    console.log('\n📊 Import Summary:');
    console.log(`   Machines: ${machineCount} created, ${skippedMachines} skipped`);
    console.log(`   Cassettes: ${cassetteCount} imported, ${skippedCassettes} skipped`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors (${errors.length}):`);
      errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 20) {
        console.log(`   ... and ${errors.length - 20} more errors`);
      }
    }

    console.log('\n✅ Import completed!\n');
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bankCode = args[0] || 'BNI';
  const pengelolaCode = args[1] || 'PGL-TAG-001';
  const excelFilePath = args[2]; // Optional: path to Excel file

  try {
    await importFromTemplateExcel(bankCode, pengelolaCode, excelFilePath);
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

