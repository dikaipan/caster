import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { SentryHealthIndicator } from './../src/health/sentry.health';
import { MemoryHealthIndicator } from '@nestjs/terminus';

describe('Health (e2e)', () => {
    let app: INestApplication;

    const mockHealthIndicator = {
        isHealthy: jest.fn().mockResolvedValue({ status: 'up' }),
        checkHeap: jest.fn().mockResolvedValue({ status: 'up' }),
    };

    // Mock Sentry specifically as it has a custom implementation
    const mockSentryIndicator = {
        isHealthy: jest.fn().mockImplementation((key) => Promise.resolve({
            [key]: { status: 'up', message: 'Mocked Sentry' }
        })),
    };

    const mockMemoryIndicator = {
        checkHeap: jest.fn().mockImplementation((key) => Promise.resolve({
            [key]: { status: 'up', message: 'Mocked Memory' }
        })),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(SentryHealthIndicator)
            .useValue(mockSentryIndicator)
            .overrideProvider(MemoryHealthIndicator)
            .useValue(mockMemoryIndicator)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/health (GET) - should return 200 OK and status "ok"', async () => {
        const response = await request(app.getHttpServer())
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('info');
        expect(response.body).toHaveProperty('details');
        expect(response.body.info).toHaveProperty('database');
        expect(response.body.info.database.status).toBe('up');
    });
});
