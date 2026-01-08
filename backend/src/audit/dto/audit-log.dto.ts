export interface CreateAuditLogDto {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    userType: 'HITACHI' | 'PENGELOLA';
    oldValue?: any;
    newValue?: any;
    changes?: Record<string, { from: any; to: any }>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

export interface QueryAuditLogsDto {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    userType?: 'HITACHI' | 'PENGELOLA';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}
