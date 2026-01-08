/**
 * Quick script to check users
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking users...\n');
    
    const hitachiUsers = await prisma.hitachiUser.findMany({
      select: { id: true, username: true, role: true, department: true }
    });
    console.log('📋 Hitachi Users:');
    hitachiUsers.forEach((u) => {
      console.log(`  - ${u.username} (${u.role}, ${u.department || 'No dept'})`);
    });
    
    const pengelolaUsers = await prisma.pengelolaUser.findMany({
      select: { 
        id: true, 
        username: true, 
        role: true, 
        pengelolaId: true,
        pengelola: { select: { companyName: true, pengelolaCode: true } }
      }
    });
    console.log('\n📋 Pengelola Users:');
    pengelolaUsers.forEach((u) => {
      console.log(`  - ${u.username} (${u.role}) → ${u.pengelola?.companyName || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

