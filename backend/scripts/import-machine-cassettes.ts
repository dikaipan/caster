import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface MachineCassetteData {
  machineSerialNumber: string; // SN Mesin
  mainCassettes: string[]; // 5 SN Kaset Utama
  backupCassettes: string[]; // 5 SN Kaset Cadangan
}

interface ImportConfig {
  customerBankCode: string; // Bank code (harus sudah ada di database)
  pengelolaCode: string; // pengelola code (harus sudah ada di database)
  machineModelName?: string; // Default: 'SR7500VS' (options: 'SR7500' or 'SR7500VS')
  physicalLocation?: string; // Default: akan dibuat dari bank name
}

/**
 * Extract cassette type code from serial number
 * Examples:
 * - 76UWRB2SB899406 → RB (contains "RB")
 * - 76UWAB2SW754109 → AB (contains "AB")
 * - 76UWURJB2SW754109 → URJB (contains "URJB")
 */
function extractCassetteTypeFromSN(serialNumber: string): string | undefined {
  const upperSN = serialNumber.toUpperCase();
  
  // Check for URJB first (longer pattern)
  if (upperSN.includes('URJB')) {
    return 'URJB';
  }
  
  // Then check for RB
  if (upperSN.includes('RB')) {
    return 'RB';
  }
  
  // Finally check for AB
  if (upperSN.includes('AB')) {
    return 'AB';
  }
  
  return undefined;
}

function loadMachineCassettesFromCsv(filePath: string): MachineCassetteData[] {
  const csvContent = fs.readFileSync(filePath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  if (!records.length) {
    console.warn('CSV file is empty, no data to import.');
    return [];
  }

  const grouped = new Map<string, { main: string[]; backup: string[] }>();

  records.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1

    const machineSNRaw =
      row['SN Mesin'] ??
      row['SN_Mesin'] ??
      row['SNMesin'] ??
      row['machine_serial_number'];
    const mainCassetteRaw =
      row['SN Kaset'] ??
      row['SN_Kaset'] ??
      row['SNKaset'] ??
      row['main_cassette'];
    const backupCassetteRaw =
      row['SN Kaset Cadangan'] ??
      row['SN_Kaset_Cadangan'] ??
      row['SNKasetCadangan'] ??
      row['backup_cassette'];

    const machineSerialNumber = (machineSNRaw || '').toString().trim();
    const mainCassetteSN = (mainCassetteRaw || '').toString().trim();
    const backupCassetteSN = (backupCassetteRaw || '').toString().trim();

    if (!machineSerialNumber && !mainCassetteSN && !backupCassetteSN) {
      return;
    }

    if (!machineSerialNumber) {
      throw new Error(`Missing SN Mesin at CSV row ${rowNumber}`);
    }

    let entry = grouped.get(machineSerialNumber);
    if (!entry) {
      entry = { main: [], backup: [] };
      grouped.set(machineSerialNumber, entry);
    }

    if (mainCassetteSN) {
      entry.main.push(mainCassetteSN);
    }

    if (backupCassetteSN) {
      entry.backup.push(backupCassetteSN);
    }
  });

  const result: MachineCassetteData[] = [];

  grouped.forEach((value, key) => {
    result.push({
      machineSerialNumber: key,
      mainCassettes: value.main,
      backupCassettes: value.backup,
    });
  });

  return result;
}

