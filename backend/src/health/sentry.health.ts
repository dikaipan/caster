import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryHealthIndicator extends HealthIndicator {
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const isInitialized = !!Sentry.getClient();

        if (isInitialized) {
            return {
                [key]: {
                    status: 'up',
                    message: 'Sentry SDK is initialized and capturing events',
                },
            };
        }

        throw new HealthCheckError('Sentry check failed', {
            [key]: {
                status: 'down',
                message: 'Sentry SDK is not initialized',
            },
        });
    }
}
