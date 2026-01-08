import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsEnum, MinLength, IsUUID } from 'class-validator';
import { BankUserRole } from '@prisma/client';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class CreateBankUserDto {
  @ApiProperty({ example: 'bankuser1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'bankuser1@bank.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    example: 'SecurePass123!',
    description: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+6281234567890', required: false })
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ example: 'uuid-of-customer-bank' })
  @IsUUID()
  @IsNotEmpty()
  customerBankId: string;

  @ApiProperty({ enum: BankUserRole, default: 'VIEWER' })
  @IsEnum(BankUserRole)
  role: BankUserRole;
}

