import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to clear all machines and cassettes data
 * WARNING: This will delete ALL machines and cassettes from the database!
 * 
 * This script will:
 * 1. Delete all cassettes (and related data)
 * 2. Delete all machines
 * 
 * Note: Related data like tickets, deliveries, returns will also be deleted
 * due to CASCADE constraints in the database schema.
 */
async function main() {
  console.log('⚠️  WARNING: This will delete ALL machines and cassettes!');
  console.log('⚠️  Related data (tickets, deliveries, returns) will also be deleted due to CASCADE.\n');

  try {
    // Count existing data
    const machineCount = await prisma.machine.count();
    const cassetteCount = await prisma.cassette.count();

    console.log(`📊 Current data count:`);
    console.log(`   Machines: ${machineCount}`);
    console.log(`   Cassettes: ${cassetteCount}\n`);

    if (machineCount === 0 && cassetteCount === 0) {
      console.log('✅ Database is already empty!\n');
      return;
    }

    console.log('🗑️  Starting deletion...\n');

    // Delete cassettes first (they reference machines)
    console.log('1. Deleting cassettes...');
    const deletedCassettes = await prisma.cassette.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCassettes.count} cassettes\n`);

    // Delete machines
    console.log('2. Deleting machines...');
    const deletedMachines = await prisma.machine.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMachines.count} machines\n`);

    // Verify deletion
    const remainingMachines = await prisma.machine.count();
    const remainingCassettes = await prisma.cassette.count();

    console.log('✅ Deletion completed!');
    console.log(`\n📊 Remaining data:`);
    console.log(`   Machines: ${remainingMachines}`);
    console.log(`   Cassettes: ${remainingCassettes}\n`);

    if (remainingMachines === 0 && remainingCassettes === 0) {
      console.log('✅ All machines and cassettes have been deleted successfully!\n');
    } else {
      console.log('⚠️  Some data may still remain. Please check manually.\n');
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

