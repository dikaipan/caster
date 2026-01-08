import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto';

/**
 * Audit Log Queue Service
 * 
 * Implements batching mechanism to reduce database load:
 * - Collects audit logs in memory buffer
 * - Flushes to database in batches (every N seconds or when buffer is full)
 * - Non-blocking: Main operations don't wait for audit log writes
 */
@Injectable()
export class AuditLogQueueService {
    private readonly logger = new Logger(AuditLogQueueService.name);
    
    // Configuration
    private readonly BATCH_SIZE = 50; // Flush when buffer reaches this size
    private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds
    
    // In-memory buffer
    private buffer: CreateAuditLogDto[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private isFlushing = false;

    constructor(private prisma: PrismaService) {
        // Start periodic flush timer
        this.startFlushTimer();
    }

    /**
     * Add audit log to queue (non-blocking)
     */
    async queue(dto: CreateAuditLogDto): Promise<void> {
        this.buffer.push(dto);

        // Flush if buffer is full
        if (this.buffer.length >= this.BATCH_SIZE) {
            this.flush().catch((error) => {
                this.logger.error(`Failed to flush audit log buffer: ${error.message}`);
            });
        }
    }

    /**
     * Start periodic flush timer
     */
    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0 && !this.isFlushing) {
                this.flush().catch((error) => {
                    this.logger.error(`Failed to flush audit log buffer: ${error.message}`);
                });
            }
        }, this.FLUSH_INTERVAL_MS);
    }

    /**
     * Flush buffer to database
     */
    private async flush(): Promise<void> {
        if (this.isFlushing || this.buffer.length === 0) {
            return;
        }

        this.isFlushing = true;
        const batch = this.buffer.splice(0, this.BATCH_SIZE); // Remove from buffer

        try {
            // Batch insert using Prisma createMany
            await this.prisma.auditLog.createMany({
                data: batch.map((dto) => ({
                    entityType: dto.entityType,
                    entityId: dto.entityId,
                    action: dto.action,
                    userId: dto.userId,
                    userType: dto.userType,
                    oldValue: dto.oldValue ? JSON.stringify(dto.oldValue) : null,
                    newValue: dto.newValue ? JSON.stringify(dto.newValue) : null,
                    changes: dto.changes ? JSON.stringify(dto.changes) : null,
                    ipAddress: dto.ipAddress,
                    userAgent: dto.userAgent,
                    metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
                })),
                skipDuplicates: true, // Skip duplicates if any
            });

            this.logger.debug(`Flushed ${batch.length} audit logs to database`);
        } catch (error: any) {
            // Log error but don't throw - audit logging should not break operations
            this.logger.error(`Failed to flush audit log batch: ${error.message}`, error.stack);
            
            // Optionally: Could add retry logic here or write to file as backup
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Force flush remaining logs (useful for graceful shutdown)
     */
    async forceFlush(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        while (this.buffer.length > 0) {
            await this.flush();
        }
    }

    /**
     * Get current buffer size (for monitoring)
     */
    getBufferSize(): number {
        return this.buffer.length;
    }
}

