import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                [key]: {
                    status: 'up',
                },
            };
        } catch (e) {
            console.error('Prisma Health Check Failed:', e);
            return {
                [key]: {
                    status: 'down',
                    message: e.message,
                },
            };
        }
    }
}
