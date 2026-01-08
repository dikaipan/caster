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
    loginUser,
    cleanupTestData,
    setupTestApp,
    DEFAULT_TEST_PASSWORD,
} from './test-helpers';
import { TEST_USERS, TEST_PASSWORD } from './test-fixtures';
import { HitachiUserRole, PengelolaUserRole, OrganizationStatus } from '@prisma/client';

describe('Users (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let pengelolaOrg: any;
    let customerBank: any;
    let createdHitachiUserId: string;
    let createdPengelolaUserId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'USR');
        customerBank = org.customerBank;
        pengelolaOrg = org.pengelolaOrg;

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'usr_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: createdHitachiUserId ? [adminUser.id, createdHitachiUserId] : [adminUser.id],
            pengelolaUserIds: createdPengelolaUserId ? [createdPengelolaUserId] : [],
            pengelolaIds: [pengelolaOrg.id],
            customerBankIds: [customerBank.id],
        });
        await app.close();
    });

    describe('POST /api/v1/users/hitachi', () => {
        it('should create a new Hitachi user', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/users/hitachi')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `new_hitachi_${uniqueId}@example.com`,
                    username: `new_hitachi_${uniqueId}`,
                    password: TEST_PASSWORD,
                    role: HitachiUserRole.RC_STAFF,
                    department: TEST_USERS.RC_STAFF.department,
                    fullName: TEST_USERS.RC_STAFF.fullName,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.username).toBe(`new_hitachi_${uniqueId}`);
            expect(response.body.role).toBe(HitachiUserRole.RC_STAFF);
            expect(response.body).not.toHaveProperty('passwordHash');

            createdHitachiUserId = response.body.id;
        });

        it('should reject duplicate username', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/users/hitachi')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `duplicate_${uniqueId}@example.com`,
                    username: `new_hitachi_${uniqueId}`, // Duplicate
                    password: TEST_PASSWORD,
                    role: HitachiUserRole.RC_MANAGER,
                    department: TEST_USERS.RC_MANAGER.department,
                    fullName: 'Test Duplicate',
                })
                .expect(409);
        });

        it('should reject invalid email format', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/users/hitachi')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'invalid-email',
                    username: `invalid_email_${uniqueId}`,
                    password: TEST_PASSWORD,
                    role: HitachiUserRole.RC_STAFF,
                    department: TEST_USERS.RC_STAFF.department,
                    fullName: 'Test Invalid Email',
                })
                .expect(400);
        });
    });

    describe('POST /api/v1/users/pengelola', () => {
        it('should create a new Pengelola user', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/users/pengelola')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `new_pengelola_${uniqueId}@example.com`,
                    username: `new_pengelola_${uniqueId}`,
                    password: TEST_PASSWORD,
                    role: PengelolaUserRole.SUPERVISOR,
                    pengelolaId: pengelolaOrg.id,
                    fullName: TEST_USERS.PENGELOLA_SUPERVISOR_2.fullName,
                    canCreateTickets: true,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.username).toBe(`new_pengelola_${uniqueId}`);
            expect(response.body.role).toBe(PengelolaUserRole.SUPERVISOR);
            expect(response.body.pengelolaId).toBe(pengelolaOrg.id);

            createdPengelolaUserId = response.body.id;
        });

        it('should reject Pengelola user without pengelolaId', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/users/pengelola')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `no_org_${uniqueId}@example.com`,
                    username: `no_org_${uniqueId}`,
                    password: TEST_PASSWORD,
                    role: PengelolaUserRole.ADMIN,
                    fullName: 'Test No Org',
                })
                .expect(400);
        });
    });

    describe('GET /api/v1/users/hitachi/:id', () => {
        it('should get Hitachi user by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/users/hitachi/${createdHitachiUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(createdHitachiUserId);
            expect(response.body).not.toHaveProperty('passwordHash');
        });

        it('should return 404 for non-existent user', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/users/hitachi/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('GET /api/v1/users/hitachi', () => {
        it('should list Hitachi users', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/users/hitachi')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should filter users by role', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/users/hitachi')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ role: HitachiUserRole.RC_STAFF })
                .expect(200);

            response.body.data.forEach((user: any) => {
                expect(user.role).toBe(HitachiUserRole.RC_STAFF);
            });
        });
    });

    describe('PATCH /api/v1/users/hitachi/:id', () => {
        it('should update Hitachi user profile', async () => {
            const newFullName = 'Updated Engineer Name';
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/users/hitachi/${createdHitachiUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fullName: newFullName,
                })
                .expect(200);

            expect(response.body.fullName).toBe(newFullName);
        });

        it('should update user role', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/users/hitachi/${createdHitachiUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    role: HitachiUserRole.RC_MANAGER,
                })
                .expect(200);

            expect(response.body.role).toBe(HitachiUserRole.RC_MANAGER);
        });
    });

    describe('PATCH /api/v1/users/hitachi/:id/password', () => {
        it('should change user password', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/users/hitachi/${createdHitachiUserId}/password`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    newPassword: 'NewPassword456!',
                })
                .expect(200);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('PATCH /api/v1/users/hitachi/:id/deactivate', () => {
        it('should deactivate user', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/users/hitachi/${createdHitachiUserId}/deactivate`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.status).toBe(OrganizationStatus.INACTIVE);
        });

        it('should reactivate user', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/users/hitachi/${createdHitachiUserId}/activate`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.status).toBe(OrganizationStatus.ACTIVE);
        });
    });

    describe('DELETE /api/v1/users/hitachi/:id', () => {
        it('should delete Hitachi user', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/users/hitachi/${createdHitachiUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/users/hitachi/${createdHitachiUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            createdHitachiUserId = ''; // Prevent double cleanup
        });
    });

    describe('DELETE /api/v1/users/pengelola/:id', () => {
        it('should delete Pengelola user', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/users/pengelola/${createdPengelolaUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            createdPengelolaUserId = ''; // Prevent double cleanup
        });
    });
});
