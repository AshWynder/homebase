import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MeterType } from '../../../generated/prisma/enums';

export class CreateMeterDto {
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  @IsNotEmpty({ message: 'unitId is required' })
  unitId: string;

  @IsOptional()
  @IsEnum(MeterType, { message: 'meterType must be one of: WATER, ELECTRICITY' })
  meterType?: MeterType;

  @IsString()
  @IsOptional()
  meterNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'lastReading cannot be negative' })
  lastReading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'pricePerUnit must be a valid number' })
  @IsPositive({ message: 'pricePerUnit must be positive' })
  pricePerUnit?: number;
}