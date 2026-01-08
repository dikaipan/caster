import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkAssignMachinesDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Pengelola ID to assign machines to',
  })
  @IsString()
  @IsNotEmpty()
  pengelolaId: string;

  @ApiProperty({
    example: ['machine-id-1', 'machine-id-2', 'machine-id-3'],
    description: 'Array of machine IDs to assign',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  machineIds: string[];
}

export class DistributeMachinesDto {
  @ApiProperty({
    example: ['pengelola-id-1', 'pengelola-id-2', 'pengelola-id-3'],
    description: 'Array of pengelola IDs to distribute machines to',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  pengelolaIds: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Optional: Filter by customer bank ID. If not provided, distributes all machines.',
  })
  @IsString()
  @IsOptional()
  customerBankId?: string;
}

export class UnassignMachinesDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Optional: Unassign machines from specific pengelola. If not provided, unassigns all machines.',
  })
  @IsString()
  @IsOptional()
  pengelolaId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Optional: Unassign machines from specific bank. If not provided, unassigns from all banks.',
  })
  @IsString()
  @IsOptional()
  customerBankId?: string;

  @ApiPropertyOptional({
    example: ['machine-id-1', 'machine-id-2'],
    description: 'Optional: Unassign specific machines by IDs. If not provided, unassigns based on pengelolaId or customerBankId.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  machineIds?: string[];
}

