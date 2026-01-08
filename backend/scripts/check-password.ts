/**
 * Quick script to check admin password
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking admin user...\n');
    
    const admin = await prisma.hitachiUser.findUnique({ 
      where: { username: 'admin' },
      select: { id: true, username: true, passwordHash: true, role: true }
    });
    
    if (admin) {
      console.log('✅ Admin user found');
      console.log(`   Role: ${admin.role}`);
      
      // Test various passwords
      const passwords = ['Admin123!', 'Admin@123', 'admin123', 'admin'];
      for (const pwd of passwords) {
        const isMatch = await bcrypt.compare(pwd, admin.passwordHash);
        console.log(`   Password "${pwd}" matches: ${isMatch}`);
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

