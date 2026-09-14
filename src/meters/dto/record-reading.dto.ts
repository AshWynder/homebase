import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class RecordReadingDto {
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'currentReading cannot be negative' })
  @IsNotEmpty({ message: 'currentReading is required' })
  currentReading: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'readingDate must be a valid ISO date' })
  readingDate?: Date;
}