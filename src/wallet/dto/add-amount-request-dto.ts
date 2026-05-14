import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAmountRequestDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @ApiProperty({ example: 0, description: 'Amount or value' })
  readonly amount!: number;
}
