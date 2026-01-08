import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkBrokenDto {
  @ApiProperty({ 
    example: 'Sensor error - cassette not accepting bills',
    description: 'Reason why cassette is marked as broken'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UnmarkBrokenDto {
  @ApiProperty({ 
    example: 'False alarm - cassette is working properly',
    description: 'Optional reason for undoing mark as broken',
    required: false
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkMarkBrokenDto {
  @ApiProperty({ 
    example: ['cassette-id-1', 'cassette-id-2'],
    description: 'Array of cassette IDs to mark as broken',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  cassetteIds: string[];

  @ApiProperty({ 
    example: 'Sensor error - cassette not accepting bills',
    description: 'Reason why cassettes are marked as broken'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

