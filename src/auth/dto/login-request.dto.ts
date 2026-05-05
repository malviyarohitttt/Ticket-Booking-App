import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@example.com | manager@gmail.com' })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({ example: 'Password123@#' })
  @IsString()
  @IsNotEmpty()
  readonly password!: string;
}
