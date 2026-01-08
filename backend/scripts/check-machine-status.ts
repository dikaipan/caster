/**
 * Quick script to check machine assignment status in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking machine assignment status...\n');
    
    const assigned = await prisma.machine.count({ where: { pengelolaId: { not: null } } });
    const unassigned = await prisma.machine.count({ where: { pengelolaId: null } });
    
    console.log(`📊 Machines assigned to pengelola: ${assigned}`);
    console.log(`📊 Machines unassigned: ${unassigned}`);
    console.log(`📊 Total machines: ${assigned + unassigned}`);
    
    // Check pengelola list
    const pengelolaList = await prisma.pengelola.findMany({
      select: {
        id: true,
        companyName: true,
        pengelolaCode: true,
        _count: {
          select: {
            machines: true,
          },
        },
      },
    });
    
    console.log('\n📋 Pengelola dengan mesin:');
    pengelolaList.forEach((p) => {
      console.log(`  - ${p.companyName} (${p.pengelolaCode}): ${p._count.machines} mesin`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

