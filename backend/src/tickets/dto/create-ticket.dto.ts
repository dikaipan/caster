import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsDateString, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProblemTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateTicketDto {
  @ApiProperty({ example: 'RB-BNI-0001', description: 'Serial Number of the cassette (can be scanned via barcode)' })
  @IsString()
  @IsNotEmpty()
  cassetteSerialNumber: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Optional machine ID if known' })
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiProperty({ example: 'Machine not accepting bills' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Customer reported that machine shows error E101 and refuses to accept bills' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: ProblemTicketPriority, default: 'MEDIUM' })
  @IsEnum(ProblemTicketPriority)
  @IsOptional()
  priority?: ProblemTicketPriority;

  @ApiPropertyOptional({ 
    type: [String],
    example: ['Cassette RB-1', 'Sensor Unit'],
    description: 'List of affected components'
  })
  @IsArray()
  @IsOptional()
  affectedComponents?: any;

  @ApiPropertyOptional({ example: 'WS-BNI-JKT-001', description: 'Optional WSID of the machine at time of reporting' })
  @IsString()
  @IsOptional()
  wsid?: string;

  @ApiPropertyOptional({ example: 'E101', description: 'Optional error code displayed on machine' })
  @IsString()
  @IsOptional()
  errorCode?: string;

  @ApiPropertyOptional({ example: 'COURIER', enum: ['SELF_DELIVERY', 'COURIER'], description: 'Delivery method: SELF_DELIVERY or COURIER. Required if repairLocation is AT_RC or not specified.' })
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
    description: 'Shipped date in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Example: 2024-01-15T10:00:00Z. Required if deliveryMethod is COURIER.' 
  })
  @IsDateString({}, { message: 'shippedDate harus berupa format ISO 8601 date string yang valid (contoh: 2024-01-15T10:00:00Z atau 2024-01-15). Format yang diterima: YYYY-MM-DDTHH:mm:ssZ atau YYYY-MM-DD' })
  @IsOptional()
  shippedDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-17T10:00:00Z', 
    description: 'Estimated arrival date in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Example: 2024-01-17T10:00:00Z. Optional.' 
  })
  @IsDateString({}, { message: 'estimatedArrival harus berupa format ISO 8601 date string yang valid jika diisi (contoh: 2024-01-17T10:00:00Z atau 2024-01-17). Format yang diterima: YYYY-MM-DDTHH:mm:ssZ atau YYYY-MM-DD. Jika tidak ingin mengisi, biarkan kosong.' })
  @IsOptional()
  estimatedArrival?: string;

  @ApiPropertyOptional({ example: true, description: 'Use office address from Pengelola profile' })
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
  @IsOptional()
  requestReplacement?: boolean;

  @ApiPropertyOptional({ example: 'Kaset rusak fisik parah, komponen utama tidak dapat diperbaiki', description: 'Reason why cassette is unserviceable and needs replacement (required if requestReplacement is true)' })
  @IsString()
  @IsOptional()
  replacementReason?: string;

  @ApiPropertyOptional({ 
    example: 'ON_SITE', 
    enum: ['ON_SITE', 'AT_RC'], 
    description: 'Repair location: ON_SITE (repair at pengelola location) or AT_RC (repair at Repair Center). Default: AT_RC' 
  })
  @IsString()
  @IsOptional()
  @IsIn(['ON_SITE', 'AT_RC'], { message: 'repairLocation must be either ON_SITE or AT_RC' })
  repairLocation?: 'ON_SITE' | 'AT_RC';
}

