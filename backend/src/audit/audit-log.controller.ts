import { Controller, Get, Query, UseGuards, Req, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueueService } from './audit-log-queue.service';
import { AuditLogCleanupService } from './audit-log-cleanup.service';
import { QueryAuditLogsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'RC_MANAGER')
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
        @Optional() private readonly queueService?: AuditLogQueueService,
        @Optional() private readonly cleanupService?: AuditLogCleanupService,
    ) { }

    /**
     * Query audit logs (SUPER_ADMIN and RC_MANAGER only)
     */
    @Get()
    async query(@Query() query: any, @Req() req: any) {
        // Build DTO manually to ensure types are correct
        const dto: QueryAuditLogsDto = {
            entityType: query.entityType,
            entityId: query.entityId,
            action: query.action,
            userId: query.userId,
            userType: query.userType,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 50,
        };

        try {
            return await this.auditLogService.query(dto);
        } catch (error) {
            console.error('AuditLog Error:', error);
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: `Failed to query audit logs: ${error.message}`,
                stack: error.stack
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get audit logs for a specific entity
     * Access controlled by controller-level @Roles decorator (SUPER_ADMIN, RC_MANAGER)
     */
    @Get('entity')
    async getEntityLogs(
        @Query('entityType') entityType: string,
        @Query('entityId') entityId: string,
        @Query('limit') limit?: number,
        @Req() req?: any
    ) {
        return this.auditLogService.getEntityLogs(entityType, entityId, limit ? parseInt(limit as any) : 20);
    }

    /**
     * Get audit log queue statistics (if queue is enabled)
     */
    @Get('queue/stats')
    async getQueueStats() {
        if (!this.queueService) {
            throw new HttpException('Queue service is not available', HttpStatus.NOT_FOUND);
        }

        return {
            bufferSize: this.queueService.getBufferSize(),
            queueEnabled: true,
        };
    }

    /**
     * Get audit log statistics including cleanup info
     */
    @Get('stats')
    async getStatistics() {
        if (!this.cleanupService) {
            throw new HttpException('Cleanup service is not available', HttpStatus.NOT_FOUND);
        }

        return await this.cleanupService.getStatistics();
    }
}
