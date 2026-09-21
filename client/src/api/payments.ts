import { api, unwrap } from '@/lib/axios';

import type {
  InitiateCardPaymentInput,
  InitiateStkPaymentInput,
  Paginated,
  Payment,
  PaymentStatus,
} from './types';

export interface QueryPaymentsInput {
  invoiceId?: string;
  unitId?: string;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export const paymentsApi = {
  list: (params: QueryPaymentsInput = {}) =>
    unwrap<Paginated<Payment>>(api.get('/payments', { params })),
  get: (id: string) => unwrap<Payment>(api.get(`/payments/${id}`)),
  initiateStk: (input: InitiateStkPaymentInput) =>
    unwrap<Payment>(api.post('/payments/mpesa/stk', input)),
  initiateCard: (input: InitiateCardPaymentInput) =>
    unwrap<Payment>(api.post('/payments/card', input)),
  verify: (reference: string) => unwrap<Payment>(api.get(`/payments/verify/${reference}`)),
};