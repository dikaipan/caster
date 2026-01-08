import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '15m', // Shorter access token (15 minutes)
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, SecurityLoggerService, TwoFactorAuthService],
  exports: [AuthService],
})
export class AuthModule { }
