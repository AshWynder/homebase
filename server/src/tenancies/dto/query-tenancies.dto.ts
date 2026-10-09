import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class QueryTenanciesDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'tenantId must be a valid UUID' })
  tenantId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}
