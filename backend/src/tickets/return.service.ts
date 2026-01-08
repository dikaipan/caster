import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto, ReceiveReturnDto } from './dto';

@Injectable()
export class ReturnService {
    private readonly logger = new Logger(ReturnService.name);

    constructor(private prisma: PrismaService) { }

    async createReturn(createDto: CreateReturnDto, userId: string, userType: string) {
        try {
            this.logger.debug(`Confirming pickup: ticketId=${createDto.ticketId}, userId=${userId}, userType=${userType}`);

            // Only RC staff can confirm pickup (they handle the pickup confirmation on behalf of Pengelola)
            if (userType !== 'HITACHI') {
                throw new ForbiddenException('Only RC staff can confirm pickup');
            }

            // Verify ticket exists and is RESOLVED
            // Include cassetteDetails to check for replacement requests
            const ticket = await this.prisma.problemTicket.findUnique({
                where: { id: createDto.ticketId },
                include: {
                    cassetteDelivery: {
                        include: {
                            cassette: true,
                        },
                    },
                    cassetteDetails: {
                        include: {
                            cassette: {
                                select: {
                                    id: true,
                                    serialNumber: true,
                                    status: true,
                                },
                            },
                        },
                        // Include requestReplacement and replacementReason fields
                    },
                },
            });

            if (!ticket) {
                throw new NotFoundException('Ticket not found');
            }

            // Get full ticket with machine info
            const fullTicket = await this.prisma.problemTicket.findUnique({
                where: { id: createDto.ticketId },
                include: {
                    machine: true,
                },
            });

            if (!fullTicket) {
                throw new NotFoundException('Ticket not found');
            }

            // Check if ticket is RESOLVED OR if all repair tickets are completed (for multi-cassette tickets)
            // This handles cases where backend status hasn't synced yet but all repairs are done
            let canConfirmPickup = ticket.status === 'RESOLVED';

            if (!canConfirmPickup) {
                // Check if all repair tickets are completed (even if ticket.status is still IN_PROGRESS)
                const ticketCreatedAt = ticket.createdAt;

                // Get all cassette IDs from this ticket
                const cassetteIds: string[] = [];
                if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
                    ticket.cassetteDetails.forEach((detail: any) => {
                        if (detail.cassette?.id) {
                            cassetteIds.push(detail.cassette.id);
                        }
                    });
                } else if (ticket.cassetteDelivery?.cassette?.id) {
                    cassetteIds.push(ticket.cassetteDelivery.cassette.id);
                }

                if (cassetteIds.length > 0) {
                    // Find all repair tickets for these cassettes created after ticket creation
                    const allRepairTicketsRaw = await this.prisma.repairTicket.findMany({
                        where: {
                            cassetteId: { in: cassetteIds },
                            createdAt: { gte: ticketCreatedAt },
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            status: true,
                            cassetteId: true,
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                    });

                    // Get latest repair ticket per cassette
                    const latestRepairsMap = new Map<string, { id: string; status: string; cassetteId: string; createdAt: Date }>();
                    for (const rt of allRepairTicketsRaw) {
                        if (!latestRepairsMap.has(rt.cassetteId)) {
                            latestRepairsMap.set(rt.cassetteId, rt);
                        }
                    }
                    const latestRepairs = Array.from(latestRepairsMap.values());

                    // Check if we have repair tickets for all cassettes and all are COMPLETED
                    const expectedRepairCount = cassetteIds.length;
                    const actualRepairCount = latestRepairs.length;
                    const allCompleted = actualRepairCount === expectedRepairCount &&
                        latestRepairs.every(rt => rt.status === 'COMPLETED');

                    if (allCompleted) {
                        canConfirmPickup = true;
                        this.logger.debug(`Pickup allowed: All ${actualRepairCount}/${expectedRepairCount} repair tickets are COMPLETED, even though ticket.status is ${ticket.status}`);
                    }
                }
            }

            if (!canConfirmPickup) {
                throw new BadRequestException(
                    `Cannot confirm pickup for ticket with status ${ticket.status}. Ticket must be RESOLVED or all repair tickets must be COMPLETED first.`,
                );
            }

            if (!ticket.cassetteDelivery) {
                throw new BadRequestException('No delivery found for this ticket. Cannot create return.');
            }

            // Check if return already exists
            const existingReturn = await (this.prisma as any).cassetteReturn.findUnique({
                where: { ticketId: createDto.ticketId },
            });

            // If return already exists, pickup has already been confirmed
            if (existingReturn) {
                throw new BadRequestException('Pickup confirmation already exists for this ticket');
            }

            // Check if this is a replacement ticket
            // requestReplacement is stored in cassetteDetails (not at ticket level)
            const isReplacementTicket = ticket.cassetteDetails &&
                ticket.cassetteDetails.some((detail: any) => detail.requestReplacement === true);

            this.logger.debug(`Checking replacement ticket: ticketId=${createDto.ticketId}, detailsCount=${ticket.cassetteDetails?.length || 0}, isReplacement=${isReplacementTicket}`);

            let cassette: any;

            if (isReplacementTicket) {
                // For replacement tickets: find the NEW cassette (with replacementTicketId = this ticket.id)
                const newCassette = await this.prisma.cassette.findFirst({
                    where: {
                        replacementTicketId: createDto.ticketId,
                    },
                    include: {
                        cassetteType: true,
                        customerBank: true,
                    },
                });

                if (!newCassette) {
                    throw new BadRequestException(
                        'Kaset baru untuk replacement belum ditemukan. Pastikan proses replacement sudah selesai dilakukan.',
                    );
                }

                // Verify new cassette is in OK status (replacement completed)
                if ((newCassette.status as string) !== 'OK') {
                    throw new BadRequestException(
                        `Kaset baru harus dalam status OK untuk bisa di-pickup. Status saat ini: ${newCassette.status}`,
                    );
                }

                cassette = newCassette;
                this.logger.debug(`Replacement ticket: Using NEW cassette ${newCassette.serialNumber} for return`);
            } else {
                // For repair tickets: use the cassette from delivery (the one that was repaired)
                cassette = ticket.cassetteDelivery.cassette;

                this.logger.debug(`Repair ticket - cassette status: id=${cassette.id}, serialNumber=${cassette.serialNumber}, status=${cassette.status}`);

                // Verify cassette is in READY_FOR_PICKUP status (repair completed, QC passed, ready for pickup)
                // Status READY_FOR_PICKUP berarti kaset sudah selesai diperbaiki dan siap untuk di-pickup
                // OR SCRAPPED status (for disposal confirmation - kaset tidak bisa diperbaiki, tetap di RC)
                if ((cassette.status as string) !== 'READY_FOR_PICKUP' && (cassette.status as string) !== 'SCRAPPED') {
                    throw new BadRequestException(
                        `Cannot confirm pickup for cassette with status ${cassette.status}. Cassette must be in READY_FOR_PICKUP status (repair completed and QC passed) or SCRAPPED status (for disposal confirmation).`,
                    );
                }

                // Handle SCRAPPED cassette (disposal confirmation - kaset tidak bisa diperbaiki, tetap di RC)
                if ((cassette.status as string) === 'SCRAPPED') {
                    // Check if there's a new cassette for this ticket (replacement ticket)
                    const newCassette = await this.prisma.cassette.findFirst({
                        where: {
                            replacementTicketId: createDto.ticketId,
                        },
                        include: {
                            cassetteType: true,
                            customerBank: true,
                        },
                    });

                    if (newCassette) {
                        // This is a replacement ticket - use the new cassette for pickup
                        this.logger.warn(`Replacement ticket detected: Old cassette is SCRAPPED, found new cassette: ${newCassette.serialNumber}.`);

                        // Verify new cassette is in OK status
                        if ((newCassette.status as string) !== 'OK') {
                            throw new BadRequestException(
                                `Kaset baru harus dalam status OK untuk bisa di-pickup. Status saat ini: ${newCassette.status}`,
                            );
                        }

                        // Use the new cassette instead
                        cassette = newCassette;
                        this.logger.debug(`Using NEW cassette ${newCassette.serialNumber} for return (replacement ticket)`);
                    } else {
                        // No replacement - this is a disposal confirmation for SCRAPPED cassette
                        // Kaset SCRAPPED tetap di RC, tidak di-pickup, hanya konfirmasi disposal
                        this.logger.debug(`Disposal confirmation: Cassette ${cassette.serialNumber} is SCRAPPED, will remain at RC. Creating disposal record.`);
                    }
                } else {
                    this.logger.debug(`Repair ticket: Using repaired cassette ${cassette.serialNumber} (READY_FOR_PICKUP) for pickup`);
                }
            }

            // Check if this is a disposal confirmation for SCRAPPED cassette (no replacement)
            const isDisposalConfirmation = (cassette.status as string) === 'SCRAPPED' && !isReplacementTicket;

            // Confirm pickup/disposal and update cassette status accordingly
            return this.prisma.$transaction(async (tx) => {
                // For disposal confirmation: SCRAPPED cassettes remain SCRAPPED (stay at RC) - NO STATUS UPDATE
                // For normal pickup: READY_FOR_PICKUP cassettes become OK (picked up)

                if (isDisposalConfirmation) {
                    // Disposal confirmation: SCRAPPED cassettes remain at RC, status stays SCRAPPED
                    // DO NOT update SCRAPPED cassettes - they must remain SCRAPPED at RC
                    if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
                        const cassettesInTicket = ticket.cassetteDetails.map((detail: any) => detail.cassette);
                        const scrappedCassettes = cassettesInTicket.filter((c: any) => c && c.status === 'SCRAPPED');
                        this.logger.debug(`Disposal confirmation: Found ${scrappedCassettes.length} SCRAPPED cassette(s) - will remain SCRAPPED at RC (no status update)`);
                    } else {
                        // Single cassette ticket
                        this.logger.debug(`Disposal confirmation: Single SCRAPPED cassette ${cassette.serialNumber} - will remain SCRAPPED at RC (no status update)`);
                    }
                    // IMPORTANT: SCRAPPED cassettes are NOT updated - they stay SCRAPPED at RC
                } else {
                    // Normal pickup: READY_FOR_PICKUP cassettes become OK
                    let cassettesToUpdate: string[] = [cassette.id];

                    // Check if this is a multi-cassette ticket
                    if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
                        // Get all cassettes in this ticket that are in READY_FOR_PICKUP status (completed repair, ready for pickup)
                        const cassettesInTicket = ticket.cassetteDetails.map((detail: any) => detail.cassette);
                        const readyCassettes = cassettesInTicket.filter((c: any) => c && c.status === 'READY_FOR_PICKUP');
                        cassettesToUpdate = readyCassettes.map((c: any) => c.id);

                        this.logger.debug(`Multi-cassette ticket: Found ${readyCassettes.length} cassettes in READY_FOR_PICKUP status to update for pickup`);
                    }

                    // Update all cassettes to OK status immediately (picked up by Pengelola at RC)
                    if (cassettesToUpdate.length > 0) {
                        // Update each cassette individually to ensure all are updated
                        await Promise.all(
                            cassettesToUpdate.map((cassetteId) =>
                                tx.$executeRaw`
                UPDATE cassettes 
                SET status = ${'OK'}, updated_at = NOW()
                WHERE id = ${cassetteId}
              `
                            )
                        );
                        this.logger.debug(`Confirm Pickup: Updated ${cassettesToUpdate.length} cassette(s) status to OK (${isReplacementTicket ? 'Replacement' : 'Repair'})`);
                    }
                }

                // Create return record with pickup/disposal confirmation
                // Since pickup/disposal is done at RC, we set receivedAtPengelola immediately
                let notes = createDto.notes?.trim() || null;

                // For disposal confirmation, add disposal information to notes
                if (isDisposalConfirmation) {
                    const disposalInfo = `\n\n=== DISPOSAL CONFIRMATION ===\n` +
                        `Kaset dengan status SCRAPPED (tidak bisa diperbaiki, tidak lolos QC)\n` +
                        `Kaset tetap di RC untuk disposal\n` +
                        `Tanggal konfirmasi: ${new Date().toLocaleString('id-ID')}\n` +
                        `Dikonfirmasi oleh: RC Staff\n` +
                        `Alasan: Kaset tidak dapat diperbaiki atau tidak lolos Quality Control setelah perbaikan`;
                    notes = notes ? `${notes}${disposalInfo}` : disposalInfo;
                }

                // Store signature (RC staff confirms pickup on behalf of Pengelola)
                const signatureData = createDto.rcSignature || createDto.signature || null;

                if (signatureData) {
                    this.logger.debug(`RC ${isDisposalConfirmation ? 'Disposal' : 'Pickup'} signature received for ticket ${createDto.ticketId} (length: ${signatureData.length} chars)`);
                }

                const pickupDate = new Date(); // Pickup/disposal date is now

                // For multi-cassette tickets, use the primary cassette (first one from cassetteDetails or from delivery)
                // Since ticketId is unique in CassetteReturn, we can only create one return record per ticket
                let primaryCassetteId = cassette.id;

                // For multi-cassette tickets, prefer using the first READY_FOR_PICKUP cassette
                if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0 && !isDisposalConfirmation) {
                    const readyCassettes = ticket.cassetteDetails
                        .map((detail: any) => detail.cassette)
                        .filter((c: any) => c && c.status === 'READY_FOR_PICKUP');

                    if (readyCassettes.length > 0) {
                        primaryCassetteId = readyCassettes[0].id;
                        this.logger.debug(`Multi-cassette ticket: Using primary cassette ${readyCassettes[0].serialNumber} for return record`);
                    }
                }

                // Create new return record (RC confirmation only)
                const returnRecord = await tx.cassetteReturn.create({
                    data: {
                        ticketId: createDto.ticketId,
                        cassetteId: primaryCassetteId, // Use primary cassette ID
                        sentBy: userId,
                        shippedDate: pickupDate, // Use pickup/disposal date as shippedDate for backward compatibility
                        courierService: null, // No courier service for pickup/disposal
                        trackingNumber: null, // No tracking number for pickup/disposal
                        estimatedArrival: null, // No estimated arrival for pickup/disposal
                        receivedAtPengelola: pickupDate, // Set immediately since RC confirms on behalf of Pengelola
                        receivedBy: null, // RC confirms on behalf of Pengelola, no specific Pengelola user ID available
                        notes: notes,
                        // RC confirmation (RC staff confirms pickup)
                        confirmedByRc: userId,
                        rcSignature: signatureData,
                        rcConfirmedAt: pickupDate,
                    },
                    include: {
                        cassette: {
                            include: {
                                cassetteType: true,
                                customerBank: true,
                            },
                        },
                        ticket: true,
                        sender: {
                            select: {
                                fullName: true,
                                role: true,
                            },
                        },
                        rcConfirmer: {
                            select: {
                                fullName: true,
                                role: true,
                            },
                        },
                    },
                });

                // Update ticket status to CLOSED immediately after RC confirmation
                const shouldCloseTicket = true;

                // Update ticket status to CLOSED immediately after RC confirmation
                // RC staff confirms pickup on behalf of Pengelola
                await tx.problemTicket.update({
                    where: { id: createDto.ticketId },
                    data: {
                        status: 'CLOSED' as any,
                        closedAt: pickupDate,
                    },
                });
                this.logger.debug(`Pickup confirmed by RC: Ticket ${createDto.ticketId} status updated to CLOSED`);

                return returnRecord;
            });
        } catch (error: any) {
            this.logger.error(`Error in createReturn: ticketId=${createDto.ticketId}`, error instanceof Error ? error.stack : error);

            // Re-throw known exceptions with their messages
            if (error instanceof NotFoundException ||
                error instanceof ForbiddenException ||
                error instanceof BadRequestException) {
                throw error;
            }

            // Wrap unknown errors
            throw new BadRequestException(`Failed to confirm pickup: ${error.message || 'Unknown error'}`);
        }
    }

    async receiveReturn(ticketId: string, receiveDto: ReceiveReturnDto, userId: string, userType: string) {
        // Only Pengelola users can receive returns
        if (userType?.toUpperCase() !== 'PENGELOLA') {
            throw new ForbiddenException('Only Pengelola users can receive cassette returns');
        }

        // Find return record
        const returnRecord = await (this.prisma as any).cassetteReturn.findUnique({
            where: { ticketId },
            include: {
                ticket: true,
                cassette: true,
            },
        });

        if (!returnRecord) {
            throw new NotFoundException('Return delivery not found');
        }

        if (returnRecord.receivedAtPengelola) {
            throw new BadRequestException('Cassette already received at Pengelola');
        }

        // Verify Pengelola user has access to this ticket's machine or is the reporter
        const ticket = await this.prisma.problemTicket.findUnique({
            where: { id: ticketId },
            include: {
                machine: {
                    include: {
                        pengelola: {
                            include: {
                                users: {
                                    where: { id: userId },
                                },
                            },
                        },
                    },
                },
                reporter: {
                    select: {
                        pengelolaId: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        const pengelolaUser = await this.prisma.pengelolaUser.findUnique({
            where: { id: userId },
        });

        if (!pengelolaUser) {
            throw new NotFoundException('Pengelola user not found');
        }

        // Check if Pengelola has access: machine.pengelolaId OR reporter.pengelolaId matches
        const hasMachineAccess = ticket.machine && pengelolaUser.pengelolaId === ticket.machine.pengelolaId;
        const isReporter = (ticket.reporter as any)?.pengelolaId === pengelolaUser.pengelolaId;

        if (!hasMachineAccess && !isReporter) {
            throw new ForbiddenException('You do not have access to receive this cassette return');
        }

        // Verify ticket status is RETURN_SHIPPED (barang sudah dikirim dari RC)
        if (returnRecord.ticket.status !== 'RETURN_SHIPPED') {
            throw new BadRequestException(
                `Cannot receive return for ticket with status ${returnRecord.ticket.status}. Ticket must be in RETURN_SHIPPED status first.`,
            );
        }

        // Update return and cassette status
        return this.prisma.$transaction(async (tx) => {
            // Update return record
            const updatedReturn = await tx.cassetteReturn.update({
                where: { id: returnRecord.id },
                data: {
                    receivedAtPengelola: new Date(),
                    receivedBy: userId,
                    notes: receiveDto.notes,
                },
            });

            // For multi-cassette tickets: update ALL cassettes in the ticket that are in IN_TRANSIT_TO_PENGELOLA status
            // For single-cassette tickets: update only the cassette being returned
            let cassettesToUpdate: string[] = [returnRecord.cassetteId];

            // Check if this is a multi-cassette ticket
            const ticketWithDetails = await tx.problemTicket.findUnique({
                where: { id: ticketId },
                include: {
                    cassetteDetails: {
                        include: {
                            cassette: {
                                select: {
                                    id: true,
                                    status: true,
                                    serialNumber: true,
                                },
                            },
                        },
                    },
                },
            });

            if (ticketWithDetails && ticketWithDetails.cassetteDetails && ticketWithDetails.cassetteDetails.length > 0) {
                // Get all cassettes in this ticket that are in IN_TRANSIT_TO_PENGELOLA status (being returned)
                const cassettesInTicket = ticketWithDetails.cassetteDetails.map((detail: any) => detail.cassette);
                const cassettesInTransit = cassettesInTicket.filter((c: any) => c && c.status === 'IN_TRANSIT_TO_PENGELOLA');
                cassettesToUpdate = cassettesInTransit.map((c: any) => c.id);

                this.logger.debug(`Multi-cassette ticket: Found ${cassettesInTransit.length} cassettes in IN_TRANSIT_TO_PENGELOLA status to update to OK`);
            }

            // Update all cassettes that need to be updated to OK
            if (cassettesToUpdate.length > 0) {
                // Update each cassette individually to ensure all are updated
                await Promise.all(
                    cassettesToUpdate.map((cassetteId) =>
                        tx.$executeRaw`
              UPDATE cassettes 
              SET status = ${'OK'}, updated_at = NOW()
              WHERE id = ${cassetteId}
            `
                    )
                );
                this.logger.debug(`Receive Return: Updated ${cassettesToUpdate.length} cassette(s) status to OK`);

                // Verify the updates were successful
                const updatedCassettes = await tx.cassette.findMany({
                    where: { id: { in: cassettesToUpdate } },
                    select: { id: true, status: true, serialNumber: true },
                });

                const failedUpdates = updatedCassettes.filter(c => c.status !== 'OK');
                if (failedUpdates.length > 0) {
                    this.logger.error(`Receive Return: Failed to update ${failedUpdates.length} cassette(s) status to OK:`, failedUpdates.map(c => `${c.serialNumber} (${c.status})`));
                    // Try again with Prisma update as fallback
                    await Promise.all(
                        failedUpdates.map((c) =>
                            tx.cassette.update({
                                where: { id: c.id },
                                data: { status: 'OK' as any },
                            })
                        )
                    );
                    this.logger.debug(`Receive Return: Fallback update successful for ${failedUpdates.length} cassette(s)`);
                }
            }

            // Update ticket status to CLOSED
            await tx.problemTicket.update({
                where: { id: ticketId },
                data: {
                    status: 'CLOSED' as any,
                    closedAt: new Date(),
                },
            });

            return updatedReturn;
        });
    }
}
