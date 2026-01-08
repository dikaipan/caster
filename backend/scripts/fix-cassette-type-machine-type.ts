/**
 * Script to fix cassette type machine_type values
 * 
 * This script updates machine_type in cassette_types table:
 * - RB and AB → 'VS'
 * - URJB → 'SR'
 * 
 * This fixes incorrect values like 'CRM' that might have been set incorrectly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing cassette type machine_type values...\n');

  try {
    // Update RB to VS
    const rb = await prisma.cassetteType.updateMany({
      where: { typeCode: 'RB' },
      data: { machineType: 'VS' },
    });
    console.log(`✅ Updated RB: ${rb.count} record(s) set to machineType='VS'`);

    // Update AB to VS
    const ab = await prisma.cassetteType.updateMany({
      where: { typeCode: 'AB' },
      data: { machineType: 'VS' },
    });
    console.log(`✅ Updated AB: ${ab.count} record(s) set to machineType='VS'`);

    // Update URJB to SR
    const urjb = await prisma.cassetteType.updateMany({
      where: { typeCode: 'URJB' },
      data: { machineType: 'SR' },
    });
    console.log(`✅ Updated URJB: ${urjb.count} record(s) set to machineType='SR'`);

    // Verify the changes
    console.log('\n📊 Verifying changes...');
    const cassetteTypes = await prisma.cassetteType.findMany({
      orderBy: { typeCode: 'asc' },
    });

    console.log('\nCurrent cassette types:');
    for (const ct of cassetteTypes) {
      console.log(`  - ${ct.typeCode}: machineType='${ct.machineType}'`);
    }

    console.log('\n✅ Script completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during script execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

