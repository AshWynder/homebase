import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { InvoiceStatus } from '../../../generated/prisma/enums';

export class QueryInvoicesDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'tenancyId must be a valid UUID' })
  tenancyId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus, {
    message: 'status must be one of: UNPAID, PARTIALLY_PAID, PAID, OVERDUE',
  })
  status?: InvoiceStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'periodStart must be a valid ISO date' })
  periodStart?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'periodEnd must be a valid ISO date' })
  periodEnd?: Date;

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