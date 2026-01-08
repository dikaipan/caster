import { IsArray, IsObject, IsOptional, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BankDataDto {
  @ApiProperty({ example: 'BNI001' })
  @IsString()
  bankCode: string;

  @ApiProperty({ example: 'PT Bank Negara Indonesia' })
  @IsString()
  bankName: string;

  @ApiPropertyOptional({ example: 'BNI-JKT-001' })
  @IsOptional()
  @IsString()
  branchCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class CassetteDataDto {
  @ApiProperty({ example: 'RB-BNI-0001' })
  @IsString()
  serialNumber: string;

  @ApiProperty({ example: 'RB', enum: ['RB', 'AB', 'URJB'] })
  @IsString()
  cassetteTypeCode: string;

  @ApiProperty({ example: 'BNI001' })
  @IsString()
  customerBankCode: string;

  @ApiPropertyOptional({ example: 'OK', enum: ['OK', 'BAD', 'IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'PRIMARY', enum: ['PRIMARY', 'SPARE'], description: 'Usage type: PRIMARY or SPARE' })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkImportDto {
  @ApiPropertyOptional({ type: [BankDataDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankDataDto)
  banks?: BankDataDto[];

  @ApiPropertyOptional({ type: [CassetteDataDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CassetteDataDto)
  cassettes?: CassetteDataDto[];
}

