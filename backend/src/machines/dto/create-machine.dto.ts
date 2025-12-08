import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MachineStatus {
  OPERATIONAL = 'OPERATIONAL',
  MAINTENANCE = 'MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
  UNDER_REPAIR = 'UNDER_REPAIR',
}

export class CreateMachineDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  customerBankId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  @IsNotEmpty()
  pengelolaId: string;

  @ApiProperty({ example: 'BNI-JKT-M001' })
  @IsString()
  @IsNotEmpty()
  machineCode: string;

  @ApiProperty({ example: 'SR7500VS', description: 'Machine model: SR7500 or SR7500VS' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({ example: 'HTCH-SRM100-2023-0001', description: 'Primary identifier - Serial Number from manufacturer (immutable)' })
  @IsString()
  @IsNotEmpty()
  serialNumberManufacturer: string;

  @ApiProperty({ example: 'BNI Cabang Sudirman, Jl. Jend. Sudirman Kav. 1' })
  @IsString()
  @IsNotEmpty()
  physicalLocation: string;

  @ApiPropertyOptional({ example: 'BNI-JKT-SUDIRMAN' })
  @IsString()
  @IsOptional()
  branchCode?: string;

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'DKI Jakarta' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ example: '2023-06-15' })
  @IsDateString()
  @IsOptional()
  installationDate?: string;

  @ApiPropertyOptional({ example: 'WS-BNI-JKT-001', description: 'Optional editable WSID - can be changed anytime by bank. Use Serial Number as primary identifier.' })
  @IsString()
  @IsOptional()
  currentWsid?: string;

  @ApiPropertyOptional({ enum: MachineStatus, default: 'OPERATIONAL' })
  @IsEnum(MachineStatus)
  @IsOptional()
  status?: MachineStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

