import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Log Cleanup Service
 * 
 * Implements retention policy to prevent unbounded growth:
 * - Archives or deletes audit logs older than retention period
 * - Runs periodically (monthly) to clean up old data
 * - Configurable retention period (default: 2 years)
 */
@Injectable()
export class AuditLogCleanupService {
    private readonly logger = new Logger(AuditLogCleanupService.name);
    
    // Retention period: 2 years (730 days)
    private readonly RETENTION_DAYS = parseInt(
        process.env.AUDIT_LOG_RETENTION_DAYS || '730',
        10
    );

    constructor(private prisma: PrismaService) {}

    /**
     * Cleanup old audit logs
     * Runs monthly on the 1st day at 3 AM (after PM and Repair Ticket cleanup)
     */
    @Cron('0 3 1 * *', {
        name: 'cleanup-old-audit-logs',
        timeZone: 'Asia/Jakarta',
    })
    async cleanupOldAuditLogs(): Promise<void> {
        this.logger.log('Starting cleanup of old audit logs...');

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

            // Count logs to be deleted
            const count = await this.prisma.auditLog.count({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
            });

            if (count === 0) {
                this.logger.log('No old audit logs found to cleanup.');
                return;
            }

            this.logger.log(
                `Found ${count} audit logs older than ${this.RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`
            );

            // Delete in batches to avoid long-running transactions
            const BATCH_SIZE = 1000;
            let deletedCount = 0;
            let hasMore = true;

            while (hasMore) {
                const result = await this.prisma.auditLog.deleteMany({
                    where: {
                        createdAt: {
                            lt: cutoffDate,
                        },
                    },
                });

                deletedCount += result.count;
                hasMore = result.count === BATCH_SIZE;

                this.logger.log(`Deleted ${result.count} audit logs (total: ${deletedCount}/${count})`);

                // Small delay between batches to avoid overwhelming the database
                if (hasMore) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            this.logger.log(
                `Successfully cleaned up ${deletedCount} audit logs older than ${this.RETENTION_DAYS} days.`
            );
        } catch (error: any) {
            this.logger.error('Error during audit log cleanup:', error);
        }
    }

    /**
     * Manual cleanup (for admin use)
     */
    async cleanupManually(retentionDays?: number): Promise<{ deletedCount: number }> {
        const days = retentionDays || this.RETENTION_DAYS;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        this.logger.log(`Manual cleanup: Deleting audit logs older than ${days} days...`);

        const result = await this.prisma.auditLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });

        this.logger.log(`Manual cleanup completed: Deleted ${result.count} audit logs.`);

        return { deletedCount: result.count };
    }

    /**
     * Get audit log statistics
     */
    async getStatistics(): Promise<{
        total: number;
        oldest: Date | null;
        newest: Date | null;
        olderThanRetention: number;
    }> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

        const [total, oldest, newest, olderThanRetention] = await Promise.all([
            this.prisma.auditLog.count(),
            this.prisma.auditLog.findFirst({
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
            }),
            this.prisma.auditLog.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            this.prisma.auditLog.count({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
            }),
        ]);

        return {
            total,
            oldest: oldest?.createdAt || null,
            newest: newest?.createdAt || null,
            olderThanRetention,
        };
    }
}