async function importMachineCassettes(
  data: MachineCassetteData[],
  config: ImportConfig
) {
  console.log(`\n🚀 Starting machine and cassette import...`);
  console.log(`📊 Total machines to import: ${data.length}`);
  console.log(`📋 Config: Bank=${config.customerBankCode}, pengelola=${config.pengelolaCode}`);

  // Get bank
  const bank = await prisma.customerBank.findUnique({
    where: { bankCode: config.customerBankCode },
  });

  if (!bank) {
    throw new Error(`Bank with code ${config.customerBankCode} not found. Please create the bank first.`);
  }

  // Get pengelola
  const pengelola = await prisma.pengelola.findUnique({
    where: { pengelolaCode: config.pengelolaCode },
  });

  if (!pengelola) {
    throw new Error(`pengelola with code ${config.pengelolaCode} not found. Please create the pengelola first.`);
  }

  const machineResults: Array<{ success: boolean; machineSN: string; error?: string }> = [];
  const cassetteResults: Array<{ success: boolean; cassetteSN: string; error?: string }> = [];

  for (const machineData of data) {
    const { machineSerialNumber, mainCassettes, backupCassettes } = machineData;

    // Validate: harus ada 5 kaset utama dan 5 cadangan
    if (mainCassettes.length !== 5) {
      console.warn(`⚠️  Machine ${machineSerialNumber}: Expected 5 main cassettes, found ${mainCassettes.length}`);
    }
    if (backupCassettes.length !== 5) {
      console.warn(`⚠️  Machine ${machineSerialNumber}: Expected 5 backup cassettes, found ${backupCassettes.length}`);
    }

    // Create or update machine
    try {
      const machineCode = `M-${config.customerBankCode}-${machineSerialNumber.slice(-6)}`;
      
      // Check if machine exists by serial number
      const existingMachine = await prisma.machine.findFirst({
        where: { serialNumberManufacturer: machineSerialNumber },
      });

      let machine;
      if (existingMachine) {
        // Update existing machine
        machine = await prisma.machine.update({
          where: { id: existingMachine.id },
          data: {
            customerBankId: bank.id,
            pengelolaId: pengelola.id,
            machineCode,
            modelName: config.machineModelName || 'SR7500VS',
            physicalLocation: config.physicalLocation || `Bank ${bank.bankName}`,
            status: 'OPERATIONAL',
          },
        });
      } else {
        // Create new machine
        machine = await prisma.machine.create({
          data: {
            customerBankId: bank.id,
            pengelolaId: pengelola.id,
            machineCode,
            modelName: config.machineModelName || 'SR7500VS',
            serialNumberManufacturer: machineSerialNumber,
            physicalLocation: config.physicalLocation || `Bank ${bank.bankName}`,
            status: 'OPERATIONAL',
          },
        });
      }

      machineResults.push({ success: true, machineSN: machineSerialNumber });
      console.log(`  ✅ Machine: ${machineSerialNumber} (${machineCode})`);

      // Import main cassettes (5 kaset utama)
      for (const cassetteSN of mainCassettes) {
        try {
          const cassetteTypeCode = extractCassetteTypeFromSN(cassetteSN);
          
          if (!cassetteTypeCode) {
            throw new Error(`Could not detect cassette type from SN: ${cassetteSN}`);
          }

          const cassetteType = await prisma.cassetteType.findUnique({
            where: { typeCode: cassetteTypeCode as any },
          });

          if (!cassetteType) {
            throw new Error(`Cassette type ${cassetteTypeCode} not found`);
          }

          await prisma.cassette.upsert({
            where: { serialNumber: cassetteSN },
            update: {
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              usageType: 'MAIN',
              machineId: machine.id,
              status: 'OK',
              notes: `Main cassette for machine ${machineSerialNumber}`,
            } as any,
            create: {
              serialNumber: cassetteSN,
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              usageType: 'MAIN',
              machineId: machine.id,
              status: 'OK',
              notes: `Main cassette for machine ${machineSerialNumber}`,
            } as any,
          });

          cassetteResults.push({ success: true, cassetteSN });
          console.log(`    ✅ Main Cassette: ${cassetteSN} (${cassetteTypeCode})`);
        } catch (error: any) {
          cassetteResults.push({ success: false, cassetteSN, error: error.message });
          console.error(`    ❌ Main Cassette: ${cassetteSN} - Error: ${error.message}`);
        }
      }

      // Import backup cassettes (5 kaset cadangan)
      for (const cassetteSN of backupCassettes) {
        try {
          const cassetteTypeCode = extractCassetteTypeFromSN(cassetteSN);
          
          if (!cassetteTypeCode) {
            throw new Error(`Could not detect cassette type from SN: ${cassetteSN}`);
          }

          const cassetteType = await prisma.cassetteType.findUnique({
            where: { typeCode: cassetteTypeCode as any },
          });

          if (!cassetteType) {
            throw new Error(`Cassette type ${cassetteTypeCode} not found`);
          }

          await prisma.cassette.upsert({
            where: { serialNumber: cassetteSN },
            update: {
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              usageType: 'BACKUP',
              machineId: machine.id,
              status: 'OK',
              notes: `Backup cassette for machine ${machineSerialNumber}`,
            } as any,
            create: {
              serialNumber: cassetteSN,
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              usageType: 'BACKUP',
              machineId: machine.id,
              status: 'OK',
              notes: `Backup cassette for machine ${machineSerialNumber}`,
            } as any,
          });

          cassetteResults.push({ success: true, cassetteSN });
          console.log(`    ✅ Backup Cassette: ${cassetteSN} (${cassetteTypeCode})`);
        } catch (error: any) {
          cassetteResults.push({ success: false, cassetteSN, error: error.message });
          console.error(`    ❌ Backup Cassette: ${cassetteSN} - Error: ${error.message}`);
        }
      }
    } catch (error: any) {
      machineResults.push({ success: false, machineSN: machineSerialNumber, error: error.message });
      console.error(`  ❌ Machine: ${machineSerialNumber} - Error: ${error.message}`);
    }
  }

  // Summary
  console.log(`\n📊 Import Summary:`);
  console.log(`   Machines: ${machineResults.filter(r => r.success).length}/${machineResults.length} successful`);
  console.log(`   Cassettes: ${cassetteResults.filter(r => r.success).length}/${cassetteResults.length} successful`);
  
  const totalExpectedCassettes = data.length * 10; // 10 cassettes per machine
  console.log(`   Expected cassettes: ${totalExpectedCassettes}, Actual: ${cassetteResults.length}`);

  return {
    machines: machineResults,
    cassettes: cassetteResults,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || path.join(__dirname, '..', 'data', 'machine-cassettes.json');
  const bankCode = args[1] || 'BNI001'; // Default bank code
  const pengelolaCode = args[2] || 'VND-TAG-001'; // Default pengelola code

  console.log('🚀 Starting machine-cassette import...');
  console.log(`📁 Reading data from: ${filePath}`);
  console.log(`🏦 Bank Code: ${bankCode}`);
  console.log(`🏢 pengelola Code: ${pengelolaCode}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.log('\n💡 Please create a JSON file with the following structure:');
    console.log(`
{
  "machines": [
    {
      "machineSerialNumber": "74UEA43N03-069520",
      "mainCassettes": [
        "76UWAB2SW754319",
        "76UWRB2SB894550",
        "76UWRB2SB894551",
        "76UWRB2SB894516",
        "76UWRB2SB894546"
      ],
      "backupCassettes": [
        "76UWAB2SW751779",
        "76UWRB2SB885798",
        "76UWRB2SB885799",
        "76UWRB2SB885817",
        "76UWRB2SB885807"
      ]
    }
  ]
}
    `);
    process.exit(1);
  }
  const ext = path.extname(filePath).toLowerCase();

  let machinesData: MachineCassetteData[];
  const config: ImportConfig = {
    customerBankCode: bankCode,
    pengelolaCode: pengelolaCode,
  };

  if (ext === '.csv') {
    console.log('Detected CSV file, converting to internal format...');
    machinesData = loadMachineCassettesFromCsv(filePath);
  } else {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);

    if (!importData.machines || !Array.isArray(importData.machines)) {
      throw new Error('Invalid JSON format. Expected "machines" array.');
    }

    machinesData = importData.machines;
    config.machineModelName = importData.machineModelName;
    config.physicalLocation = importData.physicalLocation;
  }

  try {
    await importMachineCassettes(machinesData, config);
    console.log('\n✅ Import completed!');
  } catch (error) {
    console.error('\n❌ Error during import:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

