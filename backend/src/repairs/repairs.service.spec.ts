import { Test, TestingModule } from '@nestjs/testing';
import { RepairsService } from './repairs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WarrantyService } from '../warranty/warranty.service';
import { TicketStatusSyncService } from '../tickets/ticket-status-sync.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('RepairsService', () => {
    let service: RepairsService;
    let prisma: PrismaService;

    const mockPrismaService = {
        repairTicket: {
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
        problemTicket: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        ticketCassetteDetail: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn(mockPrismaService)),
        $executeRaw: jest.fn(),
    };

    const mockWarrantyService = {
        getWarrantyConfiguration: jest.fn(),
        checkWarrantyStatus: jest.fn(),
    };

    const mockTicketStatusSyncService = {
        syncTicketStatus: jest.fn(),
        syncSOStatus: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RepairsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: WarrantyService,
                    useValue: mockWarrantyService,
                },
                {
                    provide: TicketStatusSyncService,
                    useValue: mockTicketStatusSyncService,
                },
            ],
        }).compile();

        service = module.get<RepairsService>(RepairsService);
        prisma = module.get<PrismaService>(PrismaService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated repair tickets for HITACHI user with RC_STAFF role', async () => {
            const mockRepairs = [
                { id: '1', status: 'RECEIVED', cassette: { serialNumber: 'SN-001' } },
                { id: '2', status: 'IN_PROGRESS', cassette: { serialNumber: 'SN-002' } },
            ];

            mockPrismaService.repairTicket.count.mockResolvedValue(2);
            mockPrismaService.repairTicket.findMany.mockResolvedValue(mockRepairs);

            const result = await service.findAll('HITACHI', 'RC_STAFF', 1, 50);

            expect(result.data).toEqual(mockRepairs);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 50,
                total: 2,
                totalPages: 1,
            });
            expect(mockPrismaService.repairTicket.count).toHaveBeenCalled();
            expect(mockPrismaService.repairTicket.findMany).toHaveBeenCalled();
        });

        it('should filter by status when provided', async () => {
            mockPrismaService.repairTicket.count.mockResolvedValue(0);
            mockPrismaService.repairTicket.findMany.mockResolvedValue([]);

            await service.findAll('HITACHI', 'SUPER_ADMIN', 1, 50, undefined, 'RECEIVED');

            expect(mockPrismaService.repairTicket.count).toHaveBeenCalled();
        });

        it('should search by keyword', async () => {
            const searchKeyword = 'SN-001';
            mockPrismaService.repairTicket.count.mockResolvedValue(0);
            mockPrismaService.repairTicket.findMany.mockResolvedValue([]);

            await service.findAll('HITACHI', 'RC_MANAGER', 1, 50, searchKeyword);

            expect(mockPrismaService.repairTicket.count).toHaveBeenCalled();
        });

        it('should throw ForbiddenException for non-HITACHI users', async () => {
            await expect(service.findAll('PENGELOLA', undefined, 1, 50)).rejects.toThrow();
        });
    });

    describe('findOne', () => {
        it('should return a repair ticket by id', async () => {
            const mockRepair = {
                id: 'repair-123',
                status: 'RECEIVED',
                reportedIssue: 'Test issue',
                cassette: { id: 'cassette-1', serialNumber: 'SN-001' },
            };

            mockPrismaService.repairTicket.findUnique.mockResolvedValue(mockRepair);

            const result = await service.findOne('repair-123', 'HITACHI');

            expect(result).toEqual(mockRepair);
            expect(mockPrismaService.repairTicket.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'repair-123' },
                }),
            );
        });

        it('should throw NotFoundException if repair not found', async () => {
            mockPrismaService.repairTicket.findUnique.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'HITACHI')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByTicketId', () => {
        it('should return repair tickets for a service order ticket', async () => {
            const mockTicket = {
                id: 'ticket-123',
                createdAt: new Date(),
                cassetteDetails: [{ cassette: { id: 'cassette-1' } }],
                cassette: null,
            };
            const mockRepairs = [
                { id: 'repair-1', soTicketId: 'ticket-123', status: 'RECEIVED' },
                { id: 'repair-2', soTicketId: 'ticket-123', status: 'IN_PROGRESS' },
            ];

            mockPrismaService.problemTicket.findUnique.mockResolvedValue(mockTicket);
            mockPrismaService.repairTicket.findMany.mockResolvedValue(mockRepairs);

            const result = await service.findByTicketId('ticket-123', 'HITACHI');

            expect(result).toEqual(mockRepairs);
        });

        it('should throw ForbiddenException for non-HITACHI users', async () => {
            await expect(service.findByTicketId('ticket-123', 'PENGELOLA')).rejects.toThrow();
        });
    });

    describe('getStatistics', () => {
        it('should return repair statistics', async () => {
            // Mock count for multiple calls (total, received, diagnosing, onProgress, completed)
            mockPrismaService.repairTicket.count
                .mockResolvedValueOnce(100)  // total
                .mockResolvedValueOnce(20)   // received
                .mockResolvedValueOnce(15)   // diagnosing
                .mockResolvedValueOnce(25)   // onProgress
                .mockResolvedValueOnce(40);  // completed

            const result = await service.getStatistics();

            expect(result).toBeDefined();
            expect(result.total).toBe(100);
            expect(result.received).toBe(20);
            expect(result.diagnosing).toBe(15);
            expect(result.onProgress).toBe(25);
            expect(result.completed).toBe(40);
            expect(mockPrismaService.repairTicket.count).toHaveBeenCalled();
        });
    });

    describe('takeTicket', () => {
        it('should assign repair ticket to user and update status', async () => {
            const mockRepair = {
                id: 'repair-123',
                status: 'RECEIVED',
                repairedBy: null,
            };

            const updatedRepair = {
                ...mockRepair,
                status: 'DIAGNOSING',
                repairedBy: 'user-123',
                diagnosingStartAt: expect.any(Date),
            };

            mockPrismaService.repairTicket.findUnique.mockResolvedValue(mockRepair);
            mockPrismaService.repairTicket.update.mockResolvedValue(updatedRepair);

            const result = await service.takeTicket('repair-123', 'user-123');

            expect(result.status).toBe('DIAGNOSING');
            expect(result.repairedBy).toBe('user-123');
        });

        it('should throw error if ticket already assigned', async () => {
            const mockRepair = {
                id: 'repair-123',
                status: 'DIAGNOSING',
                repairedBy: 'other-user',
            };

            mockPrismaService.repairTicket.findUnique.mockResolvedValue(mockRepair);

            await expect(service.takeTicket('repair-123', 'user-123')).rejects.toThrow();
        });
    });
});
