import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to clear all bank-pengelola assignments
 * WARNING: This will delete ALL bank-pengelola assignments from the database!
 * 
 * This script will:
 * 1. Delete all bank-pengelola assignments
 * 
 * Note: This will remove all pengelola assignments to banks.
 * Pengelola can be re-assigned manually later via the assignment menu.
 */
async function main() {
  console.log('⚠️  WARNING: This will delete ALL bank-pengelola assignments!');
  console.log('⚠️  Pengelola assignments will need to be done manually later.\n');

  try {
    // Count existing assignments
    const assignmentCount = await prisma.bankPengelolaAssignment.count();

    console.log(`📊 Current assignment count:`);
    console.log(`   Bank-Pengelola Assignments: ${assignmentCount}\n`);

    if (assignmentCount === 0) {
      console.log('✅ Database is already empty!\n');
      return;
    }

    console.log('🗑️  Starting deletion...\n');

    // Delete all bank-pengelola assignments
    console.log('1. Deleting bank-pengelola assignments...');
    const deletedAssignments = await prisma.bankPengelolaAssignment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAssignments.count} assignments\n`);

    // Verify deletion
    const remainingAssignments = await prisma.bankPengelolaAssignment.count();

    console.log('✅ Deletion completed!');
    console.log(`\n📊 Remaining assignments:`);
    console.log(`   Bank-Pengelola Assignments: ${remainingAssignments}\n`);

    if (remainingAssignments === 0) {
      console.log('✅ All bank-pengelola assignments have been deleted successfully!');
      console.log('💡 Pengelola can now be assigned manually via the assignment menu.\n');
    } else {
      console.log('⚠️  Some assignments may still remain. Please check manually.\n');
    }

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

