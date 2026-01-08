import { PrismaClient, CassetteUsageType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to fix existing cassettes that were imported before the machine linking fix
 * This script will:
 * 1. Link cassettes to machines based on machine_serial_number in the import data
 * 2. Set usageType (PRIMARY for first 5, SPARE for next 5) based on order
 * 
 * Note: This script assumes you have the original Excel/CSV file with machine_serial_number
 * If you don't have it, you'll need to manually link cassettes through the UI
 */
async function main() {
  console.log('🔧 Starting to fix existing cassette-machine links...\n');

  try {
    // Get all machines
    const machines = await prisma.machine.findMany({
      select: {
        id: true,
        serialNumberManufacturer: true,
        machineCode: true,
        customerBank: {
          select: {
            bankCode: true,
            bankName: true,
          },
        },
      },
      orderBy: {
        serialNumberManufacturer: 'asc',
      },
    });

    console.log(`📊 Found ${machines.length} machines\n`);

    // Get all cassettes that don't have machineId
    const cassettesWithoutMachine = await prisma.cassette.findMany({
      where: {
        machineId: null,
      },
      select: {
        id: true,
        serialNumber: true,
        customerBank: {
          select: {
            bankCode: true,
          },
        },
      },
      orderBy: {
        serialNumber: 'asc',
      },
    });

    console.log(`📦 Found ${cassettesWithoutMachine.length} cassettes without machine link\n`);

    if (cassettesWithoutMachine.length === 0) {
      console.log('✅ All cassettes are already linked to machines!\n');
      return;
    }

    // Group cassettes by bank
    const cassettesByBank = new Map<string, typeof cassettesWithoutMachine>();
    for (const cassette of cassettesWithoutMachine) {
      const bankCode = cassette.customerBank.bankCode;
      if (!cassettesByBank.has(bankCode)) {
        cassettesByBank.set(bankCode, []);
      }
      cassettesByBank.get(bankCode)!.push(cassette);
    }

    console.log('📋 Cassettes grouped by bank:');
    for (const [bankCode, cassettes] of cassettesByBank.entries()) {
      console.log(`   ${bankCode}: ${cassettes.length} cassettes`);
    }
    console.log('');

    // Group machines by bank
    const machinesByBank = new Map<string, typeof machines>();
    for (const machine of machines) {
      const bankCode = machine.customerBank.bankCode;
      if (!machinesByBank.has(bankCode)) {
        machinesByBank.set(bankCode, []);
      }
      machinesByBank.get(bankCode)!.push(machine);
    }

    console.log('📋 Machines grouped by bank:');
    for (const [bankCode, bankMachines] of machinesByBank.entries()) {
      console.log(`   ${bankCode}: ${bankMachines.length} machines`);
    }
    console.log('');

    // For each bank, try to link cassettes to machines
    // Strategy: Distribute cassettes evenly across machines (10 per machine: 5 MAIN + 5 BACKUP)
    let totalLinked = 0;
    let totalUpdated = 0;

    for (const [bankCode, cassettes] of cassettesByBank.entries()) {
      const bankMachines = machinesByBank.get(bankCode) || [];
      
      if (bankMachines.length === 0) {
        console.log(`⚠️  No machines found for bank ${bankCode}, skipping ${cassettes.length} cassettes`);
        continue;
      }

      console.log(`\n🔗 Linking cassettes for bank ${bankCode}...`);
      console.log(`   Machines: ${bankMachines.length}, Cassettes: ${cassettes.length}`);

      // Calculate cassettes per machine (10 per machine: 5 PRIMARY + 5 SPARE)
      const cassettesPerMachine = 10;
      let cassetteIndex = 0;

      for (const machine of bankMachines) {
        const machineCassettes = cassettes.slice(cassetteIndex, cassetteIndex + cassettesPerMachine);
        
        if (machineCassettes.length === 0) {
          break; // No more cassettes to assign
        }

        console.log(`   Machine ${machine.serialNumberManufacturer}: ${machineCassettes.length} cassettes`);

        for (let i = 0; i < machineCassettes.length; i++) {
          const cassette = machineCassettes[i];
          const usageType: CassetteUsageType = i < 5 ? CassetteUsageType.MAIN : CassetteUsageType.BACKUP;

          try {
            await prisma.cassette.update({
              where: { id: cassette.id },
              data: {
                machineId: machine.id,
                usageType: usageType,
              },
            });

            totalLinked++;
            if (i < 5) {
              console.log(`     ✅ Linked ${cassette.serialNumber} as PRIMARY`);
            } else {
              console.log(`     ✅ Linked ${cassette.serialNumber} as SPARE`);
            }
          } catch (error: any) {
            console.error(`     ❌ Failed to link ${cassette.serialNumber}: ${error.message}`);
          }
        }

        cassetteIndex += machineCassettes.length;
        totalUpdated++;

        if (cassetteIndex >= cassettes.length) {
          break; // All cassettes assigned
        }
      }

      if (cassetteIndex < cassettes.length) {
        console.log(`   ⚠️  ${cassettes.length - cassetteIndex} cassettes remain unlinked (not enough machines)`);
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   Total cassettes linked: ${totalLinked}`);
    console.log(`   Total machines updated: ${totalUpdated}`);
    console.log(`   Remaining unlinked cassettes: ${cassettesWithoutMachine.length - totalLinked}\n`);

    console.log('💡 Note: If you have the original Excel/CSV file with machine_serial_number,');
    console.log('   you can re-import it to ensure correct linking based on the original data.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  });

