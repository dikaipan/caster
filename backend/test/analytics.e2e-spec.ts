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

describe('Analytics (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let adminToken: string;
    let adminUser: any;
    let uniqueId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);
        uniqueId = getUniqueId();

        const admin = await createTestAdminUser(prisma, uniqueId);
        adminUser = admin.user;
        adminToken = await loginUser(app, adminUser.username, TEST_PASSWORD);
    });

    afterAll(async () => {
        await cleanupTestData(prisma, {
            userIds: [adminUser.id],
        });
        await app.close();
    });

    describe('Dashboard Analytics', () => {
        it('GET /operational-metrics - should return operational metrics', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/operational-metrics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('mttr');
            expect(response.body).toHaveProperty('mtbf');
            expect(response.body).toHaveProperty('avgCycleTime');
            expect(response.body).toHaveProperty('totalCompletedRepairs');
        });

        it('GET /cassette-analytics - should return cassette analytics', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/cassette-analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('top10Problematic');
            expect(Array.isArray(response.body.top10Problematic)).toBe(true);
            expect(response.body).toHaveProperty('utilizationRate');
            expect(response.body).toHaveProperty('totalCassettes');
        });

        it('GET /repair-analytics - should return repair analytics', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/repair-analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('successRate');
            expect(response.body).toHaveProperty('totalRepairs');
            expect(response.body).toHaveProperty('topIssues');
            expect(response.body).toHaveProperty('topParts');
        });

        it('GET /service-order-analytics - should return service order analytics', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/service-order-analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('avgResolutionTime');
            expect(response.body).toHaveProperty('monthlyTrend');
        });
    });
});
