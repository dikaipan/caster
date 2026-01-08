import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { BankUserRole, OrganizationStatus } from '@prisma/client';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class UpdateBankUserDto {
  @ApiPropertyOptional({ example: 'bankuser1' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'bankuser1@bank.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ 
    example: 'SecurePass123!',
    description: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character. Only validated if provided.'
  })
  @IsString()
  @IsOptional()
  @IsStrongPassword()
  password?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+6281234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: BankUserRole })
  @IsEnum(BankUserRole)
  @IsOptional()
  role?: BankUserRole;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;
}

