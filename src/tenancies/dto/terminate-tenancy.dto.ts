import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class TerminateTenancyDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;

  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  @MaxLength(500, { message: 'reason cannot exceed 500 characters' })
  reason?: string;

  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @MaxLength(2000, { message: 'notes cannot exceed 2000 characters' })
  notes?: string;
}
