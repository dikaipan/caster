import { Module } from '@nestjs/common';
import { RepairsController } from './repairs.controller';
import { RepairsService } from './repairs.service';
import { WarrantyModule } from '../warranty/warranty.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [WarrantyModule, TicketsModule, AuditModule],
  controllers: [RepairsController],
  providers: [RepairsService],
  exports: [RepairsService],
})
export class RepairsModule {}

