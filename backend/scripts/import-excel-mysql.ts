import { PrismaClient, CassetteTypeCode } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ExcelRecord {
  'SN Mesin': string;
  'SN Kaset': string;
  'SN Kaset Cadangan': string;
  'Tipe Kaset': string;
  'utama/cadangan': string;
  [key: string]: any;
}

function extractCassetteTypeFromSN(serialNumber: string): CassetteTypeCode | undefined {
  if (!serialNumber) return undefined;
  
  const snUpper = serialNumber.toUpperCase();
  
  // Check for cassette type codes in serial number
  if (snUpper.includes('RB')) return 'RB';
  if (snUpper.includes('AB')) return 'AB';
  if (snUpper.includes('URJB')) return 'URJB';
  
  return undefined;
}

function validateCassetteTypeCode(code: string): code is CassetteTypeCode {
  return code === 'RB' || code === 'AB' || code === 'URJB';
}

async function importFromExcel(bankCode: string, pengelolaCode: string, excelFilePath?: string) {
  try {
    console.log('🚀 Excel Import Script for MySQL');
    console.log('================================\n');

    // Determine Excel file path
    let excelFile = excelFilePath;
    if (!excelFile) {
      // Try to find the 1600 machines file
      const possibleFiles = [
        path.join(__dirname, '../data/Progres APK SN kaset BNI 1600 mesin (1600) FIX (1).xlsx'),
        path.join(__dirname, '../data/BNI_CASSETTE_COMPLETE.xlsx'),
        path.join(__dirname, '../data/BNI_CASSETTE_FIXED.xlsx'),
      ];

      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          excelFile = file;
          break;
        }
      }
    }

    if (!excelFile || !fs.existsSync(excelFile)) {
      throw new Error(`Excel file not found. Please provide path to Excel file with 1600 machines data.`);
    }

    console.log(`📄 Reading Excel file: ${excelFile}\n`);

    // Read Excel file
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('mesin') || 
      name.toLowerCase().includes('machine') ||
      name.toLowerCase().includes('data')
    ) || workbook.SheetNames[0];
    
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ExcelRecord[];

    console.log(`📊 Parsed ${records.length} records from Excel sheet: "${sheetName}"\n`);

    // Get bank and pengelola
    const bank = await prisma.customerBank.findUnique({
      where: { bankCode },
    });

    if (!bank) {
      throw new Error(`Bank not found: ${bankCode}`);
    }

    const pengelola = await prisma.pengelola.findUnique({
      where: { pengelolaCode },
    });

    if (!pengelola) {
      throw new Error(`Pengelola not found: ${pengelolaCode}`);
    }

    console.log(`🏢 Bank: ${bank.bankName} (${bank.bankCode})`);
    console.log(`🚚 Pengelola: ${pengelola.companyName} (${pengelola.pengelolaCode})\n`);

    // Get cassette types
    const cassetteTypes = await prisma.cassetteType.findMany();
    const typeMap = new Map(cassetteTypes.map(t => [t.typeCode, t]));
    console.log(`📦 Available cassette types: ${Array.from(typeMap.keys()).join(', ')}\n`);

    // Group records by machine SN
    // Note: In some Excel files, SN Mesin is only filled in the first row of each machine group
    // We need to propagate the SN Mesin to subsequent rows
    const machineGroups = new Map<string, ExcelRecord[]>();
    let currentMachineSN = '';

    for (const record of records) {
      // Check if this row has SN Mesin
      const machineSN = String(record['SN Mesin'] || record['SN_Mesin'] || record['SNMesin'] || '').trim();
      
      if (machineSN) {
        // New machine found, update current
        currentMachineSN = machineSN;
      }
      
      // Skip if we don't have a current machine SN yet
      if (!currentMachineSN) continue;
      
      // Skip if this row doesn't have any cassette data
      const mainCassette = String(record['SN Kaset'] || record['SN_Kaset'] || record['SNKaset'] || '').trim();
      const backupCassette = String(record['SN Kaset Cadangan'] || record['SN_Kaset_Cadangan'] || record['SNKasetCadangan'] || '').trim();
      
      if (!mainCassette && !backupCassette) continue;
      
      // Add SN Mesin to record if it's missing (for grouping)
      if (!record['SN Mesin']) {
        record['SN Mesin'] = currentMachineSN;
      }
      
      if (!machineGroups.has(currentMachineSN)) {
        machineGroups.set(currentMachineSN, []);
      }

      machineGroups.get(currentMachineSN)!.push(record);
    }

    console.log(`🖥️  Unique machines found: ${machineGroups.size}`);

    // Validate: Each machine should have exactly 10 cassettes (5 rows × 2 cassettes)
    const machinesWithWrongCount: string[] = [];
    for (const [machineSN, records] of machineGroups.entries()) {
      let cassetteCount = 0;
      for (const record of records) {
        if (String(record['SN Kaset'] || '').trim()) cassetteCount++;
        if (String(record['SN Kaset Cadangan'] || '').trim()) cassetteCount++;
      }
      if (cassetteCount !== 10) {
        machinesWithWrongCount.push(`${machineSN} (${cassetteCount} cassettes)`);
      }
    }

    if (machinesWithWrongCount.length > 0) {
      console.log(`\n⚠️  Warning: ${machinesWithWrongCount.length} machines don't have exactly 10 cassettes:`);
      machinesWithWrongCount.slice(0, 10).forEach(m => console.log(`   - ${m}`));
      if (machinesWithWrongCount.length > 10) {
        console.log(`   ... and ${machinesWithWrongCount.length - 10} more`);
      }
      console.log(`\n💡 Script will process only the first 5 rows (10 cassettes) for each machine.`);
      console.log(`   Machines with less than 10 cassettes will be imported with available cassettes.\n`);
    }

    console.log('\n🔄 Starting import with batch processing...\n');

    let machineCount = 0;
    let cassetteCount = 0;
    let skippedMachines = 0;
    let skippedCassettes = 0;
    const errors: string[] = [];
    const machinesWithIncorrectCount: Array<{ machineSN: string; count: number }> = [];

    // Process in batches to avoid memory issues and timeout
    const BATCH_SIZE = 50; // Process 50 machines at a time
    const machineEntries = Array.from(machineGroups.entries());
    const totalBatches = Math.ceil(machineEntries.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, machineEntries.length);
      const batch = machineEntries.slice(batchStart, batchEnd);

      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (machines ${batchStart + 1}-${batchEnd})...`);

      for (const [machineSN, records] of batch) {
        try {
          // Check if machine already exists
          const existingMachine = await prisma.machine.findFirst({
            where: { serialNumberManufacturer: machineSN },
          });

          let machineId: string;

          if (existingMachine) {
            machineId = existingMachine.id;
            skippedMachines++;
            console.log(`   ⏭️  Machine ${machineSN} already exists, skipping...`);
          } else {
            // Create machine
            const machine = await prisma.machine.create({
              data: {
                customerBankId: bank.id,
                pengelolaId: pengelola.id,
                machineCode: `M-${bankCode}-${machineSN.slice(-6)}`,
                modelName: 'SR7500VS',
                serialNumberManufacturer: machineSN,
                physicalLocation: 'Imported from Excel',
                status: 'OPERATIONAL',
                notes: `Imported from Excel - ${records.length} rows`,
              },
            });

            machineId = machine.id;
            machineCount++;

            if (machineCount % 10 === 0) {
              console.log(`   ✅ Created ${machineCount} machines...`);
            }
          }

          // Import cassettes for this machine
          // CRITICAL: Each record has 2 cassettes: "SN Kaset" (MAIN) and "SN Kaset Cadangan" (BACKUP)
          // We process in order to maintain the correct relationship
          // Format: 5 rows per machine = 10 cassettes total (5 MAIN + 5 BACKUP)
          // If machine has more than 5 rows, we only take first 5 rows (10 cassettes)
          // If machine has less than 5 rows, we process all available rows
          const cassettesToCreate: Array<{
            serialNumber: string;
            cassetteTypeId: string;
            usageType: 'MAIN' | 'BACKUP';
            order: number; // Order to maintain relationship
          }> = [];

          // Process records in order (max 5 rows = 10 cassettes)
          // This ensures we only import exactly 10 cassettes even if Excel has more rows
          const limitedRecords = records.slice(0, 5);
          
          // Count actual cassettes in limited records
          let actualCassetteCount = 0;
          for (const record of limitedRecords) {
            if (String(record['SN Kaset'] || '').trim()) actualCassetteCount++;
            if (String(record['SN Kaset Cadangan'] || '').trim()) actualCassetteCount++;
          }
          
          // Track machines with incorrect cassette count
          if (actualCassetteCount !== 10) {
            machinesWithIncorrectCount.push({ machineSN, count: actualCassetteCount });
            if (actualCassetteCount < 10) {
              console.log(`   ⚠️  Machine ${machineSN}: Only ${actualCassetteCount} cassettes found (expected 10) - will import available cassettes`);
            } else {
              console.log(`   ⚠️  Machine ${machineSN}: Found ${actualCassetteCount} cassettes (expected 10) - will import first 10 only`);
            }
          }
          
          for (let i = 0; i < limitedRecords.length; i++) {
            const record = limitedRecords[i];
            
            // MAIN cassette (SN Kaset) - Order: 0, 2, 4, 6, 8
            const mainSN = String(record['SN Kaset'] || '').trim();
            if (mainSN) {
              const extractedType = extractCassetteTypeFromSN(mainSN);
              const excelType = String(record['Tipe Kaset'] || '').trim().toUpperCase();
              const rawTypeCode = extractedType || excelType || 'RB';
              
              // Validate and cast to CassetteTypeCode
              const cassetteTypeCode: CassetteTypeCode = validateCassetteTypeCode(rawTypeCode) 
                ? rawTypeCode 
                : 'RB'; // Default to RB if invalid
              
              const cassetteType = typeMap.get(cassetteTypeCode);
              if (cassetteType) {
                cassettesToCreate.push({
                  serialNumber: mainSN,
                  cassetteTypeId: cassetteType.id,
                  usageType: 'MAIN',
                  order: i * 2, // 0, 2, 4, 6, 8
                });
              } else {
                errors.push(`Machine ${machineSN}: Cassette type "${cassetteTypeCode}" not found for ${mainSN}`);
              }
            }

            // BACKUP cassette (SN Kaset Cadangan) - Order: 1, 3, 5, 7, 9
            const backupSN = String(record['SN Kaset Cadangan'] || '').trim();
            if (backupSN) {
              const extractedType = extractCassetteTypeFromSN(backupSN);
              const excelType = String(record['Tipe Kaset'] || '').trim().toUpperCase();
              const rawTypeCode = extractedType || excelType || 'RB';
              
              // Validate and cast to CassetteTypeCode
              const cassetteTypeCode: CassetteTypeCode = validateCassetteTypeCode(rawTypeCode) 
                ? rawTypeCode 
                : 'RB'; // Default to RB if invalid
              
              const cassetteType = typeMap.get(cassetteTypeCode);
              if (cassetteType) {
                cassettesToCreate.push({
                  serialNumber: backupSN,
                  cassetteTypeId: cassetteType.id,
                  usageType: 'BACKUP',
                  order: i * 2 + 1, // 1, 3, 5, 7, 9
                });
              } else {
                errors.push(`Machine ${machineSN}: Cassette type "${cassetteTypeCode}" not found for ${backupSN}`);
              }
            }
          }

          // Sort by order to maintain correct sequence
          cassettesToCreate.sort((a, b) => a.order - b.order);

          // Create cassettes in transaction to ensure all cassettes are linked to the same machine
          // This prevents cassettes from being mixed up between machines
          await prisma.$transaction(async (tx) => {
            for (const cassetteData of cassettesToCreate) {
              try {
                // Check if cassette already exists
                const existingCassette = await tx.cassette.findUnique({
                  where: { serialNumber: cassetteData.serialNumber },
                });

                if (existingCassette) {
                  // Update existing cassette to link to this machine
                  await tx.cassette.update({
                    where: { id: existingCassette.id },
                    data: {
                      machineId: machineId,
                      usageType: cassetteData.usageType,
                      customerBankId: bank.id,
                    },
                  });
                  skippedCassettes++;
                } else {
                  // Create new cassette
                  await tx.cassette.create({
                    data: {
                      serialNumber: cassetteData.serialNumber,
                      cassetteTypeId: cassetteData.cassetteTypeId,
                      customerBankId: bank.id,
                      machineId: machineId,
                      usageType: cassetteData.usageType,
                      status: 'OK',
                      notes: `Imported from Excel - ${cassetteData.usageType} cassette #${cassetteData.order + 1} for machine ${machineSN}`,
                    },
                  });
                  cassetteCount++;
                }
              } catch (error: any) {
                // If cassette serial number already exists (unique constraint), skip it
                if (error.code === 'P2002') {
                  skippedCassettes++;
                } else {
                  throw error; // Re-throw to rollback transaction
                }
              }
            }
          }, {
            timeout: 30000, // 30 second timeout for transaction
          });

        } catch (error: any) {
          errors.push(`Machine ${machineSN}: ${error.message}`);
          console.error(`   ❌ Error processing machine ${machineSN}:`, error.message);
        }
      }

      console.log(`   ✅ Batch ${batchIndex + 1} completed. Progress: ${machineCount} machines, ${cassetteCount} cassettes\n`);
    }

    console.log('\n✅ Import completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Machines created: ${machineCount}`);
    console.log(`   - Machines skipped (already exist): ${skippedMachines}`);
    console.log(`   - Cassettes created: ${cassetteCount}`);
    console.log(`   - Cassettes skipped (already exist): ${skippedCassettes}`);
    console.log(`   - Total machines processed: ${machineGroups.size}`);
    console.log(`   - Machines with incorrect cassette count: ${machinesWithIncorrectCount.length}`);
    if (machinesWithIncorrectCount.length > 0) {
      console.log(`\n⚠️  Machines with incorrect cassette count:`);
      machinesWithIncorrectCount.slice(0, 10).forEach(m => {
        const status = m.count < 10 ? '⚠️  LESS' : '⚠️  MORE';
        console.log(`   ${status}: ${m.machineSN} (${m.count} cassettes instead of 10)`);
      });
      if (machinesWithIncorrectCount.length > 10) {
        console.log(`   ... and ${machinesWithIncorrectCount.length - 10} more`);
      }
    }
    console.log(`   - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 20) {
        console.log(`   ... and ${errors.length - 20} more errors`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error during import:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bankCode = args[0] || 'BNI';
  const pengelolaCode = args[1] || 'VND-TAG-001';
  const excelFilePath = args[2]; // Optional: path to Excel file

  try {
    await importFromExcel(bankCode, pengelolaCode, excelFilePath);
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

