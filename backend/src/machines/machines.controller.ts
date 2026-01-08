import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto, UpdateMachineDto } from './dto';
import { BulkAssignMachinesDto, DistributeMachinesDto, UnassignMachinesDto } from './dto/bulk-assign-machines.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('machines')
@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) { }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics (all authenticated users)' })
  getDashboardStats(@Request() req) {
    const customerBankId = req.user.userType === 'BANK' ? req.user.customerBankId : undefined;
    return this.machinesService.getDashboardStats(req.user.userType, req.user.pengelolaId, customerBankId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all machines (filtered by user permissions)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Search by serial number, machine code, or branch code' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (OPERATIONAL, UNDER_REPAIR, INACTIVE)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (serialNumberManufacturer, machineCode, createdAt, status)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc or desc (default: desc)' })
  @ApiQuery({ name: 'customerBankId', required: false, description: 'Filter by customer bank ID' })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('customerBankId') customerBankId?: string,
  ) {
    const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';
    // For BANK users, use their customerBankId; for others, use the query param if provided
    const effectiveBankId = req.user.userType === 'BANK' 
      ? req.user.customerBankId 
      : customerBankId;
    
    return this.machinesService.findAll(
      req.user.userType,
      req.user.pengelolaId,
      req.user.id,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status && status !== 'ALL' ? status : undefined,
      sortBy,
      validSortOrder,
      effectiveBankId,
    );
  }

  @Post('bulk-assign')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk assign machines to pengelola (Super Admin only)' })
  bulkAssignMachines(@Body() dto: BulkAssignMachinesDto, @Request() req) {
    return this.machinesService.bulkAssignMachines(dto.pengelolaId, dto.machineIds, req.user.id);
  }

  @Post('distribute')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Distribute unassigned machines evenly to multiple pengelola (Super Admin only)',
    description: 'Distributes unassigned machines evenly across the provided pengelola. If customerBankId is provided, only distributes machines from that bank.'
  })
  distributeMachines(@Body() dto: DistributeMachinesDto, @Request() req) {
    // Convert empty string to undefined for optional field
    const customerBankId = dto.customerBankId && dto.customerBankId.trim() !== ''
      ? dto.customerBankId.trim()
      : undefined;
    return this.machinesService.distributeMachines(dto.pengelolaIds, customerBankId, req.user.id);
  }

  @Post('unassign')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Unassign machines from pengelola (Super Admin only)',
    description: 'Unassigns machines by setting pengelolaId to null. Can unassign all machines, machines from specific pengelola, machines from specific bank, or specific machines by IDs.'
  })
  unassignMachines(@Body() dto: UnassignMachinesDto, @Request() req) {
    // Convert empty strings to undefined for optional fields
    const pengelolaId = dto.pengelolaId && dto.pengelolaId.trim() !== ''
      ? dto.pengelolaId.trim()
      : undefined;
    const customerBankId = dto.customerBankId && dto.customerBankId.trim() !== ''
      ? dto.customerBankId.trim()
      : undefined;
    return this.machinesService.unassignMachines(pengelolaId, customerBankId, dto.machineIds, req.user.id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get machine statistics' })
  getMachineStatistics(@Param('id') id: string) {
    return this.machinesService.getMachineStatistics(id);
  }

  @Get(':id/cassettes')
  @ApiOperation({ summary: 'Get cassettes linked to machine' })
  getMachineCassettes(@Param('id') id: string) {
    return this.machinesService.getMachineCassettes(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.machinesService.findOne(id, req.user.userType, req.user.pengelolaId);
  }

  @Post()
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new machine (Super Admin only)' })
  create(@Body() createMachineDto: CreateMachineDto, @Request() req) {
    return this.machinesService.create(createMachineDto, req.user.id);
  }

  @Patch(':id')
  @AllowUserTypes(UserType.HITACHI)
  @ApiOperation({ summary: 'Update machine (Hitachi users only)' })
  update(@Param('id') id: string, @Body() updateMachineDto: UpdateMachineDto, @Request() req) {
    return this.machinesService.update(id, updateMachineDto, req.user.id, req.user.userType);
  }

  @Delete(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete machine (Super Admin only)' })
  delete(@Param('id') id: string, @Request() req) {
    return this.machinesService.delete(id, req.user.id, req.user.role);
  }
}
