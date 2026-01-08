import { Module } from '@nestjs/common';
import { CassettesController } from './cassettes.controller';
import { CassettesService } from './cassettes.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CassettesController],
  providers: [CassettesService],
  exports: [CassettesService],
})
export class CassettesModule {}

