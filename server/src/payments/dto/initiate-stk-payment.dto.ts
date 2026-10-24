import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class InitiateStkPaymentDto {
  /**
   * Single-invoice payment (e.g. the inline "Pay Now" on an invoice card).
   * Either this or `invoiceIds` must be present.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'invoiceId must be a valid UUID' })
  invoiceId?: string;

  /**
   * Bulk payment covering several invoices with one STK prompt for the summed
   * balance. The received amount is allocated across the invoices oldest-first
   * once the payment settles. Either this or `invoiceId` must be present.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'invoiceIds must contain at least one invoice' })
  @ArrayMaxSize(24, { message: 'invoiceIds must contain at most 24 invoices' })
  @IsUUID(undefined, {
    each: true,
    message: 'each invoiceIds entry must be a valid UUID',
  })
  invoiceIds?: string[];

  /**
   * Kenyan mobile number. Accepted formats:
   * 07XXXXXXXX / 01XXXXXXXX / 2547XXXXXXXX / 2541XXXXXXXX / +2547XXXXXXXX
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+?254|0)?([17]\d{8})$/, {
    message:
      'phoneNumber must be a valid Kenyan mobile number e.g. 0712345678 or 254712345678',
  })
  phoneNumber!: string;
}