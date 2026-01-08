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
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
import { TEST_MACHINES, TEST_PASSWORD } from './test-fixtures';

describe('Machines (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let uniqueId: string;
    let adminToken: string;
    let adminUser: any;
    let pengelolaOrg: any;
    let customerBank: any;
    let machine: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);

        uniqueId = getUniqueId();

        // Create test organization
        const org = await createTestOrganization(prisma, uniqueId, 'MACH');
        customerBank = org.customerBank;
        pengelolaOrg = org.pengelolaOrg;

        // Create test admin
        const admin = await createTestAdminUser(prisma, uniqueId, {
            prefix: 'mach_admin',
        });
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            machineIds: machine ? [machine.id] : [],
            userIds: [adminUser.id],
            pengelolaIds: [pengelolaOrg.id],
            customerBankIds: [customerBank.id],
        });
        await app.close();
    });

    describe('POST /api/v1/machines', () => {
        it('should create a new machine', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    machineCode: `MACH-NEW-${uniqueId}`,
                    modelName: TEST_MACHINES.CRM_MACHINE.modelName,
                    serialNumberManufacturer: `SN-NEW-${uniqueId}`,
                    physicalLocation: TEST_MACHINES.CRM_MACHINE.physicalLocation,
                    customerBankId: customerBank.id,
                    pengelolaId: pengelolaOrg.id,
                    status: TEST_MACHINES.CRM_MACHINE.status,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.machineCode).toBe(`MACH-NEW-${uniqueId}`);
            expect(response.body.modelName).toBe(TEST_MACHINES.CRM_MACHINE.modelName);

            machine = response.body;
        });

        it('should reject duplicate machine code', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    machineCode: machine.machineCode,
                    modelName: TEST_MACHINES.CRM_MACHINE.modelName,
                    serialNumberManufacturer: `SN-DUP-${uniqueId}`,
                    physicalLocation: TEST_MACHINES.CRM_MACHINE.physicalLocation,
                    customerBankId: customerBank.id,
                    pengelolaId: pengelolaOrg.id,
                })
                .expect(409);
        });

        it('should reject creation without authentication', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/machines')
                .send({
                    machineCode: `MACH-UNAUTH-${uniqueId}`,
                    modelName: TEST_MACHINES.CRM_MACHINE.modelName,
                    serialNumberManufacturer: `SN-UNAUTH-${uniqueId}`,
                    customerBankId: customerBank.id,
                    pengelolaId: pengelolaOrg.id,
                })
                .expect(401);
        });
    });

    describe('GET /api/v1/machines/:id', () => {
        it('should get machine by ID', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/machines/${machine.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.id).toBe(machine.id);
            expect(response.body.machineCode).toBe(machine.machineCode);
        });

        it('should return 404 for non-existent machine', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/machines/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('GET /api/v1/machines', () => {
        it('should list machines with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 10 })
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter machines by customer bank', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ customerBankId: customerBank.id })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((m: any) => {
                expect(m.customerBankId).toBe(customerBank.id);
            });
        });

        it('should filter machines by pengelola', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ pengelolaId: pengelolaOrg.id })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            // response.body.data.forEach((m: any) => {
            //    expect(m.pengelola.id).toBe(pengelolaOrg.id);
            // });
        });

        it('should search machines by model name', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: TEST_MACHINES.CRM_MACHINE.modelName })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('PATCH /api/v1/machines/:id', () => {
        it('should update machine details', async () => {
            const newLocation = 'Jakarta Updated Location';
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/machines/${machine.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    physicalLocation: newLocation,
                })
                .expect(200);

            expect(response.body.physicalLocation).toBe(newLocation);
        });

        it('should update machine status', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/machines/${machine.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'MAINTENANCE',
                })
                .expect(200);

            expect(response.body.status).toBe('MAINTENANCE');
        });
    });

    describe('GET /api/v1/machines/:id/analytics', () => {
        it('should get machine analytics', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/machines/${machine.id}/analytics`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('machineId');
            expect(response.body.machineId).toBe(machine.id);
        });
    });

    describe('GET /api/v1/machines/:id/cassettes', () => {
        it('should get cassettes linked to machine', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/machines/${machine.id}/cassettes`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('DELETE /api/v1/machines/:id', () => {
        it('should delete machine', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/machines/${machine.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/machines/${machine.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            machine = null; // Prevent double cleanup
        });

        it('should return 404 when deleting non-existent machine', async () => {
            await request(app.getHttpServer())
                .delete('/api/v1/machines/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });
});
