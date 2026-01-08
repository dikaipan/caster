import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper to determine SO ticket for a repair (same logic as current getSoTicketForRepair)
 */
function determineSoTicketForRepair(repair: any, cassette: any): string | null {
  if (!cassette) return null;

  const referenceTime: Date = repair.createdAt || repair.receivedAtRc;

  type TicketLite = { id: string; ticketNumber: string; status: string; createdAt: Date; closedAt: Date | null };

  const candidates: TicketLite[] = [];

  cassette.deliveries?.forEach((delivery: any) => {
    if (delivery.ticket && !delivery.ticket.deletedAt) {
      candidates.push({
        id: delivery.ticket.id,
        ticketNumber: delivery.ticket.ticketNumber,
        status: delivery.ticket.status,
        createdAt: delivery.ticket.createdAt,
        closedAt: delivery.ticket.closedAt,
      });
    }
  });

  cassette.ticketCassetteDetails?.forEach((detail: any) => {
    if (detail.ticket && !detail.ticket.deletedAt) {
      candidates.push({
        id: detail.ticket.id,
        ticketNumber: detail.ticket.ticketNumber,
        status: detail.ticket.status,
        createdAt: detail.ticket.createdAt,
        closedAt: detail.ticket.closedAt,
      });
    }
  });

  if (candidates.length === 0) return null;

  // First, try to find tickets whose lifetime covers the repair time
  const lifetimeMatches = candidates.filter((t) => {
    if (t.createdAt > referenceTime) return false;
    if (t.closedAt && referenceTime > t.closedAt) return false;
    return true;
  });

  if (lifetimeMatches.length > 0) {
    lifetimeMatches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return lifetimeMatches[lifetimeMatches.length - 1].id;
  }

  // Fallback: choose the latest ticket created before the repair
  const createdBefore = candidates.filter((t) => t.createdAt <= referenceTime);
  const list = createdBefore.length > 0 ? createdBefore : candidates;
  list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return list[list.length - 1].id;
}

async function backfillSoTicketIds() {
  console.log('🔄 Starting backfill of soTicketId for existing repair tickets...');

  try {
    // Get all repair tickets that don't have soTicketId yet
    const repairs = await prisma.repairTicket.findMany({
      where: {
        soTicketId: null,
        deletedAt: null, // Only process non-deleted repairs
      },
      include: {
        cassette: {
          include: {
            deliveries: {
              where: {
                ticket: {
                  deletedAt: null,
                },
              },
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    status: true,
                    createdAt: true,
                    closedAt: true,
                    deletedAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            ticketCassetteDetails: {
              where: {
                ticket: {
                  deletedAt: null,
                },
              },
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    status: true,
                    createdAt: true,
                    closedAt: true,
                    deletedAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 Found ${repairs.length} repair tickets to process`);

    if (repairs.length === 0) {
      console.log('✅ No repair tickets need backfilling. All repairs already have soTicketId.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const repair of repairs) {
      try {
        const soTicketId = determineSoTicketForRepair(repair, repair.cassette);

        if (soTicketId) {
          await prisma.repairTicket.update({
            where: { id: repair.id },
            data: { soTicketId },
          });
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`✅ Progress: ${updated}/${repairs.length} updated...`);
          }
        } else {
          skipped++;
          console.log(`⚠️  Repair ${repair.id} (cassette: ${repair.cassetteId}): No SO ticket found`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error processing repair ${repair.id}:`, error.message);
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped (no SO found): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${repairs.length}`);

    if (updated > 0) {
      console.log('\n✅ Backfill completed successfully!');
    } else {
      console.log('\n⚠️  No repairs were updated. Check if data exists or logic needs adjustment.');
    }
  } catch (error: any) {
    console.error('❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backfill
backfillSoTicketIds()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

