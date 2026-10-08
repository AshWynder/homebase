import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';

export class QueryPaymentsDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'invoiceId must be a valid UUID' })
  invoiceId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'method must be one of: MPESA_STK, MPESA_C2B, CARD',
  })
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'status must be one of: SUCCESS, FAILED, PENDING',
  })
  status?: PaymentStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'from must be a valid ISO date' })
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'to must be a valid ISO date' })
  to?: Date;

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