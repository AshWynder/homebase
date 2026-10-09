import { Transform, Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class TerminateTenancyDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160, { message: 'reason cannot exceed 160 characters' })
  reason?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000, { message: 'notes cannot exceed 1000 characters' })
  notes?: string;
}
