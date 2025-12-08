import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiPropertyOptional({ description: 'Catatan saat pickup dikonfirmasi' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tanda tangan digital dalam format base64 (data:image/png;base64,...) - DEPRECATED: use rcSignature or pengelolaSignature' })
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiPropertyOptional({ description: 'Tanda tangan RC staff dalam format base64 (data:image/png;base64,...)' })
  @IsString()
  @IsOptional()
  rcSignature?: string;

  @ApiPropertyOptional({ description: 'Tanda tangan Pengelola dalam format base64 (data:image/png;base64,...)' })
  @IsString()
  @IsOptional()
  pengelolaSignature?: string;
}

