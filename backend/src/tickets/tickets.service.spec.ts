import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('TicketsService', () => {
    let service: TicketsService;
    let prisma: PrismaService;

    const mockPrismaService = {
        problemTicket: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            groupBy: jest.fn(),
        },
        cassette: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        pengelolaUser: {
            findUnique: jest.fn(),
        },
        pengelola: {
            findUnique: jest.fn(),
        },
        machine: {
            findUnique: jest.fn(),
        },
        repairTicket: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn(mockPrismaService)),
        $executeRaw: jest.fn(),
    };



    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TicketsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<TicketsService>(TicketsService);
        prisma = module.get<PrismaService>(PrismaService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated tickets for HITACHI user', async () => {
            const mockTickets = [
                { id: '1', ticketNumber: 'SO-010123', status: 'OPEN' },
                { id: '2', ticketNumber: 'SO-010124', status: 'IN_PROGRESS' },
            ];

            mockPrismaService.problemTicket.count.mockResolvedValue(2);
            mockPrismaService.problemTicket.findMany.mockResolvedValue(mockTickets);

            const result = await service.findAll('HITACHI', undefined, 1, 50);

            expect(result.data).toEqual(mockTickets);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 50,
                total: 2,
                totalPages: 1,
            });
            expect(mockPrismaService.problemTicket.count).toHaveBeenCalled();
            expect(mockPrismaService.problemTicket.findMany).toHaveBeenCalled();
        });

        it('should filter tickets by pengelolaId for PENGELOLA user', async () => {
            const pengelolaId = 'pengelola-123';
            const mockTickets = [{ id: '1', ticketNumber: 'SO-010123' }];

            mockPrismaService.problemTicket.count.mockResolvedValue(1);
            mockPrismaService.problemTicket.findMany.mockResolvedValue(mockTickets);

            const result = await service.findAll('PENGELOLA', pengelolaId, 1, 50);

            expect(result.data).toEqual(mockTickets);
            expect(mockPrismaService.problemTicket.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.any(Array),
                    }),
                }),
            );
        });

        it('should filter by status when provided', async () => {
            mockPrismaService.problemTicket.count.mockResolvedValue(0);
            mockPrismaService.problemTicket.findMany.mockResolvedValue([]);

            await service.findAll('HITACHI', undefined, 1, 50, undefined, 'OPEN');

            expect(mockPrismaService.problemTicket.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'OPEN',
                    }),
                }),
            );
        });

        it('should search tickets by keyword', async () => {
            const searchKeyword = 'test';
            mockPrismaService.problemTicket.count.mockResolvedValue(0);
            mockPrismaService.problemTicket.findMany.mockResolvedValue([]);

            await service.findAll('HITACHI', undefined, 1, 50, searchKeyword);

            expect(mockPrismaService.problemTicket.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.any(Array),
                    }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a ticket by id for HITACHI user', async () => {
            const mockTicket = {
                id: 'ticket-123',
                ticketNumber: 'SO-010123',
                status: 'OPEN',
                cassette: { id: 'cassette-1', serialNumber: 'SN-001' },
                machine: { id: 'machine-1', pengelolaId: 'pengelola-1' },
                reporter: { pengelolaId: 'pengelola-1' },
            };

            mockPrismaService.problemTicket.findUnique.mockResolvedValue(mockTicket);

            const result = await service.findOne('ticket-123', 'HITACHI');

            expect(result).toEqual(mockTicket);
            expect(mockPrismaService.problemTicket.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ticket-123' },
                }),
            );
        });

        it('should throw NotFoundException if ticket not found', async () => {
            mockPrismaService.problemTicket.findUnique.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'HITACHI')).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException for PENGELOLA accessing unassigned ticket', async () => {
            const mockTicket = {
                id: 'ticket-123',
                ticketNumber: 'SO-010123',
                status: 'OPEN',
                cassette: { id: 'cassette-1' },
                machine: { pengelolaId: 'other-pengelola' },
                reporter: { pengelolaId: 'other-pengelola' },
            };

            mockPrismaService.problemTicket.findUnique.mockResolvedValue(mockTicket);

            await expect(
                service.findOne('ticket-123', 'PENGELOLA', 'my-pengelola-id'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should allow PENGELOLA to access their own ticket', async () => {
            const pengelolaId = 'my-pengelola-id';
            const mockTicket = {
                id: 'ticket-123',
                ticketNumber: 'SO-010123',
                status: 'OPEN',
                cassette: { id: 'cassette-1' },
                machine: { pengelolaId },
                reporter: { pengelolaId },
            };

            mockPrismaService.problemTicket.findUnique.mockResolvedValue(mockTicket);

            const result = await service.findOne('ticket-123', 'PENGELOLA', pengelolaId);

            expect(result).toEqual(mockTicket);
        });
    });

    describe('getStatistics', () => {
        it('should return ticket statistics', async () => {
            // Mock count for multiple calls (total, open, inProgress, resolved, critical)
            mockPrismaService.problemTicket.count
                .mockResolvedValueOnce(100)  // total
                .mockResolvedValueOnce(20)   // open
                .mockResolvedValueOnce(30)   // inProgress
                .mockResolvedValueOnce(40)   // resolved
                .mockResolvedValueOnce(5);   // critical

            const result = await service.getStatistics();

            expect(result).toBeDefined();
            expect(result.total).toBe(100);
            expect(result.open).toBe(20);
            expect(result.inProgress).toBe(30);
            expect(result.resolved).toBe(40);
            expect(result.critical).toBe(5);
            expect(mockPrismaService.problemTicket.count).toHaveBeenCalled();
        });
    });

    describe('getNewTicketsCount', () => {
        it('should return count of new tickets for HITACHI', async () => {
            mockPrismaService.problemTicket.count.mockResolvedValue(5);

            const result = await service.getNewTicketsCount('HITACHI');

            expect(result).toBe(5);
            expect(mockPrismaService.problemTicket.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: { in: expect.any(Array) },
                    }),
                }),
            );
        });

        it('should filter by pengelolaId for PENGELOLA user', async () => {
            const pengelolaId = 'pengelola-123';
            mockPrismaService.problemTicket.count.mockResolvedValue(2);

            const result = await service.getNewTicketsCount('PENGELOLA', pengelolaId);

            expect(result).toBe(2);
        });
    });
});
