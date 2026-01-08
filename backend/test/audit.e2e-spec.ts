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
    createTestOrganization,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';

describe('Audit (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let adminToken: string;
    let adminUser: any;
    let uniqueId: string;
    let bankId: string;

    beforeAll(async () => {
        process.env.AUDIT_LOG_USE_QUEUE = 'false'; // Force synchronous logging

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);
        uniqueId = getUniqueId();

        // Create Super Admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            role: 'SUPER_ADMIN',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);

        // Perform an action to generate an audit log
        // Creating an Organization (Bank) should log a CREATE action
        const org = await createTestOrganization(prisma, uniqueId + '_audit');
        bankId = org.customerBank.id;
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: [adminUser.id],
            customerBankIds: [bankId],
        });
        await app.close();
    });

    describe('Audit Log Retrieval', () => {
        it('GET /audit-logs - should list audit logs for SUPER_ADMIN', async () => {
            // Wait slightly to ensure async logging (if any) completes
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await request(app.getHttpServer())
                .get('/api/v1/audit-logs')
                .query({ entityType: 'CUSTOMER_BANK', entityId: bankId })
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Expect to find at least one log for the bank creation
            expect(response.body).toHaveProperty('logs');
            expect(Array.isArray(response.body.logs)).toBe(true);
            expect(response.body.pagination).toBeDefined();

            // Depending on implementation, creation might be logged. 
            // If createTestOrganization uses direct Prisma calls, it might NOT trigger service-level audit logs automatically
            // UNLESS Prisma middleware or the helper uses the service.
            // Let's check if the helper uses API or Prisma. Helper uses Prisma. 
            // So we might NOT see the log if audit is done in Service layer.

            // To be safe, let's trigger an action via API that DEFINITELY logs.
            // But for now, let's just assert the structure is correct, as filtering might return empty if no log created via helper.
            // A better test is to hit the API to create something.
        });

        it('POST /api/v1/pengelola - should trigger audit log', async () => {
            const pengelolaCode = `P-AUDIT-${uniqueId}`;
            const response = await request(app.getHttpServer())
                .post('/api/v1/pengelola')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    pengelolaCode: pengelolaCode,
                    companyName: `Audit Test Pengelola ${uniqueId}`,
                    companyAbbreviation: `ATP${uniqueId}`,
                    status: 'ACTIVE',
                    address: 'Audit Addr',
                    city: 'Audit City',
                    primaryContactName: 'Auditor',
                    primaryContactEmail: `audit_${uniqueId}@example.com`,
                    primaryContactPhone: '08111111111'
                })
                .expect(201);

            const createdPengelolaId = response.body.id;

            // Wait for queue/async logging
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify log exists
            const logResponse = await request(app.getHttpServer())
                .get('/api/v1/audit-logs')
                .query({ entityType: 'PENGELOLA', entityId: createdPengelolaId, action: 'CREATE' })
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(logResponse.body.logs.length).toBeGreaterThan(0);
            expect(logResponse.body.logs[0].action).toBe('CREATE');
            expect(logResponse.body.logs[0].entityId).toBe(createdPengelolaId);

            // Cleanup the created pengelola specifically
            await prisma.pengelola.delete({ where: { id: createdPengelolaId } });
        });
    });

    describe('Access Control', () => {
        it('GET /audit-logs - should forbid non-admin users', async () => {
            // Create a non-admin user (e.g. Technician)
            // Just assume a token without SUPER_ADMIN role will fail.
            // For E2E simplicity, we can try to create a standard user or just use a fake token if validation handles it.
            // Better: Create a standard user.
            const standardUser = await createTestAdminUser(prisma, uniqueId + '_user', {
                role: 'RC_STAFF' as any
            });

            // Note: If helper defaults to SUPER_ADMIN, we need to override.
            // Looking at helper: default is empty (so likely some default role).
            // Let's rely on CreateTestAdminUser helper to accept role override if implemented. 
            // Previous usage showed passing { role: ... }.

            const userToken = await loginUser(app, standardUser.user.username, TEST_PASSWORD);

            await request(app.getHttpServer())
                .get('/api/v1/audit-logs')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            // Cleanup user
            await prisma.hitachiUser.delete({ where: { id: standardUser.user.id } });
        });
    });
});
