import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending' | string;
  amount: number; // subunits
  currency: string;
  paidAt?: string;
  raw: Record<string, unknown>;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

/**
 * Paystack API client (card payments only).
 *
 * Env: PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, PAYSTACK_CALLBACK_BASE_URL
 */
@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY ?? '';
  private readonly callbackBaseUrl = (
    process.env.PAYSTACK_CALLBACK_BASE_URL ?? ''
  ).replace(/\/$/, '');

  get isConfigured(): boolean {
    return Boolean(this.secretKey && this.callbackBaseUrl);
  }

  /**
   * Initialize a hosted-checkout transaction (KES).
   * Amount must be provided in subunits (KES * 100).
   */
  async initializeTransaction(params: {
    amountSubunits: number;
    reference: string;
    email: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitResult> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountSubunits,
        email: params.email,
        currency: 'KES',
        reference: params.reference,
        callback_url: params.callbackUrl ?? `${this.callbackBaseUrl}/payments/callback`,
        channels: ['card'],
        metadata: params.metadata,
      }),
    });

    const data = (await response.json()) as PaystackResponse<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>;

    if (!response.ok || !data.status) {
      this.logger.error(`Paystack initialize failed: ${JSON.stringify(data)}`);
      throw new Error(`Paystack initialize failed: ${data.message}`);
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  }

  /**
   * Fallback verification for a transaction when the webhook
   * has not arrived (or is unreachable, e.g. localhost dev).
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const data = (await response.json()) as PaystackResponse<{
      status: string;
      amount: number;
      currency: string;
      paid_at?: string;
    }>;

    if (!response.ok || !data.status) {
      this.logger.error(`Paystack verify failed: ${JSON.stringify(data)}`);
      throw new Error(`Paystack verify failed: ${data.message}`);
    }

    return {
      status: data.data.status,
      amount: data.data.amount,
      currency: data.data.currency,
      paidAt: data.data.paid_at,
      raw: data.data as unknown as Record<string, unknown>,
    };
  }

  /**
   * Validate the x-paystack-signature header (HMAC-SHA512 of the raw body).
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !this.secretKey) return false;

    const hash = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(hash, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}