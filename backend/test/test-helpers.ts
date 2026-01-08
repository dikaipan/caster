import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import {
    OrganizationStatus,
    HitachiUserRole,
    HitachiUserDepartment,
    PengelolaUserRole,
    CassetteStatus,
} from '@prisma/client';

/**
 * Generate a unique ID for test data to prevent conflicts
 */
export function getUniqueId(): string {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
}

/**
 * Default test password
 */
export const DEFAULT_TEST_PASSWORD = 'Password123!';

/**
 * Interface for test organization data
 */
export interface TestOrganization {
    customerBank: any;
    pengelolaOrg: any;
    assignment: any;
}

/**
 * Interface for test user data
 */
export interface TestUser {
    user: any;
    token?: string;
    password: string;
}

/**
 * Create a test customer bank and pengelola organization with assignment
 */
export async function createTestOrganization(
    prisma: PrismaService,
    uniqueId: string,
    prefix = 'TEST'
): Promise<TestOrganization> {
    const customerBank = await prisma.customerBank.create({
        data: {
            bankCode: `BANK-${prefix}-${uniqueId}`,
            bankName: `Test Bank ${prefix} ${uniqueId}`,
            status: OrganizationStatus.ACTIVE,
        }
    });

    const pengelolaOrg = await prisma.pengelola.create({
        data: {
            pengelolaCode: `PENG-${prefix}-${uniqueId}`,
            companyName: `Test Pengelola ${prefix} ${uniqueId}`,
            companyAbbreviation: `TP${uniqueId}`,
            status: OrganizationStatus.ACTIVE,
        }
    });

    const assignment = await prisma.bankPengelolaAssignment.create({
        data: {
            customerBankId: customerBank.id,
            pengelolaId: pengelolaOrg.id,
            status: OrganizationStatus.ACTIVE,
        }
    });

    return { customerBank, pengelolaOrg, assignment };
}

/**
 * Create a test Hitachi admin user
 */
export async function createTestAdminUser(
    prisma: PrismaService,
    uniqueId: string,
    options?: {
        role?: HitachiUserRole;
        department?: HitachiUserDepartment;
        password?: string;
        prefix?: string;
    }
): Promise<TestUser> {
    const prefix = options?.prefix || 'admin';
    const password = options?.password || DEFAULT_TEST_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.hitachiUser.create({
        data: {
            email: `${prefix}_${uniqueId}@example.com`,
            username: `${prefix}_${uniqueId}`,
            passwordHash: hashedPassword,
            role: options?.role || HitachiUserRole.SUPER_ADMIN,
            department: options?.department || HitachiUserDepartment.REPAIR_CENTER,
            fullName: `Test ${prefix} ${uniqueId}`,
            status: OrganizationStatus.ACTIVE,
        },
    });

    return { user, password };
}

/**
 * Create a test Pengelola user
 */
export async function createTestPengelolaUser(
    prisma: PrismaService,
    pengelolaId: string,
    uniqueId: string,
    options?: {
        role?: PengelolaUserRole;
        password?: string;
        prefix?: string;
        canCreateTickets?: boolean;
    }
): Promise<TestUser> {
    const prefix = options?.prefix || 'pengelola';
    const password = options?.password || DEFAULT_TEST_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.pengelolaUser.create({
        data: {
            email: `${prefix}_${uniqueId}@example.com`,
            username: `${prefix}_${uniqueId}`,
            passwordHash: hashedPassword,
            role: options?.role || PengelolaUserRole.ADMIN,
            pengelolaId: pengelolaId,
            fullName: `Test ${prefix} ${uniqueId}`,
            status: OrganizationStatus.ACTIVE,
            canCreateTickets: options?.canCreateTickets !== undefined ? options.canCreateTickets : true,
        },
    });

    return { user, password };
}

/**
 * Login a user and get their access token
 */
export async function loginUser(
    app: INestApplication,
    username: string,
    password: string
): Promise<string> {
    const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password });

    if (!response.body.tokens?.access_token) {
        console.error(`[LOGIN FAIL] Status: ${response.status}`);
        console.error(`[LOGIN FAIL] Body: ${JSON.stringify(response.body)}`);
        throw new Error(`Login failed for ${username}: ${JSON.stringify(response.body)}`);
    }

    return response.body.tokens.access_token;
}

/**
 * Create a test machine
 */
