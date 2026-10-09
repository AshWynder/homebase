import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { MeterType } from '../../../generated/prisma/enums';

export class QueryMetersDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  @IsOptional()
  @IsEnum(MeterType, { message: 'meterType must be one of: WATER, ELECTRICITY' })
  meterType?: MeterType;

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