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
} from './test-helpers';
import { TEST_USERS, TEST_PASSWORD } from './test-fixtures';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminUser: any;
    let pengelolaUser: any;
    let pengelolaOrg: any;
    let customerBank: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'AUTH');
        customerBank = org.customerBank;
        pengelolaOrg = org.pengelolaOrg;

        // Create test users
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'auth_admin',
            role: TEST_USERS.SUPER_ADMIN.role,
        });
        adminUser = admin.user;

        const pengelola = await createTestPengelolaUser(
            prisma,
            pengelolaOrg.id,
            uniqueId,
            {
                prefix: 'auth_pengelola',
                role: TEST_USERS.PENGELOLA_ADMIN.role,
            }
        );
        pengelolaUser = pengelola.user;
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: [adminUser.id],
            pengelolaUserIds: [pengelolaUser.id],
            pengelolaIds: [pengelolaOrg.id],
            customerBankIds: [customerBank.id],
        });
        await app.close();
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login HitachiUser with valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    username: adminUser.username,
                    password: TEST_PASSWORD,
                })
                .expect(200);

            expect(response.body).toHaveProperty('tokens');
            expect(response.body.tokens).toHaveProperty('access_token');
            expect(response.body.tokens).toHaveProperty('refresh_token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe(adminUser.username);
            expect(response.body.user.role).toBe(adminUser.role);
        });

        it('should login PengelolaUser with valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    username: pengelolaUser.username,
                    password: TEST_PASSWORD,
                })
                .expect(200);

            expect(response.body).toHaveProperty('tokens');
            expect(response.body.tokens).toHaveProperty('access_token');
            expect(response.body.tokens).toHaveProperty('refresh_token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe(pengelolaUser.username);
        });

        it('should reject login with invalid username', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    username: 'nonexistent_user',
                    password: TEST_PASSWORD,
                })
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject login with invalid password', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    username: adminUser.username,
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject login with missing credentials', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({})
                .expect(401);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        it('should refresh access token with valid refresh token', async () => {
            // Login first to get tokens
            const loginResponse = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    username: adminUser.username,
                    password: TEST_PASSWORD,
                });

            const refreshToken = loginResponse.body.tokens.refresh_token;

            // Use refresh token to get new access token
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refresh_token: refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
        });

        it('should reject invalid refresh token', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refresh_token: 'invalid_token_xyz' })
                .expect(401);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should logout user successfully', async () => {
            // Login first
            const token = await loginUser(
                app,
                adminUser.username,
                TEST_PASSWORD
            );

            // Logout
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject logout without token', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .expect(401);
        });
    });

    describe('GET /api/v1/auth/profile', () => {
        it('should get current user profile', async () => {
            const token = await loginUser(
                app,
                adminUser.username,
                TEST_PASSWORD
            );

            const response = await request(app.getHttpServer())
                .get('/api/v1/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body.username).toBe(adminUser.username);
            expect(response.body).not.toHaveProperty('passwordHash');
        });

        it('should reject profile request without token', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/auth/profile')
                .expect(401);
        });
    });
});
