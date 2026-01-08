import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('system-config')
@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@AllowUserTypes(UserType.HITACHI)
@Roles('SUPER_ADMIN', 'RC_MANAGER')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}
}

