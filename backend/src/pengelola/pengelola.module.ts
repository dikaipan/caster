import { Module } from '@nestjs/common';
import { PengelolaController } from './pengelola.controller';
import { PengelolaService } from './pengelola.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PengelolaController],
  providers: [PengelolaService],
  exports: [PengelolaService],
})
export class PengelolaModule { }

