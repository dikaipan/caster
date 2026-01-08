import { Test, TestingModule } from '@nestjs/testing';
import { CassettesService } from './cassettes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Unit tests for CassettesService
 * 
 * NOTE: Some methods like findBySerialNumber, findByMachine, and checkCassetteAvailability
 * use raw queries and complex multi-step database interactions that require integration tests
 * rather than unit tests with mocked Prisma. These are tested via API integration tests.
 */
describe('CassettesService', () => {
    let service: CassettesService;
    let prisma: PrismaService;

    const mockPrismaService = {
        cassette: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            groupBy: jest.fn(),
        },
        cassetteType: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        machine: {
            findUnique: jest.fn(),
        },
        customerBank: {
            findUnique: jest.fn(),
        },
        pengelolaUser: {
            findUnique: jest.fn(),
        },
        problemTicket: {
            findFirst: jest.fn(),
        },
        repairTicket: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn(mockPrismaService)),
        $executeRaw: jest.fn(),
        $queryRaw: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CassettesService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<CassettesService>(CassettesService);
        prisma = module.get<PrismaService>(PrismaService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated cassettes for HITACHI user', async () => {
            const mockCassettes = [
                { id: '1', serialNumber: 'SN-001', status: 'OK', problemTickets: [], ticketCassetteDetails: [], _count: { repairTickets: 0 } },
                { id: '2', serialNumber: 'SN-002', status: 'BAD', problemTickets: [], ticketCassetteDetails: [], _count: { repairTickets: 0 } },
            ];

            mockPrismaService.cassette.count.mockResolvedValue(2);
            mockPrismaService.cassette.findMany.mockResolvedValue(mockCassettes);
            mockPrismaService.cassette.groupBy.mockResolvedValue([
                { status: 'OK', _count: { status: 1 } },
                { status: 'BAD', _count: { status: 1 } },
            ]);

            const result = await service.findAll('HITACHI', undefined, 1, 50);

            expect(result.data).toHaveLength(2);
            expect(result.data[0].serialNumber).toBe('SN-001');
            expect(result.pagination).toEqual({
                page: 1,
                limit: 50,
                total: 2,
                totalPages: 1,
            });
            expect(mockPrismaService.cassette.count).toHaveBeenCalled();
            expect(mockPrismaService.cassette.findMany).toHaveBeenCalled();
        });

        it('should filter by status when provided', async () => {
            mockPrismaService.cassette.count.mockResolvedValue(0);
            mockPrismaService.cassette.findMany.mockResolvedValue([]);
            mockPrismaService.cassette.groupBy.mockResolvedValue([]);

            await service.findAll('HITACHI', undefined, 1, 50, undefined, undefined, undefined, 'OK');

            expect(mockPrismaService.cassette.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'OK',
                    }),
                }),
            );
        });

        it('should search by keyword', async () => {
            const keyword = 'SN-001';
            mockPrismaService.cassette.count.mockResolvedValue(0);
            mockPrismaService.cassette.findMany.mockResolvedValue([]);
            mockPrismaService.cassette.groupBy.mockResolvedValue([]);

            await service.findAll('HITACHI', undefined, 1, 50, keyword);

            // Service lowercases keyword for case-insensitive search
            expect(mockPrismaService.cassette.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        serialNumber: expect.objectContaining({
                            contains: keyword.toLowerCase(),
                        }),
                    }),
                }),
            );
        });

        it('should filter by customerBankId when provided', async () => {
            const bankId = 'bank-123';
            mockPrismaService.cassette.count.mockResolvedValue(0);
            mockPrismaService.cassette.findMany.mockResolvedValue([]);
            mockPrismaService.cassette.groupBy.mockResolvedValue([]);

            await service.findAll('HITACHI', undefined, 1, 50, undefined, undefined, undefined, undefined, undefined, undefined, bankId);

            expect(mockPrismaService.cassette.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        customerBankId: bankId,
                    }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a cassette by id', async () => {
            const mockCassette = {
                id: 'cassette-123',
                serialNumber: 'SN-001',
                status: 'OK',
                cassetteType: { typeCode: 'RB', machineType: 'RB-100' },
                customerBank: { bankCode: 'BNI', bankName: 'Bank Negara Indonesia' },
            };

            mockPrismaService.cassette.findUnique.mockResolvedValue(mockCassette);

            const result = await service.findOne('cassette-123');

            expect(result).toEqual(mockCassette);
            expect(mockPrismaService.cassette.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'cassette-123' },
                }),
            );
        });

        it('should throw NotFoundException if cassette not found', async () => {
            mockPrismaService.cassette.findUnique.mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCassetteTypes', () => {
        it('should return all cassette types', async () => {
            const mockTypes = [
                { id: '1', typeCode: 'RB', machineType: 'RB-100' },
                { id: '2', typeCode: 'AB', machineType: 'AB-200' },
                { id: '3', typeCode: 'URJB', machineType: 'URJB-300' },
            ];

            mockPrismaService.cassetteType.findMany.mockResolvedValue(mockTypes);

            const result = await service.getCassetteTypes();

            expect(result).toEqual(mockTypes);
            expect(mockPrismaService.cassetteType.findMany).toHaveBeenCalled();
        });
    });

    describe('getStatisticsByBank', () => {
        it('should return statistics for a bank', async () => {
            const bankId = 'bank-123';

            mockPrismaService.cassette.count
                .mockResolvedValueOnce(10)  // total
                .mockResolvedValueOnce(6)   // ok
                .mockResolvedValueOnce(2)   // bad
                .mockResolvedValueOnce(1)   // inTransit
                .mockResolvedValueOnce(1)   // inRepair
                .mockResolvedValueOnce(0);  // readyForPickup

            const result = await service.getStatisticsByBank(bankId);

            expect(result).toBeDefined();
            expect(result.total).toBe(10);
            expect(result.ok).toBe(6);
            expect(result.bad).toBe(2);
            expect(mockPrismaService.cassette.count).toHaveBeenCalled();
        });
    });
});
