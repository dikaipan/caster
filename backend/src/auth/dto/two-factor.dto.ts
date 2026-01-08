import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
    @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}

export class VerifyLogin2faDto {
    @ApiProperty({ description: 'Temporary token received from login' })
    @IsString()
    @IsNotEmpty()
    tempToken: string;

    @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}
