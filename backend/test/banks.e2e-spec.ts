import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    createTestOrganization,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';

describe('Banks (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let createdBankId: string;
    let pengelolaOrg: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'BANK');
        pengelolaOrg = org.pengelolaOrg;

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'bank_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            customerBankIds: createdBankId ? [createdBankId] : [],
            userIds: [adminUser.id],
            pengelolaIds: [pengelolaOrg.id],
        });
        await app.close();
    });

    describe('POST /api/v1/banks', () => {
        it('should create a new customer bank', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankCode: `BANK-NEW-${uniqueId}`,
                    bankName: `Test New Bank ${uniqueId}`,
                    status: 'ACTIVE',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.bankCode).toBe(`BANK-NEW-${uniqueId}`);
            expect(response.body.status).toBe('ACTIVE');

            createdBankId = response.body.id;
        });

        it('should reject duplicate bank code', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankCode: `BANK-NEW-${uniqueId}`,
                    bankName: 'Duplicate Bank',
                    status: 'ACTIVE',
                })
                .expect(409);
        });
    });

    describe('GET /api/v1/banks/:id', () => {
        it('should get bank by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/banks/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(createdBankId);
            expect(response.body.bankCode).toBe(`BANK-NEW-${uniqueId}`);
        });
    });

    describe('GET /api/v1/banks', () => {
        it('should list all banks', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('PATCH /api/v1/banks/:id', () => {
        it('should update bank details', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/banks/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankName: 'Updated Bank Name',
                })
                .expect(200);

            expect(response.body.bankName).toBe('Updated Bank Name');
        });
    });

    describe('POST /api/v1/banks/:id/assign-pengelola', () => {
        it('should assign pengelola to bank', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/v1/banks/${createdBankId}/assign-pengelola`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    pengelolaId: pengelolaOrg.id,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.customerBankId).toBe(createdBankId);
            expect(response.body.pengelolaId).toBe(pengelolaOrg.id);
        });
    });

    describe('GET /api/v1/banks/:id/analytics', () => {
        it('should get bank analytics', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/banks/${createdBankId}/analytics`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('bankId');
            expect(response.body.bankId).toBe(createdBankId);
        });
    });

    describe('DELETE /api/v1/banks/:id', () => {
        it('should delete bank', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/banks/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/banks/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            createdBankId = ''; // Prevent double cleanup
        });
    });
});
