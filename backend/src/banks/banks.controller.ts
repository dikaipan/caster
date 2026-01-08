import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto, UpdateBankDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('banks')
@Controller('banks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BanksController {
  constructor(private readonly banksService: BanksService) { }

  @Get()
  @ApiOperation({ summary: 'Get all banks' })
  async findAll() {
    const banks = await this.banksService.findAll();
    return { data: banks };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank by ID' })
  findOne(@Param('id') id: string) {
    return this.banksService.findOne(id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get bank statistics' })
  getStatistics(@Param('id') id: string) {
    return this.banksService.getStatistics(id);
  }

  @Post()
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new bank (Super Admin only)' })
  create(@Body() createBankDto: CreateBankDto) {
    return this.banksService.create(createBankDto);
  }

  @Patch(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update bank (Super Admin only)' })
  update(@Param('id') id: string, @Body() updateBankDto: UpdateBankDto) {
    return this.banksService.update(id, updateBankDto);
  }

  @Delete(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete bank (Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.banksService.remove(id);
  }

  @Post(':id/assign-pengelola')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign Pengelola to bank (Super Admin only)' })
  assignPengelolaToBank(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.banksService.assignPengelolaToBank(id, body.pengelolaId, body);
  }
}

