import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).id || request.headers['x-request-id'] || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors || null;
        
        // If it's a validation error with array of messages, format them nicely
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
        
        // If there are field-specific errors, include them in the message
        if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
          const errorMessages = Object.entries(errors)
            .map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${msgArray.join(', ')}`;
            })
            .join('; ');
          if (errorMessages) {
            message = `${message}. ${errorMessages}`;
          }
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Log Prisma errors with more details
      if (exception.message.includes('Unknown argument') || 
          exception.message.includes('Unknown field') ||
          exception.message.includes('Argument') && exception.message.includes('is missing')) {
        this.logger.error('Prisma Error', {
          requestId,
          message: exception.message,
          stack: exception.stack,
          name: exception.name,
          path: request.url,
          method: request.method,
        });
        message = `Database error: ${exception.message}. Please ensure Prisma client is up-to-date by running 'npx prisma generate' in the backend directory.`;
      } else {
        // Log all other errors with structured logging
        this.logger.error('Unhandled Error', {
          requestId,
          message: exception.message,
          stack: exception.stack,
          name: exception.name,
          path: request.url,
          method: request.method,
        });
      }
    }

    // Log error response for monitoring
    if (status >= 500) {
      this.logger.error(`HTTP ${status} Error Response`, {
        requestId,
        status,
        message,
        path: request.url,
        method: request.method,
      });
    } else if (status >= 400) {
      this.logger.warn(`HTTP ${status} Client Error`, {
        requestId,
        status,
        message,
        path: request.url,
        method: request.method,
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
      errors,
      requestId, // Include request ID in error response for debugging
    });
  }
}

