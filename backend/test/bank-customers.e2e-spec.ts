import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';

describe('Bank Customers (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let createdBankId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'bank_cust_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            customerBankIds: createdBankId ? [createdBankId] : [],
            userIds: [adminUser.id],
        });
        await app.close();
    });

    describe('POST /api/v1/bank-customers', () => {
        it('should create a new bank customer', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/bank-customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankCode: `BC-${uniqueId}`,
                    bankName: `Test Bank Customer ${uniqueId}`,
                    status: 'ACTIVE',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.bankCode).toBe(`BC-${uniqueId}`);
            expect(response.body.status).toBe('ACTIVE');

            createdBankId = response.body.id;
        });

        it('should reject duplicate bank code', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/bank-customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankCode: `BC-${uniqueId}`,
                    bankName: 'Duplicate Bank Customer',
                    status: 'ACTIVE',
                })
                .expect(409);
        });
    });

    describe('GET /api/v1/bank-customers/:id', () => {
        it('should get bank customer by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/bank-customers/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(createdBankId);
            expect(response.body.bankCode).toBe(`BC-${uniqueId}`);
        });
    });

    describe('GET /api/v1/bank-customers', () => {
        it('should list all bank customers', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/bank-customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // BankCustomers controller returns array directly, unlike Banks controller
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            const createdBank = response.body.find((b: any) => b.id === createdBankId);
            expect(createdBank).toBeDefined();
            expect(createdBank).toHaveProperty('warrantyStatus'); // Check computed property
        });
    });

    describe('PATCH /api/v1/bank-customers/:id', () => {
        it('should update bank customer details', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/bank-customers/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankName: 'Updated Customer Name',
                })
                .expect(200);

            expect(response.body.bankName).toBe('Updated Customer Name');
        });
    });

    describe('GET /api/v1/bank-customers/:id/statistics', () => {
        it('should get bank customer statistics', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/bank-customers/${createdBankId}/statistics`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('totalMachines');
            expect(response.body).toHaveProperty('operationalMachines');
            expect(response.body).toHaveProperty('totalCassettes');
        });
    });

    describe('DELETE /api/v1/bank-customers/:id', () => {
        it('should delete bank customer', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/bank-customers/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/bank-customers/${createdBankId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            createdBankId = ''; // Prevent double cleanup
        });
    });
});