export async function createTestMachine(
    prisma: PrismaService,
    customerBankId: string,
    pengelolaId: string,
    uniqueId: string,
    prefix = 'MACH'
): Promise<any> {
    return await prisma.machine.create({
        data: {
            machineCode: `${prefix}-${uniqueId}`,
            modelName: 'TestModel',
            serialNumberManufacturer: `SN-${uniqueId}`,
            physicalLocation: 'Test Location',
            customerBankId: customerBankId,
            pengelolaId: pengelolaId,
            currentWsid: `WS-${uniqueId}`,
            status: 'OPERATIONAL' as any,
        }
    });
}

/**
 * Create a test cassette
 */
export async function createTestCassette(
    prisma: PrismaService,
    customerBankId: string,
    uniqueId: string,
    options?: {
        machineId?: string;
        status?: CassetteStatus;
        prefix?: string;
    }
): Promise<any> {
    // Get or create cassette type
    let cassetteType = await prisma.cassetteType.findUnique({ where: { typeCode: 'RB' as any } });
    if (!cassetteType) {
        try {
            cassetteType = await prisma.cassetteType.create({
                data: {
                    typeCode: 'RB' as any,
                    machineType: 'CRM',
                    description: 'Recycle Box'
                }
            });
        } catch (e) {
            cassetteType = await prisma.cassetteType.findUnique({ where: { typeCode: 'RB' as any } });
        }
    }

    const prefix = options?.prefix || 'CASSETTE';
    return await prisma.cassette.create({
        data: {
            serialNumber: `${prefix}-${uniqueId}`,
            status: options?.status || CassetteStatus.OK,
            cassetteTypeId: cassetteType!.id,
            customerBankId: customerBankId,
            machineId: options?.machineId,
        }
    });
}

/**
 * Cleanup test data in proper order (respecting foreign key constraints)
 */
export async function cleanupTestData(
    prisma: PrismaService,
    data: {
        ticketIds?: string[];
        pmIds?: string[];
        repairTicketIds?: string[];
        cassetteIds?: string[];
        machineIds?: string[];
        userIds?: string[];
        pengelolaUserIds?: string[];
        pengelolaIds?: string[];
        customerBankIds?: string[];
    }
): Promise<void> {
    try {
        // 1. Delete tickets and PMs first
        if (data.pmIds?.length) {
            await prisma.preventiveMaintenance.deleteMany({
                where: { id: { in: data.pmIds } },
            });
        }

        // 1b. Delete other tickets
        if (data.ticketIds) {
            for (const ticketId of data.ticketIds) {
                await prisma.cassetteDelivery.deleteMany({ where: { ticketId } }).catch(() => { });
                await prisma.cassetteReturn.deleteMany({ where: { ticketId } }).catch(() => { });
                await prisma.ticketCassetteDetail.deleteMany({ where: { ticketId } }).catch(() => { });
                await prisma.problemTicket.delete({ where: { id: ticketId } }).catch(() => { });
            }
        }

        // 2. Delete repair tickets
        if (data.repairTicketIds) {
            for (const id of data.repairTicketIds) {
                await prisma.repairTicket.delete({ where: { id } }).catch(() => { });
            }
        }

        // 3. Delete cassettes
        if (data.cassetteIds) {
            for (const id of data.cassetteIds) {
                await prisma.cassette.delete({ where: { id } }).catch(() => { });
            }
        }

        // 4. Delete machines
        if (data.machineIds) {
            for (const id of data.machineIds) {
                await prisma.machine.delete({ where: { id } }).catch(() => { });
            }
        }

        // 5. Delete users
        if (data.userIds) {
            for (const id of data.userIds) {
                await prisma.hitachiUser.delete({ where: { id } }).catch(() => { });
            }
        }

        if (data.pengelolaUserIds) {
            for (const id of data.pengelolaUserIds) {
                await prisma.pengelolaUser.delete({ where: { id } }).catch(() => { });
            }
        }

        // 6. Delete organizations (pengelola first, then banks)
        if (data.pengelolaIds) {
            for (const id of data.pengelolaIds) {
                await prisma.pengelola.delete({ where: { id } }).catch(() => { });
            }
        }

        if (data.customerBankIds) {
            for (const id of data.customerBankIds) {
                await prisma.customerBank.delete({ where: { id } }).catch(() => { });
            }
        }
    } catch (e) {
        console.error('Cleanup error:', e);
    }
}

/**
 * Setup test application with global prefix
 */
export async function setupTestApp(moduleFixture: any): Promise<INestApplication> {
    const app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    return app;
}
