import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto, ReceiveDeliveryDto } from './dto';

@Injectable()
export class DeliveryService {
    private readonly logger = new Logger(DeliveryService.name);

    constructor(private prisma: PrismaService) { }

    async createDelivery(createDto: CreateDeliveryDto, userId: string, userType: string) {
        // SUPER ADMIN (HITACHI) can create delivery for testing
        // Pengelola USERS can create delivery normally
        if (userType !== 'pengelola' && userType !== 'HITACHI') {
            throw new ForbiddenException('Only Pengelola users or admin can create delivery forms');
        }

        // Verify ticket exists and is in OPEN status
        const ticket = await this.prisma.problemTicket.findUnique({
            where: { id: createDto.ticketId },
            include: {
                cassette: {
                    include: {
                        customerBank: true,
                    },
                },
                machine: {
                    include: {
                        pengelola: {
                            include: {
                                users: {
                                    take: 1,
                                },
                            },
                        },
                        customerBank: true,
                    },
                },
            } as any,
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        if (ticket.status !== 'OPEN') {
            throw new BadRequestException(`Cannot create delivery for ticket with status ${ticket.status}. Ticket must be OPEN first.`);
        }

        // Check if delivery already exists
        const existingDelivery = await this.prisma.cassetteDelivery.findUnique({
            where: { ticketId: createDto.ticketId },
        });

        if (existingDelivery) {
            throw new BadRequestException('Delivery form already exists for this ticket');
        }

        // Verify cassette exists and belongs to same bank as machine
        const cassette = await this.prisma.cassette.findUnique({
            where: { id: createDto.cassetteId },
            include: { customerBank: true },
        });

        if (!cassette) {
            throw new NotFoundException('Cassette not found');
        }

        // Find machine if machineId is provided
        let machine: any = null;
        if (ticket.machineId) {
            const foundMachine = await this.prisma.machine.findUnique({
                where: { id: ticket.machineId },
                include: {
                    customerBank: true,
                    pengelola: {
                        include: {
                            users: {
                                take: 1,
                            },
                        },
                    },
                },
            });

            if (!foundMachine) {
                throw new NotFoundException('Machine not found');
            }

            machine = foundMachine;

            if (cassette.customerBankId !== machine.customerBankId) {
                throw new BadRequestException('Cassette must belong to same bank as machine');
            }
        } else {
            // If no machineId, validate cassette belongs to same bank as ticket's cassette
            const ticketWithCassette = ticket as any;
            if (ticketWithCassette.cassette && ticketWithCassette.cassette.customerBankId !== cassette.customerBankId) {
                throw new BadRequestException('Cassette must belong to same bank as ticket\'s cassette');
            }
        }

        // Check cassette status
        if ((cassette.status as string) !== 'OK' && (cassette.status as string) !== 'BAD') {
            throw new BadRequestException(
                `Cannot send cassette with status ${cassette.status}. Only OK or BAD cassettes can be sent.`,
            );
        }

        // For admin users, use the machine's Pengelola user as sender
        let senderUserId = userId;
        if (userType === 'HITACHI') {
            const ticketMachine = (ticket as any).machine;
            if (ticketMachine && ticketMachine.pengelola && ticketMachine.pengelola.users && ticketMachine.pengelola.users.length > 0) {
                senderUserId = ticketMachine.pengelola.users[0].id;
                this.logger.debug(`Admin creating delivery - using Pengelola user as sender: ${senderUserId}`);
            } else if (machine && (machine as any).pengelola) {
                // Use Pengelola users from machine query result
                const machineVendor = (machine as any).pengelola;
                if (machineVendor && machineVendor.users && machineVendor.users.length > 0) {
                    senderUserId = machineVendor.users[0].id;
                    this.logger.debug(`Admin creating delivery - using Pengelola user as sender: ${senderUserId}`);
                } else {
                    throw new BadRequestException('Machine has no assigned Pengelola users. Cannot create delivery.');
                }
            } else {
                throw new BadRequestException('Machine not found or has no assigned Pengelola users. Cannot create delivery.');
            }
        }

        // Create delivery and update cassette status
        return this.prisma.$transaction(async (tx) => {
            // Update cassette status
            await tx.cassette.update({
                where: { id: createDto.cassetteId },
                data: {
                    status: 'IN_TRANSIT_TO_RC',
                },
            });

            // Create delivery record
            const delivery = await tx.cassetteDelivery.create({
                data: {
                    ticketId: createDto.ticketId,
                    cassetteId: createDto.cassetteId,
                    sentBy: senderUserId,
                    shippedDate: new Date(createDto.shippedDate),
                    courierService: createDto.courierService,
                    trackingNumber: createDto.trackingNumber,
                    estimatedArrival: createDto.estimatedArrival ? new Date(createDto.estimatedArrival) : null,
                    notes: createDto.notes,
                },
                include: {
                    cassette: {
                        include: {
                            cassetteType: true,
                            customerBank: true,
                        },
                    },
                    ticket: true,
                },
            });

            // Update ticket status
            await tx.problemTicket.update({
                where: { id: createDto.ticketId },
                data: {
                    status: 'IN_DELIVERY' as any,
                },
            });

            return delivery;
        });
    }

    async receiveDelivery(ticketId: string, receiveDto: ReceiveDeliveryDto, userId: string, userType: string) {
        if (userType !== 'HITACHI') {
            throw new ForbiddenException('Only Hitachi RC staff can receive cassettes');
        }

        // Find ticket first to check deliveryMethod
        const ticket = await this.prisma.problemTicket.findUnique({
            where: { id: ticketId },
            include: {
                cassetteDetails: {
                    include: {
                        cassette: true,
                    },
                },
                cassette: true,
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        // Find delivery
        let delivery = await this.prisma.cassetteDelivery.findUnique({
            where: { ticketId },
            include: {
                cassette: true,
            },
        });

        // If no delivery record but ticket has SELF_DELIVERY, create one
        if (!delivery && ticket.deliveryMethod === 'SELF_DELIVERY') {
            // Get primary cassette
            const primaryCassette = ticket.cassetteDetails && ticket.cassetteDetails.length > 0
                ? ticket.cassetteDetails[0].cassette
                : ticket.cassette;

            if (!primaryCassette) {
                throw new BadRequestException('No cassette found for this ticket');
            }

            // Create delivery record for SELF_DELIVERY
            delivery = await this.prisma.cassetteDelivery.create({
                data: {
                    ticketId: ticket.id,
                    cassetteId: primaryCassette.id,
                    sentBy: ticket.reportedBy,
                    courierService: 'SELF_DELIVERY',
                    trackingNumber: null,
                    shippedDate: new Date(),
                    estimatedArrival: null,
                    useOfficeAddress: false,
                } as any,
                include: {
                    cassette: true,
                },
            });
        }

        if (!delivery) {
            throw new NotFoundException('Delivery not found. Please ensure ticket has delivery information.');
        }

        if (delivery.receivedAtRc) {
            throw new BadRequestException('Cassette already received at RC');
        }

        // For SELF_DELIVERY, ticket status can be OPEN or IN_DELIVERY
        // For COURIER, ticket status should be IN_DELIVERY
        if (delivery.courierService !== 'SELF_DELIVERY' && ticket.status !== 'IN_DELIVERY') {
            throw new BadRequestException(`Ticket status must be IN_DELIVERY to receive delivery. Current status: ${ticket.status}`);
        }

        // Update delivery and cassette status
        return this.prisma.$transaction(async (tx) => {
            // Update delivery record
            const updatedDelivery = await tx.cassetteDelivery.update({
                where: { id: delivery.id },
                data: {
                    receivedAtRc: new Date(),
                    receivedBy: userId,
                    notes: receiveDto.notes,
                },
            });

            // Update cassette status to IN_TRANSIT_TO_RC if not already
            // Get all cassettes from ticket details and delivery
            const cassetteIds: string[] = [];

            // From ticket details
            if (ticket.cassetteDetails && ticket.cassetteDetails.length > 0) {
                ticket.cassetteDetails.forEach((detail: any) => {
                    if (detail.cassette?.id && !cassetteIds.includes(detail.cassette.id)) {
                        cassetteIds.push(detail.cassette.id);
                    }
                });
            }

            // From delivery
            if (delivery.cassetteId && !cassetteIds.includes(delivery.cassetteId)) {
                cassetteIds.push(delivery.cassetteId);
            }

            // Check if this is a replacement ticket
            const isReplacementTicket = (ticket.cassetteDetails as any)?.some((detail: any) => detail.requestReplacement === true) || (ticket as any).requestReplacement === true;

            // Update cassette status
            // For replacement tickets: SCRAPPED cassettes should remain SCRAPPED (not changed to IN_REPAIR)
            // For repair tickets: cassettes should be updated to IN_REPAIR
            if (cassetteIds.length > 0) {
                if (isReplacementTicket) {
                    // For replacement tickets, only update cassettes that are NOT SCRAPPED
                    // SCRAPPED cassettes remain SCRAPPED (they will be replaced, not repaired)
                    await tx.cassette.updateMany({
                        where: {
                            id: { in: cassetteIds },
                            status: { not: 'SCRAPPED' },
                        },
                        data: {
                            status: 'IN_REPAIR',
                            updatedAt: new Date(),
                        },
                    });
                    this.logger.debug(`RC Receive (Replacement): Updated non-SCRAPPED cassettes to IN_REPAIR. SCRAPPED cassettes remain SCRAPPED.`);
                } else {
                    // For repair tickets, update all cassettes to IN_REPAIR
                    await tx.cassette.updateMany({
                        where: {
                            id: { in: cassetteIds },
                        },
                        data: {
                            status: 'IN_REPAIR',
                            updatedAt: new Date(),
                        },
                    });
                    this.logger.debug(`RC Receive: Updated ${cassetteIds.length} cassettes to IN_REPAIR (arrived at RC, ready for repair)`);
                }
            }

            // Update ticket status ke RECEIVED (barang sudah diterima, belum mulai repair)
            await tx.problemTicket.update({
                where: { id: ticketId },
                data: {
                    status: 'RECEIVED' as any,
                },
            });
            this.logger.debug('RC Receive: Updated ticket status to RECEIVED');

            // Note: Repair ticket akan dibuat manual saat teknisi klik "Mulai Repair"
            // Tidak auto-create repair ticket di sini

            return updatedDelivery;
        });
    }
}
