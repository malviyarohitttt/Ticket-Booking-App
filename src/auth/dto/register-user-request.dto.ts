import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterUserRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly firstname!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly lastname!: string;

  @ApiProperty()
  @IsEmail()
  readonly email!: string;

  @ApiProperty()
  @IsStrongPassword()
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly dialCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message:
      'The mobile number you entered is invalid, please provide a valid mobile number',
  })
  readonly mobile?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly country!: string;

  @ApiProperty()
  @IsString()
  readonly emailVerificationCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly mobileVerificationCode?: string;
}
