import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { DeliveryService } from './delivery.service';
import { ReturnService } from './return.service';

import { TicketStatusSyncService } from './ticket-status-sync.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TicketsController],
  providers: [TicketsService, DeliveryService, ReturnService, TicketStatusSyncService],
  exports: [TicketsService, DeliveryService, ReturnService, TicketStatusSyncService],
})
export class TicketsModule { }
