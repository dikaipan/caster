/**
 * Quick script to check bank-pengelola assignments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking bank-pengelola assignments...\n');
    
    const assignments = await prisma.bankPengelolaAssignment.findMany({
      include: {
        customerBank: {
          select: {
            bankCode: true,
            bankName: true,
          },
        },
        pengelola: {
          select: {
            pengelolaCode: true,
            companyName: true,
          },
        },
      },
    });
    
    console.log(`📊 Total assignments: ${assignments.length}`);
    
    if (assignments.length > 0) {
      console.log('\n📋 Assignments:');
      assignments.forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.pengelola.companyName} (${a.pengelola.pengelolaCode})`);
        console.log(`     → Bank: ${a.customerBank.bankName} (${a.customerBank.bankCode})`);
        console.log(`     → Status: ${a.status}`);
        console.log(`     → Branches: ${a.assignedBranches || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️ Tidak ada bank-pengelola assignment!');
      console.log('   Pengelola users tidak akan dapat melihat mesin karena tidak ada assignment ke bank.');
    }
    
    // Check banks
    const banks = await prisma.customerBank.findMany({
      select: {
        id: true,
        bankCode: true,
        bankName: true,
        _count: {
          select: {
            machines: true,
          },
        },
      },
    });
    
    console.log('\n📋 Banks:');
    banks.forEach((b) => {
      console.log(`  - ${b.bankName} (${b.bankCode}): ${b._count.machines} mesin`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

