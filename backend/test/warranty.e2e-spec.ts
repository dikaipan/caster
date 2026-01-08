import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    createTestAdminUser,
    createTestOrganization,
    createTestCassette,
    createTestMachine,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_PASSWORD } from './test-fixtures';
import { HitachiUserRole, WarrantyType } from '@prisma/client';

describe('Warranty (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let customerBank: any;
    let pengelolaOrg: any;
    let cassette: any;
    let machine: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create RC Manager
        const admin = await createTestAdminUser(prisma, uniqueId, {
            role: HitachiUserRole.RC_MANAGER,
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);

        // Create Organization (Bank + Pengelola)
        const org = await createTestOrganization(prisma, uniqueId, 'WAR');
        customerBank = org.customerBank;
        pengelolaOrg = org.pengelolaOrg;

        // Create Machine & Cassette for status check
        machine = await createTestMachine(prisma, customerBank.id, pengelolaOrg.id, uniqueId);
        cassette = await createTestCassette(prisma, customerBank.id, uniqueId, { machineId: machine.id });
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: [adminUser.id],
            customerBankIds: [customerBank.id],
            pengelolaIds: [pengelolaOrg.id],
            cassetteIds: [cassette.id],
            machineIds: [machine.id],
        });
        await app.close();
    });

    describe('Warranty Configuration', () => {
        const warrantyType = 'MA';

        it('POST /config/:customerBankId - should create warranty config', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/v1/warranty/config/${customerBank.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    warrantyType: warrantyType,
                    warrantyPeriodDays: 90,
                    maxWarrantyClaims: 2,
                    unlimitedClaims: false,
                    requiresApproval: true,
                    autoApproveFirstClaim: true,
                    notes: 'Test Warranty Config'
                })
                .expect(201);

            expect(response.body.warrantyType).toBe(warrantyType);
            expect(response.body.warrantyPeriodDays).toBe(90);
        });

        it('GET /config/:customerBankId - should list warranty configs', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/warranty/config/${customerBank.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            const config = response.body.find((c: any) => c.warrantyType === warrantyType);
            expect(config).toBeDefined();
            expect(config.isActive).toBe(true);
        });

        it('PATCH /config/:customerBankId/:warrantyType - should update config', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/warranty/config/${customerBank.id}/${warrantyType}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    warrantyPeriodDays: 120,
                    notes: 'Updated Warranty Config'
                })
                .expect(200);

            expect(response.body.warrantyPeriodDays).toBe(120);
            expect(response.body.notes).toBe('Updated Warranty Config');
        });
    });

    describe('Warranty Status & Statistics', () => {
        it('GET /status/:cassetteId - should check warranty status (fresh cassette)', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/warranty/status/${cassette.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Fresh cassette should not be under warranty
            expect(response.body.isUnderWarranty).toBe(false);
            expect(response.body.warrantyType).toBeNull();
        });

        it('GET /statistics/:customerBankId - should get warranty statistics', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/warranty/statistics/${customerBank.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('totalActiveWarranties');
            expect(response.body).toHaveProperty('claimRate');
            // Should be 0 initially
            expect(response.body.totalActiveWarranties).toBe(0);
        });
    });
});
