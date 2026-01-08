import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TicketsService } from './tickets.service';
import { DeliveryService } from './delivery.service';
import { ReturnService } from './return.service';
import { CreateTicketDto, UpdateTicketDto, CloseTicketDto, CreateDeliveryDto, ReceiveDeliveryDto, CreateReturnDto, ReceiveReturnDto, CreateMultiTicketDto } from './dto';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly deliveryService: DeliveryService,
    private readonly returnService: ReturnService,
  ) { }

  @Get()
  @Throttle({ short: { limit: 60, ttl: 60000 } }) // Higher limit for polling: 60 requests per minute
  @ApiOperation({ summary: 'Get all problem tickets (filtered by user permissions)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 1000)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by ticket number, title, cassette serial number, or machine serial number' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (OPEN, IN_DELIVERY, RECEIVED, IN_PROGRESS, RESOLVED, RETURN_SHIPPED, CLOSED)' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (reportedAt, createdAt, status, priority)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc or desc (default: desc)' })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 1000) : 50;
    const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';

    return this.ticketsService.findAll(
      req.user.userType,
      req.user.pengelolaId,
      pageNum,
      limitNum,
      search,
      status && status !== 'ALL' ? status : undefined,
      priority && priority !== 'ALL' ? priority : undefined,
      sortBy,
      validSortOrder,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get ticket statistics' })
  getStatistics() {
    return this.ticketsService.getStatistics();
  }

  @Get('count/new')
  @Throttle({ short: { limit: 120, ttl: 60000 } }) // Higher limit for count endpoint: 120 requests per minute
  @ApiOperation({ summary: 'Get count of new tickets (OPEN and IN_DELIVERY) for badge notification' })
  getNewTicketsCount(@Request() req) {
    return this.ticketsService.getNewTicketsCount(req.user.userType, req.user.pengelolaId);
  }

  @Get('count/replacement')
  @Throttle({ short: { limit: 120, ttl: 60000 } }) // Higher limit for count endpoint: 120 requests per minute
  @ApiOperation({ summary: 'Get count of replacement request tickets for badge notification' })
  getReplacementRequestsCount(@Request() req) {
    return this.ticketsService.getReplacementRequestsCount(req.user.userType, req.user.pengelolaId);
  }

  @Get('pending-confirmation')
  @Throttle({ short: { limit: 60, ttl: 60000 } }) // Higher limit for polling: 60 requests per minute
  @ApiOperation({
    summary: 'Get cassettes pending confirmation (Pengelola only)',
    description: 'List cassettes with status IN_TRANSIT_TO_PENGELOLA that have return records and need confirmation from Pengelola. Shows all cassettes in transit that have not been received yet, regardless of estimated arrival date.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 1000)' })
  getPendingConfirmations(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 1000) : 50;
    return this.ticketsService.getPendingConfirmations(req.user.pengelolaId, pageNum, limitNum);
  }

  @Get('count/pending-confirmation')
  @Throttle({ short: { limit: 120, ttl: 60000 } }) // Higher limit for count endpoint: 120 requests per minute
  @ApiOperation({ summary: 'Get count of cassettes pending confirmation for badge notification' })
  getPendingConfirmationsCount(@Request() req) {
    return this.ticketsService.getPendingConfirmationsCount(req.user.pengelolaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.ticketsService.findOne(id, req.user.userType, req.user.pengelolaId);
  }

  @Post('multi-cassette')
  @AllowUserTypes(UserType.PENGELOLA, UserType.HITACHI)
  @ApiOperation({
    summary: 'Create 1 ticket with multiple cassettes (Pengelola & Hitachi)',
    description: 'Create a single ticket containing up to 30 cassettes. Each cassette will have its own detail record.'
  })
  async createMultiCassette(@Body() createDto: CreateMultiTicketDto, @Request() req) {
    try {
      return await this.ticketsService.createMultiCassetteTicket(createDto, req.user.id, req.user.userType);
    } catch (error: any) {
      // Log validation errors for debugging
      if (error.response) {
        console.error('Validation error:', error.response.data);
      }
      throw error;
    }
  }

  @Post()
  @AllowUserTypes(UserType.PENGELOLA, UserType.HITACHI)
  @ApiOperation({ summary: 'Create new problem ticket (Pengelola & Hitachi)' })
  async create(@Body() createDto: CreateTicketDto, @Request() req) {
    try {
      return await this.ticketsService.create(createDto, req.user.id, req.user.userType);
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update ticket (RC Staff only)' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.update(id, updateDto, req.user.id, req.user.userType);
  }

  @Patch(':id/approve-on-site')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve on-site repair request (Hitachi only)' })
  approveOnSiteRepair(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.ticketsService.approveOnSiteRepair(id, req.user.id, req.user.userType);
  }

  @Patch(':id/reject-on-site')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject on-site repair request (Hitachi only)' })
  rejectOnSiteRepair(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    return this.ticketsService.rejectOnSiteRepair(id, req.user.id, req.user.userType, body.reason);
  }

  @Post('delivery')
  @AllowUserTypes(UserType.PENGELOLA, UserType.HITACHI)
  @ApiOperation({
    summary: 'Create delivery form (Pengelola/Admin)',
    description: 'Pengelola creates delivery form to send cassette to RC. Admin can also create for testing.'
  })
  createDelivery(
    @Body() createDto: CreateDeliveryDto,
    @Request() req,
  ) {
    return this.deliveryService.createDelivery(createDto, req.user.id, req.user.userType);
  }

  @Post(':id/receive-delivery')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Receive cassette at RC (RC Staff only)',
    description: 'Confirm receipt of cassette at Repair Center and create repair ticket'
  })
  receiveDelivery(
    @Param('id') id: string,
    @Body() receiveDto: ReceiveDeliveryDto,
    @Request() req,
  ) {
    return this.deliveryService.receiveDelivery(id, receiveDto, req.user.id, req.user.userType);
  }

  @Post('return')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Confirm pickup by Pengelola (RC Staff only)',
    description: 'RC staff confirms that Pengelola has picked up the repaired cassette at RC. Cassette status will be immediately updated to OK.'
  })
  createReturn(
    @Body() createDto: CreateReturnDto,
    @Request() req,
  ) {
    return this.returnService.createReturn(createDto, req.user.id, req.user.userType);
  }

  @Post(':id/receive-return')
  @AllowUserTypes(UserType.PENGELOLA)
  @ApiOperation({
    summary: 'Receive cassette return (Pengelola only)',
    description: 'Pengelola confirms receipt of repaired cassette from RC'
  })
  receiveReturn(
    @Param('id') id: string,
    @Body() receiveDto: ReceiveReturnDto,
    @Request() req,
  ) {
    return this.returnService.receiveReturn(id, receiveDto, req.user.id, req.user.userType);
  }

  @Post(':id/close')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Close ticket with resolution notes (RC Staff only)' })
  close(
    @Param('id') id: string,
    @Body() closeDto: CloseTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.close(id, closeDto.resolutionNotes, req.user.id, req.user.userType);
  }

  @Delete(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('RC_STAFF', 'RC_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Soft delete ticket (Hitachi only)',
    description: 'Soft delete ticket and restore cassette status to OK. Only Hitachi users (RC Staff, RC Manager, Super Admin) can delete tickets.'
  })
  softDelete(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.ticketsService.softDelete(id, req.user.id, req.user.userType);
  }
}

