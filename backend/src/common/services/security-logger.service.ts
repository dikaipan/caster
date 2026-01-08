import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class SecurityLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) { }

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(
    event: string,
    details: {
      userId?: string;
      username?: string;
      ip?: string;
      userAgent?: string;
      action?: string;
      resource?: string;
      status?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
      reason?: string;
    },
  ) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      ...details,
    };

    // Log to Winston with proper structure - writes to logs/combined-*.log and logs/error-*.log
    this.logger.warn(`[SECURITY] ${event}`, { context: 'SecurityLogger', ...logEntry });
  }

  logLoginAttempt(username: string, ip: string, status: 'SUCCESS' | 'FAILED', reason?: string) {
    this.logSecurityEvent('LOGIN_ATTEMPT', {
      username,
      ip,
      action: 'LOGIN',
      status,
      reason,
    });
  }

  logUnauthorizedAccess(userId: string, resource: string, ip: string) {
    this.logSecurityEvent('UNAUTHORIZED_ACCESS', {
      userId,
      resource,
      ip,
      status: 'BLOCKED',
      reason: 'Insufficient permissions',
    });
  }

  logPasswordChange(userId: string, username: string, ip: string) {
    this.logSecurityEvent('PASSWORD_CHANGE', {
      userId,
      username,
      ip,
      action: 'PASSWORD_CHANGE',
      status: 'SUCCESS',
    });
  }

  logSensitiveOperation(userId: string, action: string, resource: string, ip: string) {
    this.logSecurityEvent('SENSITIVE_OPERATION', {
      userId,
      action,
      resource,
      ip,
      status: 'SUCCESS',
    });
  }
}

