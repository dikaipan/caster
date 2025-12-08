import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CassettesService } from './cassettes.service';
import { CreateCassetteDto, MarkBrokenDto, ReplaceCassetteDto } from './dto';
import { UpdateCassetteDto } from './dto/update-cassette.dto';
import { CheckAvailabilityBatchDto } from './dto/check-availability-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('cassettes')
@Controller('cassettes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CassettesController {
  constructor(private readonly cassettesService: CassettesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cassettes (filtered by user permissions)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 1000)' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Search by cassette serial number' })
  @ApiQuery({ name: 'serial_number', required: false, description: 'Search by cassette serial number (alias for keyword)' })
  @ApiQuery({ name: 'sn_mesin', required: false, description: 'Search cassettes by machine serial number (partial match)' })
  @ApiQuery({ name: 'sn_mesin_suffix', required: false, description: 'Search cassettes by machine serial number suffix (last N digits)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (OK, BAD, IN_TRANSIT_TO_RC, IN_REPAIR, READY_FOR_PICKUP, IN_TRANSIT_TO_PENGELOLA, SCRAPPED)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (serialNumber, createdAt, status, etc.)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc or desc (default: desc)' })
  @ApiQuery({ name: 'customerBankId', required: false, description: 'Filter by customer bank ID' })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('serial_number') serialNumber?: string,
    @Query('sn_mesin') snMesin?: string,
    @Query('sn_mesin_suffix') snMesinSuffix?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('customerBankId') customerBankId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 1000) : 50; // Default 50, max 1000 to prevent memory issues
    
    // serial_number is an alias for keyword (backward compatibility)
    const searchKeyword = keyword || serialNumber;
    
    // Validate sortOrder
    const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';
    
    return this.cassettesService.findAll(
      req.user.userType,
      req.user.pengelolaId,
      pageNum,
      limitNum,
      searchKeyword,
      snMesin,
      snMesinSuffix,
      status && status !== 'all' ? status : undefined,
      sortBy,
      validSortOrder,
      customerBankId,
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all cassette types' })
  getCassetteTypes() {
    return this.cassettesService.getCassetteTypes();
  }

  @Get('statistics/:bankId')
  @ApiOperation({ summary: 'Get cassette statistics for a bank' })
  getStatistics(@Param('bankId') bankId: string) {
    return this.cassettesService.getStatisticsByBank(bankId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search cassette by serial number' })
  @ApiQuery({ name: 'serialNumber', required: true, description: 'Cassette serial number' })
  @ApiQuery({ name: 'customerBankId', required: false, description: 'Filter by customer bank ID' })
  searchBySerialNumber(
    @Request() req,
    @Query('serialNumber') serialNumber: string,
    @Query('customerBankId') customerBankId?: string,
    @Query('status') status?: string,
  ) {
    return this.cassettesService.findBySerialNumber(serialNumber, req.user.userType, req.user.pengelolaId, customerBankId, status);
  }

  @Get('search-by-machine-sn')
  @ApiOperation({ 
    summary: 'Search cassettes by machine serial number',
    description: 'Search cassettes by machine serial number (last 6 digits). Returns all cassettes from the same bank as the machine.'
  })
  @ApiQuery({ name: 'machineSN', required: true, description: 'Machine serial number (last 6 digits or full)' })
  @ApiQuery({ name: 'customerBankId', required: false, description: 'Filter by customer bank ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by cassette status (e.g., SCRAPPED)' })
  searchByMachineSN(
    @Request() req,
    @Query('machineSN') machineSN: string,
    @Query('customerBankId') customerBankId?: string,
    @Query('status') status?: string,
  ) {
    return this.cassettesService.findByMachineSN(machineSN, req.user.userType, req.user.pengelolaId, customerBankId, status);
  }

  @Get('by-machine/:machineId')
  @ApiOperation({ 
    summary: 'Get cassettes for a specific machine',
    description: 'Returns only the cassettes that are assigned to this specific machine (typically 10 cassettes: 5 MAIN + 5 BACKUP)'
  })
  findByMachine(@Param('machineId') machineId: string, @Request() req) {
    return this.cassettesService.findByMachine(machineId, req.user.userType, req.user.pengelolaId);
  }

  @Post('check-availability-batch')
  @ApiOperation({ 
    summary: 'Check availability for multiple cassettes at once',
    description: 'Batch endpoint to check availability for multiple cassettes. Reduces number of requests and prevents rate limiting.'
  })
  checkAvailabilityBatch(@Body() dto: CheckAvailabilityBatchDto) {
    return this.cassettesService.checkCassetteAvailabilityBatch(dto.cassetteIds);
  }

  @Get(':id/check-availability')
  @ApiOperation({ summary: 'Check if cassette is available for new service order' })
  checkAvailability(@Param('id') id: string) {
    return this.cassettesService.checkCassetteAvailability(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cassette by ID' })
  findOne(@Param('id') id: string) {
    return this.cassettesService.findOne(id);
  }

  @Post()
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new cassette (Super Admin only)' })
  create(@Body() createCassetteDto: CreateCassetteDto) {
    return this.cassettesService.create(createCassetteDto);
  }

  @Patch(':id/mark-broken')
  @AllowUserTypes(UserType.PENGELOLA)
  @ApiOperation({ summary: 'Mark installed cassette as broken' })
  markAsBroken(
    @Param('id') id: string,
    @Body() markBrokenDto: MarkBrokenDto,
    @Request() req,
  ) {
    return this.cassettesService.markAsBroken(id, markBrokenDto.reason, req.user.id);
  }

  @Post('replace')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ 
    summary: 'Replace cassette with new serial number',
    description: 'Mark old cassette as SCRAPPED and create new cassette with new serial number. Auto-fills type, bank, machine, and usageType from old cassette.'
  })
  replaceCassette(
    @Body() replaceDto: ReplaceCassetteDto,
    @Request() req,
  ) {
    return this.cassettesService.replaceCassette(replaceDto, req.user.id);
  }

  @Patch(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update cassette (Super Admin only)' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCassetteDto,
    @Request() req,
  ) {
    return this.cassettesService.update(id, updateDto);
  }

  @Delete(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete cassette (Super Admin only). Cassette must be SCRAPPED and have no active tickets.' })
  delete(@Param('id') id: string, @Request() req) {
    return this.cassettesService.delete(id, req.user.id, req.user.role);
  }
}

