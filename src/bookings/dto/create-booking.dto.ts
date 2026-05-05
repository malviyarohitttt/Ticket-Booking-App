import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @ApiProperty()
  readonly eventId!: number;

  @IsNotEmpty()
  @ApiProperty()
  readonly ticketQuantity!: number;
}
