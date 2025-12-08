// Import polyfills FIRST before any other imports
import './polyfills';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS FIRST - before other middleware to handle preflight requests
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;
  
  // Support multiple origins (comma-separated)
  const corsOrigins = corsOrigin 
    ? corsOrigin.split(',').map(origin => origin.trim()).filter(origin => origin)
    : [];
  
  const allowedOrigins = isProduction
    ? corsOrigins
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
        ...corsOrigins,
      ];
  
  // Log CORS configuration for debugging
  console.log('🔒 CORS Configuration:');
  console.log(`   NODE_ENV: ${isProduction ? 'production' : 'development'}`);
  console.log(`   CORS_ORIGIN: ${corsOrigin || 'not set'}`);
  console.log(`   Allowed Origins: ${allowedOrigins.join(', ') || 'none'}`);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Log incoming origin for debugging
      if (isProduction) {
        console.log(`🌐 CORS Request from origin: ${origin || 'no origin'}`);
      }
      
      // Allow requests with no origin (mobile apps, Postman, etc.) in development only
      if (!origin && !isProduction) {
        return callback(null, true);
      }
      
      // In production, require origin
      if (isProduction && !origin) {
        return callback(new Error('Origin is required in production'));
      }
      
      // Check if origin is allowed
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`❌ CORS blocked: ${origin} not in allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
    preflightContinue: false, // Let NestJS handle preflight
    optionsSuccessStatus: 204, // Return 204 for OPTIONS requests
  });

  // Security: Helmet for security headers (after CORS)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins], // Allow connections to CORS origins
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow for CORS
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS resources
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Increase body size limit for large file uploads (50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Fix BigInt serialization issue
  // Override JSON.stringify to handle BigInt values
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe - Security: Strict validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction, // Hide error details in production
      validationError: {
        target: false, // Don't expose target object in errors
        value: false, // Don't expose values in errors
      },
    }),
  );

  // Security: Request ID for tracking (useful for security logging)
  app.use((req: any, res: any, next: any) => {
    req.id = require('crypto').randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation - Security: Disable in production
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('CASTER API - Cassette Tracking & Retrieval System')
      .setDescription('API documentation for Cash Recycling Machine Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('banks', 'Bank customer management')
      .addTag('bank-customers', 'Bank customers CRUD operations')
      .addTag('pengelola', 'Pengelola management')
      .addTag('machines', 'Machine asset management')
      .addTag('cassettes', 'Cassette lifecycle management')
      .addTag('repairs', 'Repair center operations')
      .addTag('tickets', 'Problem ticket management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000; // Backend di port 3000
  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs\n`);
}

bootstrap();

