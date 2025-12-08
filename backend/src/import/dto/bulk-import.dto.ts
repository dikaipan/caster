import { IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BankDataDto {
  @ApiProperty({ example: 'BNI001' })
  bankCode: string;

  @ApiProperty({ example: 'PT Bank Negara Indonesia' })
  bankName: string;

  @ApiPropertyOptional({ example: 'BNI-JKT-001' })
  branchCode?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  province?: string;

  @ApiPropertyOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  notes?: string;
}

class CassetteDataDto {
  @ApiProperty({ example: 'RB-BNI-0001' })
  serialNumber: string;

  @ApiProperty({ example: 'RB', enum: ['RB', 'AB', 'URJB'] })
  cassetteTypeCode: string;

  @ApiProperty({ example: 'BNI001' })
  customerBankCode: string;

  @ApiPropertyOptional({ example: 'OK', enum: ['OK', 'BAD', 'IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED'] })
  status?: string;

  @ApiPropertyOptional()
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

