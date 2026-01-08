import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
    CassetteStatus,
    OrganizationStatus,
    HitachiUserRole,
    HitachiUserDepartment,
    PengelolaUserRole,
    ProblemTicketStatus,
    RepairTicketStatus
} from '@prisma/client';

describe('Repairs Integration (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    // Test Users
    let adminToken: string;
    let adminUser: any;
    let pengelolaUser: any;
    let pengelolaOrg: any;
    let customerBank: any;

    // Test Data
    let ticketId: string;
    let cassetteId: string;
    let machineId: string;
    let repairTicketId: string;

    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const adminUsername = `admin_r_${uniqueId}`;
    const password = 'Password123!';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();

        prisma = app.get(PrismaService);

        // 1. Create Organization Structure (Bank & Pengelola)
        customerBank = await prisma.customerBank.create({
            data: {
                bankCode: `BANK-R-${uniqueId}`,
                bankName: `Test Bank Repair ${uniqueId}`,
                status: OrganizationStatus.ACTIVE,
            }
        });

        pengelolaOrg = await prisma.pengelola.create({
            data: {
                pengelolaCode: `PENG-R-${uniqueId}`,
                companyName: `Test Pengelola Repair ${uniqueId}`,
                companyAbbreviation: `TP${uniqueId}`,
                status: OrganizationStatus.ACTIVE,
            }
        });

        // 1.5 Create Bank Assignments
        await prisma.bankPengelolaAssignment.create({
            data: {
                customerBankId: customerBank.id,
                pengelolaId: pengelolaOrg.id,
                status: OrganizationStatus.ACTIVE,
            }
        });

        // 2. Create Admin User
        const hashedPassword = await bcrypt.hash(password, 10);
        adminUser = await prisma.hitachiUser.create({
            data: {
                email: `admin_r_${uniqueId}@example.com`,
                username: adminUsername,
                passwordHash: hashedPassword,
                role: HitachiUserRole.SUPER_ADMIN,
                department: HitachiUserDepartment.REPAIR_CENTER,
                fullName: 'Test Admin Repair',
                status: OrganizationStatus.ACTIVE,
            },
        });

        // 2.5 Create Pengelola User (Reporter)
        pengelolaUser = await prisma.pengelolaUser.create({
            data: {
                email: `supervisor_r_${uniqueId}@example.com`,
                username: `supervisor_r_${uniqueId}`,
                passwordHash: hashedPassword,
                role: PengelolaUserRole.SUPERVISOR,
                fullName: 'Test Supervisor Repair',
                status: OrganizationStatus.ACTIVE,
                pengelolaId: pengelolaOrg.id,
            },
        });

        // 3. Create Machine
        const machine = await prisma.machine.create({
            data: {
                machineCode: `MACH-R-${uniqueId}`,
                modelName: 'TestModel',
                serialNumberManufacturer: `SN-R-${uniqueId}`,
                physicalLocation: 'Test Location',
                customerBankId: customerBank.id,
                pengelolaId: pengelolaOrg.id,
                status: 'OPERATIONAL' as any,
            }
        });
        machineId = machine.id;

        // 4. Create Cassette (Cassette must exist to be repaired)
        const cassetteType = await prisma.cassetteType.findFirst();
        const cassette = await prisma.cassette.create({
            data: {
                serialNumber: `RB-REPAIR-${uniqueId}`,
                status: CassetteStatus.BAD,
                cassetteTypeId: cassetteType?.id || 'default',
                customerBankId: customerBank.id,
                machineId: machine.id,
            }
        });
        cassetteId = cassette.id;

        // 5. Create Problem Ticket (IN_PROGRESS/RECEIVED)
        const ticket = await prisma.problemTicket.create({
            data: {
                ticketNumber: `SO-R-${uniqueId}`,
                title: 'Test Repair Ticket',
                description: 'Cassette broken',
                priority: 'MEDIUM',
                status: ProblemTicketStatus.RECEIVED,
                deliveryMethod: 'SELF_DELIVERY',
                cassetteId: cassetteId,
                reportedBy: pengelolaUser.id, // Must be PengelolaUser
            }
        });
        ticketId = ticket.id;

        // 6. Login
        const adminLogin = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ username: adminUsername, password: password });
        adminToken = adminLogin.body.tokens?.access_token;

        if (!adminToken) {
            console.error('Admin login failed:', adminLogin.body, adminLogin.status);
            // Fallback for debug
            const adminLogin2 = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ username: adminUsername, password: password });
            console.log('Fallback login status:', adminLogin2.status);
        }
    });

    afterAll(async () => {
        // Cleanup based on unique IDs
        try {
            if (ticketId) await prisma.problemTicket.delete({ where: { id: ticketId } }).catch(() => { });
            if (cassetteId) await prisma.cassette.delete({ where: { id: cassetteId } }).catch(() => { });
            if (machineId) await prisma.machine.delete({ where: { id: machineId } }).catch(() => { });
            if (adminUser) await prisma.hitachiUser.delete({ where: { id: adminUser.id } }).catch(() => { });
            if (pengelolaOrg) await prisma.pengelola.delete({ where: { id: pengelolaOrg.id } }).catch(() => { });
            if (customerBank) await prisma.customerBank.delete({ where: { id: customerBank.id } }).catch(() => { });
        } catch (e) { }
        await app.close();
    });

    it('1. Admin should Create Repair Tickets (Bulk from Problem Ticket)', () => {
        return request(app.getHttpServer())
            .post(`/api/v1/repairs/bulk-from-ticket/${ticketId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(201)
            .expect((res) => {
                expect(res.body.count).toBeGreaterThan(0);
                expect(res.body.repairTickets).toBeDefined();
                expect(Array.isArray(res.body.repairTickets)).toBeTruthy();
                repairTicketId = res.body.repairTickets[0].id;
            });
    });

    it('2. Admin should Take Ticket', async () => {
        const res = await request(app.getHttpServer())
            .post(`/api/v1/repairs/${repairTicketId}/take`)
            .set('Authorization', `Bearer ${adminToken}`);

        if (res.status !== 201) {
            console.error('Step 2 Failed:', res.status, JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        expect(res.body.status).toBe(RepairTicketStatus.ON_PROGRESS);
    });

    it('3. Admin should Complete Repair', async () => {
        const res = await request(app.getHttpServer())
            .post(`/api/v1/repairs/${repairTicketId}/complete`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                repairActionTaken: 'Replaced broken gear',
                partsReplaced: [],
                qcPassed: true,
            });

        if (res.status !== 201) {
            console.error('Step 3 Failed:', res.status, JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        expect(res.body.status).toBe(RepairTicketStatus.COMPLETED);
    });

    it('4. Status Sync Check: Problem Ticket should be RESOLVED', async () => {
        // Manual sync might be async, but controller usually awaits it.
        const updatedTicket = await prisma.problemTicket.findUnique({
            where: { id: ticketId }
        });
        expect(updatedTicket?.status).toBe(ProblemTicketStatus.RESOLVED);
    });
});
