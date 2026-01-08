import { Controller, Post, Get, Body, Patch, Delete, Param, Query, UseGuards, Request, Res, Req, UnauthorizedException, HttpCode } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express'; // Import Response types
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateHitachiUserDto } from './dto/create-hitachi-user.dto';
import { UpdateHitachiUserDto } from './dto/update-hitachi-user.dto';
import { CreateBankUserDto } from './dto/create-bank-user.dto';
import { UpdateBankUserDto } from './dto/update-bank-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2faDto, VerifyLogin2faDto } from './dto/two-factor.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes } from '../common/decorators/roles.decorator';
import { UserType } from '../common/decorators/roles.decorator';
import { SecurityLoggerService } from '../common/services/security-logger.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private securityLogger: SecurityLoggerService,
  ) { }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in prod
      sameSite: 'lax', // Use 'lax' for better compatibility, 'strict' can be too aggressive
      path: '/api/v1/auth', // Scope to auth routes
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ short: { limit: process.env.NODE_ENV !== 'production' ? 10000 : 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'admin123' },
      },
    },
  })
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    this.securityLogger.logLoginAttempt(
      req.user?.username || 'unknown',
      req.ip || 'unknown',
      'SUCCESS',
    );

    const result = await this.authService.login(req.user) as any;

    // If 2FA is required, we don't set cookies yet, just return the temp token
    if (result.twoFactorRequired) {
      return result;
    }

    // Standard login success
    if (result.tokens && result.tokens.refresh_token) {
      this.setRefreshTokenCookie(res, result.tokens.refresh_token);
      // Remove refresh_token from response body to prevent storage in JS (except in test env)
      if (process.env.NODE_ENV !== 'production') {
        const { ...tokens } = result.tokens;
        return { ...result, tokens };
      }
      const { refresh_token, ...tokens } = result.tokens;
      return { ...result, tokens };
    }

    return result;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id, req.user.userType);
  }

  @Post('hitachi-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new Hitachi user (Super Admin only)' })
  async createHitachiUser(@Body() createUserDto: CreateHitachiUserDto) {
    return this.authService.createHitachiUser(createUserDto);
  }

  @Get('hitachi-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN', 'RC_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all Hitachi users' })
  async getAllHitachiUsers() {
    return this.authService.getAllHitachiUsers();
  }

  @Patch('hitachi-users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Hitachi user (Super Admin only)' })
  async updateHitachiUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateHitachiUserDto,
  ) {
    return this.authService.updateHitachiUser(id, updateUserDto);
  }

  @Delete('hitachi-users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete Hitachi user (Super Admin only)' })
  async deleteHitachiUser(@Param('id') id: string) {
    return this.authService.deleteHitachiUser(id);
  }

  @Post('bank-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new Bank user (Super Admin only)' })
  async createBankUser(@Body() createUserDto: CreateBankUserDto) {
    return this.authService.createBankUser(createUserDto);
  }

  @Get('bank-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all Bank users (Super Admin only)' })
  async getAllBankUsers(@Query('bankId') bankId?: string) {
    return this.authService.getAllBankUsers(bankId);
  }

  @Get('bank-users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Bank user by ID (Super Admin only)' })
  async getBankUserById(@Param('id') id: string) {
    return this.authService.getBankUserById(id);
  }

  @Patch('bank-users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Bank user (Super Admin only)' })
  async updateBankUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateBankUserDto,
  ) {
    return this.authService.updateBankUser(id, updateUserDto);
  }

  @Delete('bank-users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AllowUserTypes(UserType.HITACHI)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete Bank user (Super Admin only)' })
  async deleteBankUser(@Param('id') id: string) {
    return this.authService.deleteBankUser(id);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ short: { limit: process.env.NODE_ENV !== 'production' ? 10000 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refresh(@Req() req: ExpressRequest) {
    try {
      const refreshToken = req.cookies['refresh_token'] || req.body.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token missing');
      }

      return this.authService.refreshToken(refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('2fa/verify-login')
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  async verifyLogin2FA(@Body() dto: VerifyLogin2faDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyLogin2FA(dto.tempToken, dto.code) as any;

    // Login 2FA success
    if (result.tokens && result.tokens.refresh_token) {
      this.setRefreshTokenCookie(res, result.tokens.refresh_token);
      const { refresh_token, ...tokens } = result.tokens;
      return { ...result, tokens };
    }

    return result;
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize 2FA setup (Generate QR)' })
  async setup2FA(@Request() req) {
    return this.authService.setup2FA(req.user.id, req.user.userType);
  }

  @Post('2fa/verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  async verifySetup(@Request() req, @Body() dto: Verify2faDto) {
    return this.authService.verifySetup(req.user.id, req.user.userType, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@Request() req, @Body() dto: Verify2faDto) {
    await this.authService.verifySetup(req.user.id, req.user.userType, dto.code);
    return this.authService.disable2FA(req.user.id, req.user.userType);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ short: { limit: process.env.NODE_ENV !== 'production' ? 10000 : 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies['refresh_token'];

      // Clear cookie regardless of validity
      res.clearCookie('refresh_token', { path: '/api/v1/auth' });

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      return { message: 'Logged out successfully' };
    } catch (error) {
      // Always return success for logout, even if token is invalid
      return { message: 'Logged out successfully' };
    }
  }
}

