import { PrismaClient } from '@prisma/client';
import { StatusTransitionValidator } from '../src/common/validators/status-transition.validator';
import { MultiCassetteValidator } from '../src/common/validators/multi-cassette.validator';

const prisma = new PrismaClient();

async function fixStuckReceivedTickets() {
  console.log('\n=== Fixing Stuck RECEIVED Tickets ===\n');

  try {
    // Find all tickets that are RECEIVED but have repair tickets
    const stuckTickets = await prisma.problemTicket.findMany({
      where: {
        status: 'RECEIVED',
        deletedAt: null,
      },
      include: {
        cassetteDetails: {
          include: {
            cassette: {
              select: {
                id: true,
                serialNumber: true,
              },
            },
          },
        },
        cassetteDelivery: {
          include: {
            cassette: {
              select: {
                id: true,
                serialNumber: true,
              },
            },
          },
        },
        cassette: {
          select: {
            id: true,
            serialNumber: true,
          },
        },
      },
    });

    console.log(`Found ${stuckTickets.length} tickets with status RECEIVED\n`);

    let fixed = 0;
    let errors = 0;

    for (const ticket of stuckTickets) {
      try {
        // Get all cassettes for this ticket
        const cassetteIds: string[] = [];
        
        if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
          ticket.cassetteDetails.forEach((detail: any) => {
            if (detail.cassette?.id) {
              cassetteIds.push(detail.cassette.id);
            }
          });
        } else if (ticket.cassetteDelivery?.cassette) {
          cassetteIds.push(ticket.cassetteDelivery.cassette.id);
        } else if (ticket.cassette) {
          cassetteIds.push(ticket.cassette.id);
        }

        if (cassetteIds.length === 0) {
          console.log(`⚠️  ${ticket.ticketNumber}: No cassettes found, skipping`);
          continue;
        }

        // Check if there are any repair tickets for these cassettes
        const repairTickets = await prisma.repairTicket.findMany({
          where: {
            cassetteId: { in: cassetteIds },
            createdAt: { gte: ticket.createdAt },
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            cassetteId: true,
            createdAt: true,
          },
        });

        if (repairTickets.length > 0) {
          console.log(`🔧 ${ticket.ticketNumber}: Found ${repairTickets.length} repair ticket(s), checking status...`);
          
          // Get latest repair ticket per cassette
          const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string }>();
          for (const rt of repairTickets) {
            if (!latestRepairsMap.has(rt.cassetteId)) {
              latestRepairsMap.set(rt.cassetteId, {
                id: rt.id,
                status: rt.status,
                cassetteId: rt.cassetteId,
              });
            }
          }

          const latestRepairs = Array.from(latestRepairsMap.values());

          // Use MultiCassetteValidator to check if all repairs are completed
          const validationResult = MultiCassetteValidator.validateAllRepairsCompleted(
            cassetteIds.map(id => ({ id, serialNumber: '', status: '' })),
            latestRepairs.map(r => ({ cassetteId: r.cassetteId, status: r.status }))
          );

          const oldStatus = ticket.status;
          let newStatus = oldStatus;
          let reason = '';

          // Determine new status
          if (oldStatus === 'RECEIVED' || oldStatus === 'IN_PROGRESS') {
            if (validationResult.allCompleted) {
              newStatus = 'RESOLVED';
              reason = `All ${validationResult.completedCount} repair ticket(s) completed`;
            } else if (latestRepairs.length > 0) {
              newStatus = 'IN_PROGRESS';
              reason = `${validationResult.completedCount}/${cassetteIds.length} repair ticket(s) completed, ${validationResult.pendingCount} pending`;
            }
          }

          if (newStatus !== oldStatus) {
            try {
              // Validate transition
              StatusTransitionValidator.validateTicketTransition(oldStatus, newStatus, {
                allRepairsCompleted: validationResult.allCompleted,
                hasDelivery: !!ticket.cassetteDelivery,
                hasReturn: false,
              });

              // Update ticket status
              await prisma.problemTicket.update({
                where: { id: ticket.id },
                data: {
                  status: newStatus as any,
                  resolvedAt: newStatus === 'RESOLVED' ? new Date() : null,
                },
              });

              console.log(`   ✅ Updated: ${oldStatus} → ${newStatus}`);
              console.log(`   📝 Reason: ${reason}`);
              fixed++;
            } catch (validationError: any) {
              console.log(`   ⚠️  Validation failed: ${validationError.message}`);
              errors++;
            }
          } else {
            console.log(`   ℹ️  Status already correct: ${oldStatus}`);
          }
        } else {
          console.log(`ℹ️  ${ticket.ticketNumber}: No repair tickets found, status is correct`);
        }
      } catch (error: any) {
        console.error(`❌ Error fixing ${ticket.ticketNumber}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Fix completed!`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total checked: ${stuckTickets.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixStuckReceivedTickets()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  });

