import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { CreateHitachiUserDto } from '../auth/dto/create-hitachi-user.dto';
import { UpdateHitachiUserDto } from '../auth/dto/update-hitachi-user.dto';
import { CreatePengelolaUserDto } from '../pengelola/dto/create-pengelola-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) { }

  @Get('engineers')
  @AllowUserTypes(UserType.HITACHI)
  @ApiOperation({ summary: 'Get all engineer users (RC_STAFF and RC_MANAGER)' })
  async getEngineers() {
    return this.usersService.getEngineers();
  }

  // Hitachi Users endpoints
  @Post('hitachi')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new Hitachi user' })
  async createHitachiUser(@Body() createUserDto: CreateHitachiUserDto) {
    return this.authService.createHitachiUser(createUserDto);
  }

  @Get('hitachi')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN', 'RC_MANAGER')
  @ApiOperation({ summary: 'Get all Hitachi users' })
  async getAllHitachiUsers(@Query('role') role?: string) {
    const users = await this.authService.getAllHitachiUsers();
    if (role) {
      return { data: users.filter((u: any) => u.role === role) };
    }
    return { data: users };
  }

  @Get('hitachi/:id')
  @AllowUserTypes(UserType.HITACHI)
  @ApiOperation({ summary: 'Get Hitachi user by ID' })
  async getHitachiUser(@Param('id') id: string) {
    return this.authService.getHitachiUserById(id);
  }

  @Patch('hitachi/:id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update Hitachi user' })
  async updateHitachiUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateHitachiUserDto,
  ) {
    return this.authService.updateHitachiUser(id, updateUserDto);
  }

  @Patch('hitachi/:id/password')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Change Hitachi user password' })
  async changeHitachiUserPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changeHitachiUserPassword(id, newPassword);
  }

  @Patch('hitachi/:id/deactivate')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate Hitachi user' })
  async deactivateHitachiUser(@Param('id') id: string) {
    return this.authService.deactivateHitachiUser(id);
  }

  @Patch('hitachi/:id/activate')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Activate Hitachi user' })
  async activateHitachiUser(@Param('id') id: string) {
    return this.authService.activateHitachiUser(id);
  }

  @Delete('hitachi/:id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete Hitachi user' })
  async deleteHitachiUser(@Param('id') id: string) {
    return this.authService.deleteHitachiUser(id);
  }

  // Pengelola Users endpoints
  @Post('pengelola')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN', 'RC_MANAGER')
  @ApiOperation({ summary: 'Create new Pengelola user' })
  async createPengelolaUser(@Body() createUserDto: CreatePengelolaUserDto) {
    return this.authService.createPengelolaUser(createUserDto);
  }

  @Get('pengelola/:id')
  @AllowUserTypes(UserType.HITACHI)
  @ApiOperation({ summary: 'Get Pengelola user by ID' })
  async getPengelolaUser(@Param('id') id: string) {
    return this.authService.getPengelolaUserById(id);
  }

  @Patch('pengelola/:id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN', 'RC_MANAGER')
  @ApiOperation({ summary: 'Update Pengelola user' })
  async updatePengelolaUser(
    @Param('id') id: string,
    @Body() updateUserDto: any,
  ) {
    return this.authService.updatePengelolaUser(id, updateUserDto);
  }

  @Delete('pengelola/:id')
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete Pengelola user' })
  async deletePengelolaUser(@Param('id') id: string) {
    return this.authService.deletePengelolaUser(id);
  }
}
