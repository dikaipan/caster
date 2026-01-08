import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogQueueService } from './audit-log-queue.service';
import { AuditLogCleanupService } from './audit-log-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuditLogController],
    providers: [
        AuditLogQueueService, // Queue service for batching - must be before AuditLogService
        AuditLogCleanupService, // Cleanup service for retention policy
        AuditLogService, // Service will inject queue service if available
    ],
    exports: [AuditLogService, AuditLogQueueService, AuditLogCleanupService], // Export so other modules can use them
})
export class AuditModule { }
