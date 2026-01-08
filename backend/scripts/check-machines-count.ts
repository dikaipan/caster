/**
 * Quick script to check machines count in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking machines in database...\n');
    
    const totalMachines = await prisma.machine.count();
    console.log(`📊 Total machines: ${totalMachines}`);
    
    if (totalMachines > 0) {
      const sampleMachines = await prisma.machine.findMany({
        take: 5,
        select: {
          id: true,
          machineCode: true,
          serialNumberManufacturer: true,
          modelName: true,
          status: true,
          customerBank: {
            select: {
              bankCode: true,
              bankName: true,
            },
          },
        },
      });
      
      console.log(`\n📋 Sample machines (first 5):`);
      sampleMachines.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.machineCode} - ${m.serialNumberManufacturer} (${m.status}) - Bank: ${m.customerBank.bankCode}`);
      });
    }
    
    const cassettesCount = await prisma.cassette.count();
    console.log(`\n📊 Total cassettes: ${cassettesCount}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

