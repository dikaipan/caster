import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    createTestOrganization,
    createTestMachine,
    createTestCassette,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';

describe('Preventive Maintenance (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let pengelolaOrg: any;
    let customerBank: any;
    let machine: any;
    let cassette: any;
    let pmId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'PM');
        pengelolaOrg = org.pengelolaOrg;
        customerBank = org.customerBank;

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'pm_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);

        // Create test machine
        machine = await createTestMachine(prisma, customerBank.id, pengelolaOrg.id, uniqueId);

        // Create test cassette
        cassette = await createTestCassette(prisma, customerBank.id, uniqueId, { machineId: machine.id });
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            pmIds: pmId ? [pmId] : [],
            cassetteIds: [cassette.id],
            machineIds: [machine.id],
            customerBankIds: [customerBank.id],
            pengelolaIds: [pengelolaOrg.id],
            userIds: [adminUser.id],
        });
        await app.close();
    });

    describe('POST /api/v1/preventive-maintenance', () => {
        it('should create a new PM task', async () => {
            // Future date
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 7);

            const response = await request(app.getHttpServer())
                .post('/api/v1/preventive-maintenance')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'ROUTINE',
                    cassetteIds: [cassette.id],
                    scheduledDate: scheduledDate.toISOString(),
                    title: `PM Service ${uniqueId}`,
                    description: 'Routine check',
                    location: 'PENGELOLA_LOCATION'
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.pmNumber).toBeDefined();
            expect(response.body.status).toBe('SCHEDULED');
            expect(response.body.cassetteDetails).toHaveLength(1);
            expect(response.body.cassetteDetails[0].cassetteId).toBe(cassette.id);

            pmId = response.body.id;
        });

        it('should validate cassette availability (cannot create simultaneous PM)', async () => {
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 14);

            await request(app.getHttpServer())
                .post('/api/v1/preventive-maintenance')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'ROUTINE',
                    cassetteIds: [cassette.id],
                    scheduledDate: scheduledDate.toISOString(),
                    title: 'Duplicate PM',
                })
                .expect(400); // Bad Request because cassette already has active PM
        });
    });

    describe('GET /api/v1/preventive-maintenance', () => {
        it('should list PM tasks', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/preventive-maintenance')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: uniqueId })
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body.data.length).toBeGreaterThan(0);
            const pm = response.body.data.find((p: any) => p.id === pmId);
            expect(pm).toBeDefined();
        });
    });

    describe('POST /api/v1/preventive-maintenance/:id/take', () => {
        it('should assign PM task to self', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/v1/preventive-maintenance/${pmId}/take`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(201);

            expect(response.body.assignedEngineer).toBe(adminUser.id);
        });
    });

    describe('PATCH /api/v1/preventive-maintenance/:id/cassette/:cassetteId', () => {
        it('should update cassette detail checklist', async () => {
            // First we need to move status to IN_PROGRESS (updated via main PM update usually, but let's check basic update flow)
            // Actually, usually we start the PM first.

            // Let's set PM to IN_PROGRESS first
            await request(app.getHttpServer())
                .patch(`/api/v1/preventive-maintenance/${pmId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'IN_PROGRESS' })
                .expect(200);

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/preventive-maintenance/${pmId}/cassette/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    checklist: { visualCheck: true, sensorCheck: true },
                    findings: 'Dust found',
                    actionsTaken: 'Cleaned',
                    status: 'OK'
                })
                .expect(200);

            expect(response.body.findings).toBe('Dust found');
        });
    });

    describe('PATCH /api/v1/preventive-maintenance/:id', () => {
        it('should complete the PM task', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/preventive-maintenance/${pmId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'COMPLETED',
                    recommendations: 'Keep clean'
                })
                .expect(200);

            expect(response.body.status).toBe('COMPLETED');
            expect(response.body.actualEndDate).toBeDefined();
        });
    });
});
