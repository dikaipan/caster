import { Injectable, LoggerService, Scope, Logger } from '@nestjs/common';

/**
 * Structured Logger Service
 * 
 * Provides structured logging with request context support.
 * Logs are output in structured format for better parsing and monitoring.
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly logger: StructuredLoggerService) {}
 * 
 * this.logger.log('Operation completed', { userId, requestId });
 * this.logger.error('Operation failed', { error, userId, requestId });
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log informational message with optional context data
   */
  log(message: string, contextData?: Record<string, any>) {
    const logEntry = this.createLogEntry('info', message, contextData);
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Log error with optional context data
   */
  error(message: string, error?: Error | string, contextData?: Record<string, any>) {
    const logEntry = this.createLogEntry('error', message, contextData);
    
    if (error instanceof Error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (typeof error === 'string') {
      logEntry.error = { message: error };
    }

    console.error(JSON.stringify(logEntry));
  }

  /**
   * Log warning with optional context data
   */
  warn(message: string, contextData?: Record<string, any>) {
    const logEntry = this.createLogEntry('warn', message, contextData);
    console.warn(JSON.stringify(logEntry));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, contextData?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      const logEntry = this.createLogEntry('debug', message, contextData);
      console.debug(JSON.stringify(logEntry));
    }
  }

  /**
   * Log verbose message (only in development)
   */
  verbose(message: string, contextData?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      const logEntry = this.createLogEntry('verbose', message, contextData);
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: string,
    message: string,
    contextData?: Record<string, any>
  ): any {
    const logEntry: any = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.context) {
      logEntry.context = this.context;
    }

    if (contextData) {
      Object.assign(logEntry, contextData);
    }

    return logEntry;
  }
}

