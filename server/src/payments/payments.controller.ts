import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiateStkPaymentDto } from './dto/initiate-stk-payment.dto';
import { InitiateCardPaymentDto } from './dto/initiate-card-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Initiation ───────────────────────────────────────────

  @Post('mpesa/stk')
  @ResponseMessage('M-Pesa STK push initiated. Check your phone.')
  initiateStk(@Body() dto: InitiateStkPaymentDto) {
    return this.paymentsService.initiateStkPayment(dto);
  }

  @Post('card')
  @ResponseMessage('Card checkout created')
  initiateCard(@Body() dto: InitiateCardPaymentDto) {
    return this.paymentsService.initiateCardPayment(dto);
  }

  @Post('c2b/register-urls')
  @ResponseMessage('C2B URLs registered with Safaricom')
  registerC2bUrls() {
    return this.paymentsService.registerC2bUrls();
  }

  // ── Webhooks (raw provider payloads, no API envelope) ────
  // Paths match MPESA_STK_CALLBACK_URL / MPESA_C2B_*_URL in .env.development

  @Post('stk-callback')
  @BypassTransform()
  darajaStkCallback(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleDarajaStkCallback(payload);
  }

  @Post('c2b-validation')
  @BypassTransform()
  darajaC2bValidation(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleDarajaC2bValidation(payload);
  }

  @Post('c2b-confirmation')
  @BypassTransform()
  async darajaC2bConfirmation(@Body() payload: Record<string, unknown>) {
    await this.paymentsService.handleDarajaC2bConfirmation(payload);
    // Bare ack expected by Daraja, not the API envelope
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  @Post('webhook/paystack')
  @BypassTransform()
  paystackWebhook(@Req() request: RawBodyRequest<Request>) {
    return this.paymentsService.handlePaystackWebhook(
      request.rawBody as Buffer,
      request.headers['x-paystack-signature'] as string | undefined,
    );
  }

  // ── Verify / poll fallback ───────────────────────────────

  @Get('verify/:reference')
  @ResponseMessage('Payment status refreshed')
  verify(@Param('reference') reference: string) {
    return this.paymentsService.verifyByReference(reference);
  }

  // ── Queries ──────────────────────────────────────────────

  @Get()
  @ResponseMessage('Payments fetched successfully')
  findAll(
    @Query() query: QueryPaymentsDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    // Always scope the list to the authenticated user's own properties.
    return this.paymentsService.findAll(query, auth?.profile.id);
  }

  @Get(':id')
  @ResponseMessage('Payment details fetched successfully')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}