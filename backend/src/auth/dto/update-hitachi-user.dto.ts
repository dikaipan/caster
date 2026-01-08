import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { HitachiUserRole, HitachiUserDepartment, OrganizationStatus } from '@prisma/client';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class UpdateHitachiUserDto {
  @ApiPropertyOptional({ example: 'rcstaff1' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'rcstaff1@hitachi.com' })
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

  @ApiPropertyOptional({ enum: HitachiUserRole })
  @IsEnum(HitachiUserRole)
  @IsOptional()
  role?: HitachiUserRole;

  @ApiPropertyOptional({ enum: HitachiUserDepartment })
  @IsEnum(HitachiUserDepartment)
  @IsOptional()
  department?: HitachiUserDepartment;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;
}

