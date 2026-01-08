import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PengelolaService } from './pengelola.service';
import { CreatePengelolaDto, UpdatePengelolaDto, CreatePengelolaUserDto, UpdatePengelolaUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('pengelola')
@Controller('pengelola')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PengelolaController {
  constructor(private readonly pengelolaService: PengelolaService) { }

  @Get()
  @ApiOperation({ summary: 'Get all pengelola' })
  findAll() {
    return this.pengelolaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pengelola by ID' })
  findOne(@Param('id') id: string) {
    return this.pengelolaService.findOne(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get all users of a pengelola' })
  getPengelolaUsers(@Param('id') id: string) {
    return this.pengelolaService.getPengelolaUsers(id);
  }

  @Get(':id/machines')
  @ApiOperation({ summary: 'Get all machines assigned to a pengelola' })
  getPengelolaMachines(@Param('id') id: string, @Request() req) {
    return this.pengelolaService.getPengelolaMachines(id, req.user.id, req.user.userType);
  }

  @Post()
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new pengelola (Super Admin only)' })
  create(@Body() createPengelolaDto: CreatePengelolaDto, @Request() req) {
    return this.pengelolaService.create(createPengelolaDto, req.user.id, req.user.userType);
  }

  @Post(':id/users')
  @AllowUserTypes(UserType.HITACHI, UserType.PENGELOLA)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create new pengelola user (Admin only)' })
  createUser(
    @Param('id') id: string,
    @Body() createUserDto: CreatePengelolaUserDto,
    @Request() req,
  ) {
    return this.pengelolaService.createUser(id, createUserDto, req.user.id, req.user.userType);
  }

  @Patch(':id/users/:userId')
  @AllowUserTypes(UserType.HITACHI, UserType.PENGELOLA)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update pengelola user (Admin only)' })
  updateUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdatePengelolaUserDto,
    @Request() req,
  ) {
    return this.pengelolaService.updatePengelolaUser(id, userId, updateUserDto, req.user.id, req.user.userType);
  }

  @Delete(':id/users/:userId')
  @AllowUserTypes(UserType.HITACHI, UserType.PENGELOLA)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete pengelola user (Admin only)' })
  deleteUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.pengelolaService.deletePengelolaUser(id, userId, req.user.id, req.user.userType);
  }

  @Patch(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update pengelola (Super Admin only)' })
  update(@Param('id') id: string, @Body() updatePengelolaDto: UpdatePengelolaDto) {
    return this.pengelolaService.update(id, updatePengelolaDto);
  }

  @Delete(':id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete pengelola (Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.pengelolaService.remove(id);
  }
}

