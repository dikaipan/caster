import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CassetteStatus {
  OK = 'OK',
  BAD = 'BAD',
  IN_TRANSIT_TO_RC = 'IN_TRANSIT_TO_RC',
  IN_REPAIR = 'IN_REPAIR',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  IN_TRANSIT_TO_PENGELOLA = 'IN_TRANSIT_TO_PENGELOLA',
  SCRAPPED = 'SCRAPPED',
}

export enum CassetteUsageType {
  MAIN = 'MAIN',
  BACKUP = 'BACKUP',
}

export class CreateCassetteDto {
  @ApiProperty({ example: 'RB-BNI-0001' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  cassetteTypeId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  @IsNotEmpty()
  customerBankId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ enum: CassetteUsageType, example: 'MAIN' })
  @IsEnum(CassetteUsageType)
  @IsOptional()
  usageType?: CassetteUsageType;

  @ApiPropertyOptional({ enum: CassetteStatus, default: 'OK' })
  @IsEnum(CassetteStatus)
  @IsOptional()
  status?: CassetteStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID of cassette being replaced (for replacement tracking)' })
  @IsString()
  @IsOptional()
  replacedCassetteId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'ID of replacement ticket (for replacement tracking)' })
  @IsString()
  @IsOptional()
  replacementTicketId?: string;
}

