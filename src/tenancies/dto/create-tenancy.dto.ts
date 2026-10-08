import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateTenancyDto {
  @IsUUID(undefined, { message: 'tenantId must be a valid UUID' })
  @IsNotEmpty({ message: 'tenantId is required' })
  tenantId: string;

  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  @IsNotEmpty({ message: 'unitId is required' })
  unitId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'rentAmount must be a valid number' })
  @IsPositive({ message: 'rentAmount must be greater than 0' })
  rentAmount: number;

  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid ISO date' })
  @IsNotEmpty({ message: 'startDate is required' })
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
