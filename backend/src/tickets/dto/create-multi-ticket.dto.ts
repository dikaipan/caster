import { IsString, IsNotEmpty, IsOptional, IsArray, IsDateString, ValidateNested, ArrayMinSize, ArrayMaxSize, IsBoolean, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CassetteDetailDto } from './cassette-detail.dto';

export class CreateMultiTicketDto {
  @ApiProperty({ 
    type: [CassetteDetailDto],
    description: 'Array of cassettes with their individual details (min: 1, max: 30 cassettes per ticket)' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CassetteDetailDto)
  @ArrayMinSize(1, { message: 'At least 1 cassette is required' })
  @ArrayMaxSize(30, { message: 'Maximum 30 cassettes per ticket' })
  cassettes: CassetteDetailDto[];

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Optional machine ID if all cassettes are from the same machine' })
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ example: 'COURIER', enum: ['SELF_DELIVERY', 'COURIER'], description: 'Delivery method: SELF_DELIVERY or COURIER. Required if repairLocation is AT_RC or not specified.' })
  @ValidateIf((o) => o.repairLocation !== 'ON_SITE')
  @IsNotEmpty({ message: 'Delivery method is required when repair location is AT_RC' })
  @ValidateIf((o) => o.repairLocation !== 'ON_SITE')
  @IsString({ message: 'deliveryMethod must be a string' })
  @ValidateIf((o) => o.repairLocation !== 'ON_SITE')
  @IsIn(['SELF_DELIVERY', 'COURIER'], { message: 'Delivery method must be either SELF_DELIVERY or COURIER' })
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: 'JNE', description: 'Courier service name (required if deliveryMethod is COURIER)' })
  @IsString()
  @IsOptional()
  courierService?: string;

  @ApiPropertyOptional({ example: 'JNE123456789', description: 'Tracking number / AWB (required if deliveryMethod is COURIER)' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-15T10:00:00Z', 
    description: 'Shipped date in ISO 8601 format (required if deliveryMethod is COURIER)' 
  })
  @IsDateString({}, { message: 'shippedDate must be a valid ISO 8601 date string' })
  @IsOptional()
  shippedDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-17T10:00:00Z', 
    description: 'Estimated arrival date in ISO 8601 format' 
  })
  @IsDateString({}, { message: 'estimatedArrival must be a valid ISO 8601 date string' })
  @IsOptional()
  estimatedArrival?: string;

  @ApiPropertyOptional({ example: true, description: 'Use office address from Pengelola profile' })
  @IsBoolean()
  @IsOptional()
  useOfficeAddress?: boolean;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 123', description: 'Sender address (required if not using office address)' })
  @IsString()
  @IsOptional()
  senderAddress?: string;

  @ApiPropertyOptional({ example: 'Jakarta', description: 'Sender city' })
  @IsString()
  @IsOptional()
  senderCity?: string;

  @ApiPropertyOptional({ example: 'DKI Jakarta', description: 'Sender province' })
  @IsString()
  @IsOptional()
  senderProvince?: string;

  @ApiPropertyOptional({ example: '10220', description: 'Sender postal code' })
  @IsString()
  @IsOptional()
  senderPostalCode?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Contact person name for delivery' })
  @IsString()
  @IsOptional()
  senderContactName?: string;

  @ApiPropertyOptional({ example: '081234567890', description: 'Contact person phone for delivery' })
  @IsString()
  @IsOptional()
  senderContactPhone?: string;

  @ApiPropertyOptional({ example: true, description: 'Request cassette replacement (cassette is unserviceable)' })
  @IsBoolean()
  @IsOptional()
  requestReplacement?: boolean;

  @ApiPropertyOptional({ example: 'Kaset rusak fisik parah, komponen utama tidak dapat diperbaiki', description: 'Reason why cassette is unserviceable and needs replacement (required if requestReplacement is true)' })
  @IsString()
  @IsOptional()
  replacementReason?: string;

  @ApiPropertyOptional({ 
    example: 'ON_SITE', 
    enum: ['ON_SITE', 'AT_RC'], 
    description: 'Repair location: ON_SITE (repair at pengelola location) or AT_RC (repair at Repair Center). Default: AT_RC. If ON_SITE, deliveryMethod is not required.' 
  })
  @IsString()
  @IsOptional()
  @IsIn(['ON_SITE', 'AT_RC'], { message: 'repairLocation must be either ON_SITE or AT_RC' })
  repairLocation?: 'ON_SITE' | 'AT_RC';
}

