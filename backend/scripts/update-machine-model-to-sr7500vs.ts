/**
 * Script to update all machine modelName to SR7500VS
 * 
 * Usage:
 *   npx ts-node backend/scripts/update-machine-model-to-sr7500vs.ts
 * 
 * Or with tsx:
 *   npx tsx backend/scripts/update-machine-model-to-sr7500vs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating all machine modelName to SR7500VS...\n');

  try {
    // Get count of machines that need updating (not SR7500 or SR7500VS)
    const machinesToUpdate = await prisma.machine.count({
      where: {
        modelName: { notIn: ['SR7500', 'SR7500VS'] },
      },
    });

    console.log(`📊 Found ${machinesToUpdate} machine(s) to update\n`);

    if (machinesToUpdate === 0) {
      console.log('✅ All machines already have valid modelName (SR7500 or SR7500VS)');
      return;
    }

    // Update all machines that don't have valid model names
    const result = await prisma.machine.updateMany({
      where: {
        modelName: { notIn: ['SR7500', 'SR7500VS'] },
      },
      data: {
        modelName: 'SR7500VS', // Default to SR7500VS for invalid entries
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Successfully updated ${result.count} machine(s)\n`);

    // Verify the update
    const sampleMachines = await prisma.machine.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        machineCode: true,
        modelName: true,
        serialNumberManufacturer: true,
        updatedAt: true,
      },
    });

    console.log('📋 Sample of updated machines:');
    console.table(sampleMachines);

    // Count by modelName
    const modelNameCounts = await prisma.machine.groupBy({
      by: ['modelName'],
      _count: true,
    });

    console.log('\n📊 Machine count by modelName:');
    console.table(modelNameCounts);

  } catch (error) {
    console.error('❌ Error updating machines:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

