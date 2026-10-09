import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class GenerateInvoicesDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'periodStart must be a valid ISO date' })
  periodStart?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000, { message: 'year must be a valid year' })
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'month must be between 1 and 12' })
  month?: number;

  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'tenancyId must be a valid UUID' })
  tenancyId?: string;
}