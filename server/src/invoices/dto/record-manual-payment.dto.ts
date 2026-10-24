import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

/** Owner-recorded settlement methods; provider callbacks never use these. */
export const MANUAL_PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.BANK,
  PaymentMethod.MPESA,
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export class RecordManualPaymentDto {
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amountPaid must be a valid money amount' },
  )
  @Min(0.01, { message: 'amountPaid must be greater than zero' })
  amountPaid!: number;

  @IsIn(MANUAL_PAYMENT_METHODS, {
    message: 'method must be one of: CASH, BANK, MPESA',
  })
  method!: ManualPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
