import { Injectable, Logger } from '@nestjs/common';

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
}

export interface StkQueryResult {
  resultCode: number;
  resultDesc: string;
  /** Present when ResultCode is 0 */
  mpesaReceiptNumber?: string;
  raw: Record<string, unknown>;
}

interface OAuthResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface StkQueryResponse {
  ResponseCode: string;
  ResultCode: string;
  ResultDesc: string;
  mpesaReceiptNumber?: string;
}

/**
 * Safaricom Daraja API client.
 * Handles OAuth token caching, STK push (Lipa na M-Pesa Online),
 * STK status query and C2B URL registration.
 *
 * Env (see .env.development):
 *  DARAJA_ENV=sandbox|production, DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET,
 *  MPESA_BASE_URL (optional override),
 *  MPESA_STK_SHORTCODE, MPESA_STK_PASSKEY, MPESA_STK_CALLBACK_URL,
 *  MPESA_C2B_SHORTCODE, MPESA_C2B_RESPONSE_TYPE,
 *  MPESA_C2B_VALIDATION_URL, MPESA_C2B_CONFIRMATION_URL
 */
@Injectable()
export class DarajaService {
  private readonly logger = new Logger(DarajaService.name);

  private readonly baseUrl =
    process.env.MPESA_BASE_URL ??
    ((process.env.DARAJA_ENV ?? 'sandbox') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke');

  // Lipa na M-Pesa Online (STK push)
  private readonly stkShortcode = process.env.MPESA_STK_SHORTCODE ?? '';
  private readonly stkPasskey = process.env.MPESA_STK_PASSKEY ?? '';
  private readonly stkCallbackUrl = (
    process.env.MPESA_STK_CALLBACK_URL ?? ''
  ).replace(/\/$/, '');

  // C2B (paybill)
  private readonly c2bShortcode = process.env.MPESA_C2B_SHORTCODE ?? '';
  private readonly c2bResponseType =
    process.env.MPESA_C2B_RESPONSE_TYPE ?? 'Completed';
  private readonly c2bValidationUrl = (
    process.env.MPESA_C2B_VALIDATION_URL ?? ''
  ).replace(/\/$/, '');
  private readonly c2bConfirmationUrl = (
    process.env.MPESA_C2B_CONFIRMATION_URL ?? ''
  ).replace(/\/$/, '');

  private readonly consumerKey = process.env.DARAJA_CONSUMER_KEY ?? '';
  private readonly consumerSecret = process.env.DARAJA_CONSUMER_SECRET ?? '';

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  get isStkConfigured(): boolean {
    return Boolean(
      this.consumerKey &&
        this.consumerSecret &&
        this.stkShortcode &&
        this.stkPasskey &&
        this.stkCallbackUrl,
    );
  }

  get isC2bConfigured(): boolean {
    return Boolean(
      this.consumerKey &&
        this.consumerSecret &&
        this.c2bShortcode &&
        this.c2bValidationUrl &&
        this.c2bConfirmationUrl,
    );
  }

  /**
   * OAuth token with in-memory caching (token valid ~1h; refresh 60s early).
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Daraja OAuth failed: ${response.status} ${body}`);
      throw new Error(`Daraja OAuth failed (${response.status})`);
    }

    const data = (await response.json()) as OAuthResponse;
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (Number(data.expires_in) - 60) * 1000;
    return this.cachedToken;
  }

  /**
   * Base64(Shortcode + Passkey + Timestamp). Timestamp = yyyyMMddHHmmss.
   */
  private buildPassword(shortcode: string, timestamp: string): string {
    return Buffer.from(`${shortcode}${this.stkPasskey}${timestamp}`).toString(
      'base64',
    );
  }

  private buildTimestamp(): string {
    const now = new Date();
    const fmt = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}${fmt(now.getMonth() + 1)}${fmt(
      now.getDate(),
    )}`;
    const time = `${fmt(now.getHours())}${fmt(now.getMinutes())}${fmt(
      now.getSeconds(),
    )}`;
    return `${date}${time}`;
  }

  /**
   * Normalize Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX.
   */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (digits.startsWith('0')) return `254${digits.slice(1)}`;
    return digits;
  }

  async initiateStkPush(params: {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    description: string;
  }): Promise<StkPushResult> {
    const token = await this.getAccessToken();
    const timestamp = this.buildTimestamp();

    const payload = {
      BusinessShortCode: this.stkShortcode,
      Password: this.buildPassword(this.stkShortcode, timestamp),
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: this.normalizePhone(params.phoneNumber),
      PartyB: this.stkShortcode,
      PhoneNumber: this.normalizePhone(params.phoneNumber),
      CallBackURL: this.stkCallbackUrl,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.description.slice(0, 13),
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    // Daraja returns two shapes: success-shaped ({ ResponseCode, ... }) and
    // error-shaped ({ requestId, errorCode, errorMessage }) for validation
    // failures like 400.002.02.
    const data = (await response.json()) as StkPushResponse & {
      errorCode?: string;
      errorMessage?: string;
    };

    if (!response.ok || data.ResponseCode !== '0') {
      this.logger.error(`Daraja STK push failed: ${JSON.stringify(data)}`);
      const code = data.errorCode ? ` [${data.errorCode}]` : '';
      const reason =
        data.errorMessage ??
        data.ResponseDescription ??
        `HTTP ${response.status}`;
      throw new Error(`STK push failed${code}: ${reason}`);
    }

    return {
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      customerMessage: data.CustomerMessage,
    };
  }

  /**
   * Fallback poll for an STK transaction when the callback
   * has not arrived (or is unreachable, e.g. localhost dev).
   */
  async queryStkStatus(checkoutRequestId: string): Promise<StkQueryResult> {
    const token = await this.getAccessToken();
    const timestamp = this.buildTimestamp();

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: this.stkShortcode,
          Password: this.buildPassword(this.stkShortcode, timestamp),
          Timestamp: timestamp,
          CheckoutID: checkoutRequestId,
        }),
      },
    );

    const data = (await response.json()) as StkQueryResponse & {
      errorCode?: string;
      errorMessage?: string;
    };

    if (data.errorCode) {
      throw new Error(`STK query failed: ${data.errorMessage}`);
    }

    return {
      resultCode: Number(data.ResultCode),
      resultDesc: data.ResultDesc,
      mpesaReceiptNumber: data.mpesaReceiptNumber,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  /**
   * One-time registration of C2B validation/confirmation endpoints,
   * using the URLs from MPESA_C2B_VALIDATION_URL / MPESA_C2B_CONFIRMATION_URL.
   */
  async registerC2bUrls() {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ShortCode: this.c2bShortcode,
        ResponseType: this.c2bResponseType,
        ConfirmationURL: this.c2bConfirmationUrl,
        ValidationURL: this.c2bValidationUrl,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.error(
        `Daraja C2B registration failed: ${JSON.stringify(data)}`,
      );
      throw new Error(`C2B URL registration failed: ${JSON.stringify(data)}`);
    }

    return data;
  }
}