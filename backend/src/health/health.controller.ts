import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { SentryHealthIndicator } from './sentry.health';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: PrismaHealthIndicator,
        private memory: MemoryHealthIndicator,
        private sentry: SentryHealthIndicator,
        // private disk: DiskHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.isHealthy('database'),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB
            () => this.sentry.isHealthy('sentry'),
        ]);
    }
}
