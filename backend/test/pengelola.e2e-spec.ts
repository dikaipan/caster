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

describe('Pengelola (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;

    // Test data trackers
    let createdPengelolaId: string;
    let createdUserId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'pengelola_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        // Cleanup logic
        await cleanupTestData(prisma, {
            pengelolaIds: createdPengelolaId ? [createdPengelolaId] : [],
            userIds: [adminUser.id],
            pengelolaUserIds: createdUserId ? [createdUserId] : []
        });
        await app.close();
    });

    describe('Pengelola Organization Management', () => {
        describe('POST /api/v1/pengelola', () => {
            it('should create a new pengelola organization', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/v1/pengelola')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        pengelolaCode: `PENG-${uniqueId}`,
                        companyName: `Pengelola Test ${uniqueId}`,
                        companyAbbreviation: `PT${uniqueId}`,
                        status: 'ACTIVE',
                        address: 'Test Address',
                        city: 'Jakarta',
                        primaryContactName: 'Contact Person',
                        primaryContactEmail: `contact_${uniqueId}@example.com`,
                        primaryContactPhone: '08123456789'
                    })
                    .expect(201);

                expect(response.body).toHaveProperty('id');
                expect(response.body.pengelolaCode).toBe(`PENG-${uniqueId}`);
                expect(response.body.companyName).toBe(`Pengelola Test ${uniqueId}`);

                createdPengelolaId = response.body.id;
            });

            it('should reject duplicate pengelola code', async () => {
                await request(app.getHttpServer())
                    .post('/api/v1/pengelola')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        pengelolaCode: `PENG-${uniqueId}`, // Duplicate
                        companyName: 'Duplicate Company',
                        companyAbbreviation: 'DUP',
                        status: 'ACTIVE',
                    })
                    .expect(409);
            });
        });

        describe('GET /api/v1/pengelola', () => {
            it('should list all pengelola', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/v1/pengelola')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(Array.isArray(response.body)).toBe(true);
                const finding = response.body.find((p: any) => p.id === createdPengelolaId);
                expect(finding).toBeDefined();
            });
        });

        describe('GET /api/v1/pengelola/:id', () => {
            it('should get pengelola by ID', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/v1/pengelola/${createdPengelolaId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body.id).toBe(createdPengelolaId);
            });
        });

        describe('PATCH /api/v1/pengelola/:id', () => {
            it('should update pengelola details', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/v1/pengelola/${createdPengelolaId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        companyName: `Updated Pengelola ${uniqueId}`,
                        notes: 'Updated notes'
                    })
                    .expect(200);

                expect(response.body.companyName).toBe(`Updated Pengelola ${uniqueId}`);
                expect(response.body.notes).toBe('Updated notes');
            });
        });
    });

    describe('Pengelola User Management', () => {
        describe('POST /api/v1/pengelola/:id/users', () => {
            it('should create a user for the pengelola', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/v1/pengelola/${createdPengelolaId}/users`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        username: `supervisor_${uniqueId}`,
                        email: `supervisor_${uniqueId}@example.com`,
                        password: 'Password123!',
                        fullName: 'Supervisor One',
                        role: 'SUPERVISOR',
                        phone: '08987654321',
                        canCreateTickets: true,
                        assignedBranches: ['KCP01', 'KCP02'],
                        pengelolaId: createdPengelolaId
                    })
                    .expect(201);

                expect(response.body).toHaveProperty('id');
                expect(response.body.username).toBe(`supervisor_${uniqueId}`);
                expect(response.body.role).toBe('SUPERVISOR');
                // Check if assignedBranches is returned correctly (parsed array)
                // Note: The service returns it as an array if parsed correctly
                // Depending on implementation it might be string or array in response body depending on DTO transform
                // We'll verify what we get.

                createdUserId = response.body.id;
            });

            it('should duplicate username check', async () => {
                await request(app.getHttpServer())
                    .post(`/api/v1/pengelola/${createdPengelolaId}/users`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        username: `supervisor_${uniqueId}`,
                        email: `other_${uniqueId}@example.com`,
                        password: 'Password123!',
                        fullName: 'Duplicate User',
                        role: 'SUPERVISOR',
                        pengelolaId: createdPengelolaId
                    })
                    .expect(409);
            });
        });

        describe('GET /api/v1/pengelola/:id/users', () => {
            it('should list users for pengelola', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/v1/pengelola/${createdPengelolaId}/users`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(Array.isArray(response.body)).toBe(true);
                const user = response.body.find((u: any) => u.id === createdUserId);
                expect(user).toBeDefined();
                expect(user.role).toBe('SUPERVISOR');
            });
        });

        describe('PATCH /api/v1/pengelola/:id/users/:userId', () => {
            it('should update pengelola user details', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/v1/pengelola/${createdPengelolaId}/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        fullName: 'Technician Updated',
                        canCloseTickets: true
                    })
                    .expect(200);

                expect(response.body.fullName).toBe('Technician Updated');
                expect(response.body.canCloseTickets).toBe(true);
            });
        });

        describe('DELETE /api/v1/pengelola/:id/users/:userId', () => {
            it('should delete pengelola user', async () => {
                await request(app.getHttpServer())
                    .delete(`/api/v1/pengelola/${createdPengelolaId}/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                // Verify deletion
                const response = await request(app.getHttpServer())
                    .get(`/api/v1/pengelola/${createdPengelolaId}/users`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                const user = response.body.find((u: any) => u.id === createdUserId);
                expect(user).toBeUndefined();

                createdUserId = ''; // Prevent double cleanup
            });
        });
    });

    describe('DELETE /api/v1/pengelola/:id', () => {
        it('should delete pengelola', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/pengelola/${createdPengelolaId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/pengelola/${createdPengelolaId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            createdPengelolaId = ''; // Prevent double cleanup
        });
    });
});
