import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class CreatePengelolaUserDto {
  @ApiProperty({ example: 'supervisor01' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'supervisor01@tag.co.id' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John Supervisor' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({ example: '+62-812-3456-7890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+62-812-3456-7890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsappNumber?: string;

  @ApiProperty({ enum: ['ADMIN', 'SUPERVISOR'], example: 'SUPERVISOR' })
  @IsEnum(['ADMIN', 'SUPERVISOR'])
  role: 'ADMIN' | 'SUPERVISOR';

  @ApiPropertyOptional({ example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  employeeId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canCreateTickets?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canCloseTickets?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canManageMachines?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['BR001', 'BR002'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedBranches?: string[];
}

