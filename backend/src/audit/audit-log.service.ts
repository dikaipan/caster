import { Injectable, Logger, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto, QueryAuditLogsDto } from './dto';
import { AuditLogQueueService } from './audit-log-queue.service';

@Injectable()
export class AuditLogService implements OnModuleDestroy {
    private readonly logger = new Logger(AuditLogService.name);
    private readonly useQueue: boolean;

    constructor(
        private prisma: PrismaService,
        @Optional() private queueService?: AuditLogQueueService,
    ) {
        // Use queue if available, otherwise fallback to direct write
        // Queue mode is enabled by default if queue service is available
        // Disable via environment variable: AUDIT_LOG_USE_QUEUE=false
        this.useQueue = process.env.AUDIT_LOG_USE_QUEUE !== 'false' && !!this.queueService;
        
        if (this.useQueue) {
            this.logger.log('✅ Audit log queue mode enabled - logs will be batched (reduces database load)');
        } else {
            this.logger.log('⚠️ Audit log direct write mode - logs written immediately');
        }
    }

    /**
     * Create an audit log entry
     * Uses queue service if enabled, otherwise writes directly
     */
    async log(dto: CreateAuditLogDto): Promise<void> {
        // Use queue service if enabled
        if (this.useQueue && this.queueService) {
            try {
                await this.queueService.queue(dto);
                return; // Queue handles batching asynchronously
            } catch (error: any) {
                // Fallback to direct write if queue fails
                this.logger.warn(`Queue failed, falling back to direct write: ${error.message}`);
                // Continue to direct write below
            }
        }

        // Direct write (fallback or when queue disabled)
        try {
            await this.prisma.auditLog.create({
                data: {
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
                },
            });
        } catch (error: any) {
            // Log error but don't throw - audit logging should not break main operations
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
        }
    }

    /**
     * Flush queue on module destroy (graceful shutdown)
     */
    async onModuleDestroy() {
        if (this.useQueue && this.queueService) {
            this.logger.log('Flushing audit log queue before shutdown...');
            try {
                await this.queueService.forceFlush();
                this.logger.log('Audit log queue flushed successfully');
            } catch (error: any) {
                this.logger.error(`Failed to flush audit log queue: ${error.message}`);
            }
        }
    }

    /**
     * Log ticket status change
     */
    async logTicketStatusChange(
        ticketId: string,
        oldStatus: string,
        newStatus: string,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            entityType: 'TICKET',
            entityId: ticketId,
            action: 'STATUS_CHANGE',
            userId,
            userType,
            oldValue: { status: oldStatus },
            newValue: { status: newStatus },
            changes: { status: { from: oldStatus, to: newStatus } },
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log cassette status change
     */
    async logCassetteStatusChange(
        cassetteId: string,
        oldStatus: string,
        newStatus: string,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            entityType: 'CASSETTE',
            entityId: cassetteId,
            action: 'STATUS_CHANGE',
            userId,
            userType,
            oldValue: { status: oldStatus },
            newValue: { status: newStatus },
            changes: { status: { from: oldStatus, to: newStatus } },
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log pickup confirmation
     */
    async logPickupConfirmation(
        ticketId: string,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            entityType: 'TICKET',
            entityId: ticketId,
            action: 'PICKUP_CONFIRMED',
            userId,
            userType,
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log entity creation
     */
    async logCreate(
        entityType: string,
        entityId: string,
        data: any,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            entityType,
            entityId,
            action: 'CREATE',
            userId,
            userType,
            newValue: data,
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log entity update
     */
    async logUpdate(
        entityType: string,
        entityId: string,
        oldData: any,
        newData: any,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        // Calculate changes
        const changes: Record<string, { from: any; to: any }> = {};
        for (const key in newData) {
            if (oldData[key] !== newData[key]) {
                changes[key] = { from: oldData[key], to: newData[key] };
            }
        }

        await this.log({
            entityType,
            entityId,
            action: 'UPDATE',
            userId,
            userType,
            oldValue: oldData,
            newValue: newData,
            changes,
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log entity deletion
     */
    async logDelete(
        entityType: string,
        entityId: string,
        data: any,
        userId: string,
        userType: 'HITACHI' | 'PENGELOLA',
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            entityType,
            entityId,
            action: 'DELETE',
            userId,
            userType,
            oldValue: data,
            metadata,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Query audit logs
     */
    async query(dto: QueryAuditLogsDto) {
        const page = dto.page || 1;
        const limit = dto.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (dto.entityType) where.entityType = dto.entityType;
        if (dto.entityId) where.entityId = dto.entityId;
        if (dto.action) where.action = dto.action;
        if (dto.userId) where.userId = dto.userId;
        if (dto.userType) where.userType = dto.userType;

        if (dto.startDate || dto.endDate) {
            where.createdAt = {};
            if (dto.startDate) where.createdAt.gte = dto.startDate;
            if (dto.endDate) where.createdAt.lte = dto.endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        // Parse JSON fields safely
        const safeParse = (jsonString: string | null) => {
            if (!jsonString) return null;
            try {
                return JSON.parse(jsonString);
            } catch (e) {
                this.logger.warn(`Failed to parse JSON: ${jsonString}`);
                return null;
            }
        };

        const parsedLogs = logs.map(log => ({
            ...log,
            oldValue: safeParse(log.oldValue),
            newValue: safeParse(log.newValue),
            changes: safeParse(log.changes),
            metadata: safeParse(log.metadata),
        }));

        return {
            logs: parsedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get audit logs for a specific entity
     */
    async getEntityLogs(entityType: string, entityId: string, limit: number = 20) {
        const logs = await this.prisma.auditLog.findMany({
            where: {
                entityType,
                entityId,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Parse JSON fields
        // Parse JSON fields safely
        const safeParse = (jsonString: string | null) => {
            if (!jsonString) return null;
            try {
                return JSON.parse(jsonString);
            } catch (e) {
                return null;
            }
        };

        return logs.map(log => ({
            ...log,
            oldValue: safeParse(log.oldValue),
            newValue: safeParse(log.newValue),
            changes: safeParse(log.changes),
            metadata: safeParse(log.metadata),
        }));
    }
}
