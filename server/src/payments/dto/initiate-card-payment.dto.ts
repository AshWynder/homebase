import { IsUUID, IsOptional, IsString } from 'class-validator';

export class InitiateCardPaymentDto {
  @IsUUID(undefined, { message: 'invoiceId must be a valid UUID' })
  invoiceId!: string;

  /**
   * Optional per-request override of PAYSTACK_CALLBACK_BASE_URL.
   * Where Paystack redirects the tenant after the hosted checkout.
   */
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}