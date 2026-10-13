import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { paymentsApi, type QueryPaymentsInput } from '@/api/payments';
import type { InitiateStkPaymentInput, Payment } from '@/api/types';

import { queryKeys } from './keys';

export function usePayments(params: QueryPaymentsInput = {}) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsApi.list(params),
  });
}

/**
 * A single payment, created from the object the initiate mutation returned so
 * the status screen has data instantly rather than on first fetch.
 */
export function usePayment(
  id: string | undefined,
  options?: { pollUntilSettled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id ?? ''),
    queryFn: () => paymentsApi.get(id as string),
    enabled: Boolean(id),
    refetchInterval: options?.pollUntilSettled
      ? (query) => (query.state.data?.status === 'PENDING' ? 2500 : false)
      : false,
  });
}

export function useInitiateStkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateStkPaymentInput) => paymentsApi.initiateStk(input),
    onSuccess: (payment: Payment) => {
      // Seed the detail entry so `usePayment(payment.id)` can start polling
      // immediately from the response, without waiting on a first fetch.
      queryClient.setQueryData(queryKeys.payments.detail(payment.id), payment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

export function useInitiateCardPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { invoiceId: string; callbackUrl?: string }) =>
      paymentsApi.initiateCard(input),
    onSuccess: (payment: Payment) => {
      queryClient.setQueryData(queryKeys.payments.detail(payment.id), payment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Manual fallback that asks the provider for the latest state when the STK
 * callback is slow (e.g. the webhook could not reach the server).
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => paymentsApi.verify(reference),
    onSuccess: (payment: Payment) => {
      queryClient.setQueryData(queryKeys.payments.detail(payment.id), payment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}