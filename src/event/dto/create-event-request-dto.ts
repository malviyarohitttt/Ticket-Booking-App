import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Length,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventRequestDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @ApiProperty()
  readonly title!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  @ApiProperty()
  readonly description!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  @ApiProperty()
  readonly performer!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  @ApiProperty()
  readonly country!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  @ApiProperty()
  readonly city!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @ApiProperty()
  readonly venue!: string;

  @IsNotEmpty()
  @IsDate()
  @ApiProperty()
  readonly date!: Date;

  @IsNotEmpty()
  @IsDate()
  @ApiProperty()
  readonly time!: Date;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @ApiProperty()
  readonly totalSeats!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(100)
  @ApiProperty()
  readonly ageLimit!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @ApiProperty()
  readonly ticketPrice!: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Min(1)
  readonly totalRows!: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Min(1)
  readonly seatsPerRows!: number;
}
