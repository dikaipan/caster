// Import polyfills FIRST before any other imports
import '../polyfills';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BanksModule } from './banks/banks.module';
import { BankCustomersModule } from './bank-customers/bank-customers.module';
import { PengelolaModule } from './pengelola/pengelola.module';
import { MachinesModule } from './machines/machines.module';
import { CassettesModule } from './cassettes/cassettes.module';
import { RepairsModule } from './repairs/repairs.module';
import { TicketsModule } from './tickets/tickets.module';
import { PreventiveMaintenanceModule } from './preventive-maintenance/preventive-maintenance.module';
import { ImportModule } from './import/import.module';
import { DataManagementModule } from './data-management/data-management.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WarrantyModule } from './warranty/warranty.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Scheduled Tasks
    ScheduleModule.forRoot(),
    // Security: Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 30, // 30 requests per minute (increased to accommodate polling)
      },
      {
        name: 'medium',
        ttl: 600000, // 10 minutes
        limit: 200, // 200 requests per 10 minutes
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    PrismaModule,
    AuthModule,
    BanksModule,
    BankCustomersModule,
    PengelolaModule,
    MachinesModule,
    CassettesModule,
    RepairsModule,
    TicketsModule,
    PreventiveMaintenanceModule,
    ImportModule,
    DataManagementModule,
    UsersModule,
    AnalyticsModule,
    WarrantyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Security: Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

