import { Logger } from '@nestjs/common';

/**
 * Environment Variables Validation Schema
 * 
 * Validates all required environment variables at application startup.
 * Fails fast if critical secrets are missing.
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRATION?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_REFRESH_EXPIRATION?: string;
  
  // Server
  NODE_ENV?: string;
  PORT?: string;
  
  // CORS
  CORS_ORIGIN?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logger = new Logger('EnvValidation');

  // Required variables
  const required: (keyof EnvConfig)[] = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  // Check required variables
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.match(/^(postgresql|mysql):\/\//)) {
    errors.push('DATABASE_URL must be a valid PostgreSQL or MySQL connection string');
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for production');
    }
    if (jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
  }

  // Validate JWT_REFRESH_SECRET
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (jwtRefreshSecret && jwtRefreshSecret === jwtSecret) {
    warnings.push('JWT_REFRESH_SECRET should be different from JWT_SECRET');
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
    warnings.push(`NODE_ENV should be 'development', 'production', or 'test', got: ${nodeEnv}`);
  }

  // Production-specific validations
  if (nodeEnv === 'production') {
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.trim() === '') {
      errors.push('CORS_ORIGIN is required in production');
    }
    
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }

    if (jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be changed from default in production');
    }
  }

  // Log results
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
  }

  if (warnings.length > 0) {
    logger.warn('⚠️ Environment validation warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.log('✅ Environment variables validated successfully');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validated environment configuration
 * Throws error if validation fails
 * 
 * Note: Currently not used, but kept for future utility/type-safe env access
 * 
 * @deprecated Not currently used. Use validateEnvironment() and process.env directly.
 */
export function getValidatedEnv(): EnvConfig {
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    throw new Error(
      `Environment validation failed:\n${validation.errors.join('\n')}\n\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000',
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  };
}

