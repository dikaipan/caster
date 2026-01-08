import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    createTestPengelolaUser,
    createTestOrganization,
    createTestMachine,
    createTestCassette,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_USERS, TEST_CASSETTES, TEST_PASSWORD } from './test-fixtures';

describe('Cassettes (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let pengelolaToken: string;
    let adminUser: any;
    let pengelolaUser: any;
    let pengelolaOrg: any;
    let customerBank: any;
    let machine: any;
    let cassette: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'CASS');
        customerBank = org.customerBank;
        pengelolaOrg = org.pengelolaOrg;

        // Create test users
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'cass_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);

        const pengelola = await createTestPengelolaUser(
            prisma,
            pengelolaOrg.id,
            uniqueId,
            {
                prefix: 'cass_peng',
            }
        );
        pengelolaUser = pengelola.user;
        pengelolaToken = await loginUser(app, pengelolaUser.username, TEST_PASSWORD);

        // Create test machine
        machine = await createTestMachine(
            prisma,
            customerBank.id,
            pengelolaOrg.id,
            uniqueId,
            'CASS-M'
        );
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            cassetteIds: cassette ? [cassette.id] : [],
            machineIds: [machine.id],
            userIds: [adminUser.id],
            pengelolaUserIds: [pengelolaUser.id],
            pengelolaIds: [pengelolaOrg.id],
            customerBankIds: [customerBank.id],
        });
        await app.close();
    });

    describe('POST /api/v1/cassettes', () => {
        it('should create a new cassette', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/cassettes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    serialNumber: `CASS-NEW-${uniqueId}`,
                    cassetteTypeCode: 'RB',
                    customerBankId: customerBank.id,
                    machineId: machine.id,
                    status: TEST_CASSETTES.OK_CASSETTE.status,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.serialNumber).toBe(`CASS-NEW-${uniqueId}`);
            expect(response.body.status).toBe(TEST_CASSETTES.OK_CASSETTE.status);

            cassette = response.body;
        });

        it('should reject duplicate serial number', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/cassettes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    serialNumber: cassette.serialNumber,
                    cassetteTypeCode: 'RB',
                    customerBankId: customerBank.id,
                    status: TEST_CASSETTES.OK_CASSETTE.status,
                })
                .expect(409); // Conflict
        });

        it('should reject creation without authentication', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/cassettes')
                .send({
                    serialNumber: `CASS-UNAUTH-${uniqueId}`,
                    cassetteTypeCode: 'RB',
                    customerBankId: customerBank.id,
                })
                .expect(401);
        });
    });

    describe('GET /api/v1/cassettes/:id', () => {
        it('should get cassette by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(cassette.id);
            expect(response.body.serialNumber).toBe(cassette.serialNumber);
        });

        it('should return 404 for non-existent cassette', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/cassettes/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('GET /api/v1/cassettes/serial/:serialNumber', () => {
        it('should get cassette by serial number', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/cassettes/serial/${cassette.serialNumber}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(cassette.id);
            expect(response.body.serialNumber).toBe(cassette.serialNumber);
        });

        it('should return 404 for non-existent serial number', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/cassettes/serial/NON-EXISTENT-SERIAL')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('PATCH /api/v1/cassettes/:id', () => {
        it('should update cassette status', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: TEST_CASSETTES.BAD_CASSETTE.status,
                })
                .expect(200);

            expect(response.body.status).toBe(TEST_CASSETTES.BAD_CASSETTE.status);
        });

        it('should update cassette machine assignment', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    machineId: null, // Unassign from machine
                })
                .expect(200);

            expect(response.body.machineId).toBeNull();
        });
    });

    describe('GET /api/v1/cassettes', () => {
        it('should list cassettes with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/cassettes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 10 })
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter cassettes by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/cassettes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ status: TEST_CASSETTES.BAD_CASSETTE.status })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((c: any) => {
                expect(c.status).toBe(TEST_CASSETTES.BAD_CASSETTE.status);
            });
        });

        it('should filter cassettes by customer bank', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/cassettes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ customerBankId: customerBank.id })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((c: any) => {
                expect(c.customerBankId).toBe(customerBank.id);
            });
        });
    });

    describe('GET /api/v1/cassettes/:id/qr', () => {
        it('should generate QR code for cassette', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/cassettes/${cassette.id}/qr`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('qrCode');
            expect(response.body.qrCode).toContain('data:image');
        });
    });

    describe('DELETE /api/v1/cassettes/:id', () => {
        it('should delete cassette', async () => {
            // First set to SCRAPPED as required by backend validation
            await request(app.getHttpServer())
                .patch(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'SCRAPPED' })
                .expect(200);

            await request(app.getHttpServer())
                .delete(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/cassettes/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            cassette = null; // Prevent double cleanup
        });

        it('should return 404 when deleting non-existent cassette', async () => {
            await request(app.getHttpServer())
                .delete('/api/v1/cassettes/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });
});
