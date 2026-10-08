import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class InitiateStkPaymentDto {
  @IsUUID(undefined, { message: 'invoiceId must be a valid UUID' })
  invoiceId!: string;

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