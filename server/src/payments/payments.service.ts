import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { DarajaService } from './daraja.service';
import { PaystackService } from './paystack.service';
import { InitiateStkPaymentDto } from './dto/initiate-stk-payment.dto';
import { InitiateCardPaymentDto } from './dto/initiate-card-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '../../generated/prisma/client';

const PAYMENT_REF_PREFIX = 'HB';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly daraja: DarajaService,
    private readonly paystack: PaystackService,
  ) {}

  // 1. M-Pesa STK Push (Daraja)

  async initiateStkPayment(dto: InitiateStkPaymentDto) {
    const invoice = await this.getPayableInvoice(dto.invoiceId);

    if (!this.daraja.isStkConfigured) {
      throw new ServiceUnavailableException(
        'M-Pesa STK is not configured. Set MPESA_STK_* environment variables.',
      );
    }

    const reference = this.generateReference();

    // Create the payment record first, then push — we need the ref
    // stored regardless of push outcome for reconciliation.
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.balanceDue,
        method: PaymentMethod.MPESA_STK,
        provider: PaymentProvider.DARAJA,
        transactionRef: reference,
        phoneNumber: this.daraja.normalizePhone(dto.phoneNumber),
        status: PaymentStatus.PENDING,
      },
    });

    try {
      const push = await this.daraja.initiateStkPush({
        amount: Number(invoice.balanceDue),
        phoneNumber: dto.phoneNumber,
        accountReference: reference.slice(0, 12),
        description: 'Rent payment',
      });

      return await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutRequestId: push.checkoutRequestId,
          merchantRequestId: push.merchantRequestId,
          rawPayload: { stkPush: push } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message : 'STK push failed',
        },
      });
      throw error;
    }
  }

  // 2. Card payment (Paystack hosted checkout)

  async initiateCardPayment(dto: InitiateCardPaymentDto) {
    const invoice = await this.getPayableInvoice(dto.invoiceId);

    if (!this.paystack.isConfigured) {
      throw new ServiceUnavailableException(
        'Card payments are not configured. Set PAYSTACK_* environment variables.',
      );
    }

    const invoiceWithTenant = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      select: {
        tenancy: {
          select: { tenant: { select: { user: { select: { email: true } } } } },
        },
      },
    });
    const email = invoiceWithTenant.tenancy.tenant.user.email;
    const reference = this.generateReference();

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.balanceDue,
        method: PaymentMethod.CARD,
        provider: PaymentProvider.PAYSTACK,
        transactionRef: reference,
        status: PaymentStatus.PENDING,
      },
    });

    try {
      const init = await this.paystack.initializeTransaction({
        amountSubunits: Math.round(Number(invoice.balanceDue) * 100),
        reference,
        email,
        callbackUrl: dto.callbackUrl,
        metadata: { invoiceId: invoice.id, paymentId: payment.id },
      });

      return await this.prisma.payment.update({
        where: { id: payment.id },
        data: { authorizationUrl: init.authorizationUrl },
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message : 'Initialization failed',
        },
      });
      throw error;
    }
  }

  /**
   * One-time registration of the C2B validation/confirmation URLs
   * with Safaricom (uses MPESA_C2B_* env config).
   */
  registerC2bUrls() {
    if (!this.daraja.isC2bConfigured) {
      throw new ServiceUnavailableException(
        'M-Pesa C2B is not configured. Set MPESA_C2B_* environment variables.',
      );
    }
    return this.daraja.registerC2bUrls();
  }

  // 3. Webhooks

  /** Daraja STK result callback. */
  async handleDarajaStkCallback(payload: {
    Body?: {
      stkCallback?: {
        CheckoutRequestID?: string;
        ResultCode?: number | string;
        ResultDesc?: string;
        CallbackMetadata?: { Item?: { Name: string; Value?: unknown }[] };
      };
    };
  }) {
    const cb = payload.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
      this.logger.warn(`Daraja STK callback missing fields: ${JSON.stringify(payload)}`);
      return { ResultCode: 0, ResultDesc: 'Ignored' };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { checkoutRequestId: cb.CheckoutRequestID },
    });

    if (!payment) {
      this.logger.warn(
        `Daraja STK callback for unknown CheckoutRequestID: ${cb.CheckoutRequestID}`,
      );
      return { ResultCode: 0, ResultDesc: 'Ignored' };
    }

    const metadataItems = cb.CallbackMetadata?.Item ?? [];
    const receiptValue = metadataItems.find(
      (i) => i.Name === 'MpesaReceiptNumber',
    )?.Value;
    const receipt =
      typeof receiptValue === 'string' ? receiptValue : undefined;
    const metadata = Object.fromEntries(
      metadataItems.map((i) => [i.Name, i.Value]),
    );

    if (Number(cb.ResultCode) === 0) {
      await this.settlePayment(
        payment,
        { mpesaReceiptNumber: receipt, callback: metadata },
        receipt,
      );
    } else {
      await this.markPaymentFailed(payment.id, cb.ResultDesc ?? 'STK failed');
    }

    // Daraja expects a bare acknowledgement, not the API envelope.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  /** Daraja C2B validation request (paybill before completion). */
  handleDarajaC2bValidation(_payload: Record<string, unknown>) {
    // ResponseType "Completed" means Safaricom completes without further
    // validation round-trips; we still ack to keep the endpoint compliant.
    return { ResponseCode: '0', ResponseDescription: 'Accepted' };
  }

  /** Daraja C2B confirmation (tenant paid the paybill manually). */
  async handleDarajaC2bConfirmation(payload: {
    TransID?: string;
    TransAmount?: string | number;
    BillRefNumber?: string;
    MSISDN?: string;
    FirstName?: string;
    LastName?: string;
    [key: string]: unknown;
  }) {
    const { TransID, TransAmount, BillRefNumber, MSISDN } = payload;

    if (!TransID || !BillRefNumber) {
      this.logger.warn(`Daraja C2B confirmation missing fields: ${JSON.stringify(payload)}`);
      return { ResultCode: 0, ResultDesc: 'Ignored' };
    }

    // BillRefNumber must be the invoice id (what the tenant enters as account no.)
    const invoiceId = String(BillRefNumber).trim();
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.warn(
        `Daraja C2B payment for unknown invoice "${invoiceId}": TransID=${TransID}`,
      );
      // Ack anyway so Daraja doesn't retry forever; ops can reconcile via logs.
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    // Idempotent: TransID is the unique transactionRef. If it already exists,
    // this is a retry — ack without side effects.
    const existing = await this.prisma.payment.findUnique({
      where: { transactionRef: TransID },
    });
    if (existing) {
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    const amount = Number(TransAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.logger.warn(`Daraja C2B invalid amount: TransID=${TransID} amount=${TransAmount}`);
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        method: PaymentMethod.MPESA_C2B,
        provider: PaymentProvider.DARAJA,
        transactionRef: TransID,
        phoneNumber: MSISDN,
        status: PaymentStatus.PENDING,
        rawPayload: payload as Prisma.InputJsonValue,
      },
    });

    await this.settlePayment(payment, { c2bConfirmation: payload });

    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  /** Paystack charge webhook (card payments). */
  async handlePaystackWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Paystack webhook rejected: invalid signature');
      return { received: false };
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: {
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
        paid_at?: string;
        [key: string]: unknown;
      };
    };

    if (event.event !== 'charge.success' || !event.data?.reference) {
      return { received: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef: event.data.reference },
    });

    if (!payment) {
      this.logger.warn(
        `Paystack webhook for unknown reference: ${event.data.reference}`,
      );
      return { received: true };
    }

    if (
      event.data.status === 'success' &&
      event.data.currency === 'KES' &&
      Number(event.data.amount) === Math.round(Number(payment.amount) * 100)
    ) {
      await this.settlePayment(payment, {
        paystack: event.data,
      });
    } else {
      this.logger.warn(
        `Paystack webhook status/amount mismatch for ${payment.transactionRef}: ${JSON.stringify(event.data)}`,
      );
    }

    return { received: true };
  }

  // 4. Verify (poll fallback)

  /**
   * Poll the provider for the latest state of a payment. Useful in
   * development when webhooks cannot reach localhost.
   */
  async verifyByReference(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef: reference },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ref "${reference}" not found`);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return this.findOne(payment.id);
    }

    if (
      payment.method === PaymentMethod.MPESA_STK &&
      payment.checkoutRequestId
    ) {
      const result = await this.daraja.queryStkStatus(payment.checkoutRequestId);
      if (result.resultCode === 0) {
        await this.settlePayment(
          payment,
          { stkQuery: result.raw },
          result.mpesaReceiptNumber,
        );
      } else if (result.resultCode !== 1032 && result.resultCode !== 1037) {
        // 1032 = cancelled by user, 1037 = timeout — leave pending briefly
        await this.markPaymentFailed(payment.id, result.resultDesc);
      }
    } else if (payment.method === PaymentMethod.CARD) {
      const result = await this.paystack.verifyTransaction(payment.transactionRef);
      if (result.status === 'success') {
        await this.settlePayment(payment, { paystackVerify: result.raw });
      } else if (result.status === 'failed') {
        await this.markPaymentFailed(payment.id, 'Paystack reported failure');
      }
    }

    return this.findOne(payment.id);
  }

  // 5. Queries

  async findAll(query: QueryPaymentsDto, ownerId?: string) {
    const { invoiceId, unitId, propertyId, method, status, from, to, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const unitWhere: Prisma.UnitWhereInput = {
      ...(unitId && { id: unitId }),
      ...(propertyId && { propertyId }),
      ...(ownerId && !invoiceId && { property: { ownerId } }),
    };

    const where: Prisma.PaymentWhereInput = {
      ...(invoiceId && { invoiceId }),
      ...(method && { method }),
      ...(status && { status }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
      ...(Object.keys(unitWhere).length > 0 && {
        invoice: { unit: unitWhere },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          invoice: {
            select: {
              id: true,
              status: true,
              amount: true,
              balanceDue: true,
              periodStart: true,
              periodEnd: true,
              unit: {
                select: {
                  id: true,
                  unitNumber: true,
                  property: { select: { id: true, name: true } },
                },
              },
              tenancy: {
                select: {
                  tenant: {
                    select: {
                      user: {
                        select: { id: true, name: true, email: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            status: true,
            amount: true,
            balanceDue: true,
            periodStart: true,
            periodEnd: true,
            unit: {
              select: {
                id: true,
                unitNumber: true,
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id "${id}" not found`);
    }

    return payment;
  }

  // 6. Internals

  private async getPayableInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${invoiceId}" not found`);
    }
    if (Number(invoice.balanceDue) <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    return invoice;
  }

  private generateReference(): string {
    return `${PAYMENT_REF_PREFIX}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
  }

  /**
   * Idempotent settlement: only a PENDING payment transitions to SUCCESS,
   * and the invoice is credited exactly once (guarded by the same check).
   * `mpesaReceiptNumber` persists the M-Pesa receipt (MpesaReceiptNumber)
   * as a first-class column when settling an M-Pesa payment.
   */
  private async settlePayment(
    payment: Payment,
    rawPayload: Record<string, unknown>,
    mpesaReceiptNumber?: string,
  ) {
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
        ...(mpesaReceiptNumber ? { mpesaReceiptNumber } : {}),
        rawPayload: {
          ...(payment.rawPayload as Record<string, unknown> | null),
          ...rawPayload,
        } as Prisma.InputJsonValue,
      },
    });

    if (claimed.count === 0) {
      this.logger.log(`Payment ${payment.transactionRef} already settled`);
      return;
    }

    try {
      await this.invoicesService.applySuccessfulPayment({
        id: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
      });
    } catch (error) {
      // Settlement of the invoice failed after the payment was marked —
      // revert so a retry (webhook retry / manual verify) can re-claim.
      this.logger.error(
        `Invoice credit failed for payment ${payment.transactionRef}, reverting to PENDING`,
        error instanceof Error ? error.stack : error,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PENDING, paidAt: null },
      });
      throw error;
    }
  }

  private async markPaymentFailed(id: string, reason: string) {
    await this.prisma.payment.updateMany({
      where: { id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });
  }
}
