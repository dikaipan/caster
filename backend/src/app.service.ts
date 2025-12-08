import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): any {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'CASTER - Cassette Tracking & Retrieval System',
    };
  }

  getVersion(): any {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      apiPrefix: 'api',
    };
  }
}

