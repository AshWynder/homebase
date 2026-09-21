import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { paymentsApi, type QueryPaymentsInput } from '@/api/payments';
import type { InitiateStkPaymentInput } from '@/api/types';

import { queryKeys } from './keys';

export function usePayments(params: QueryPaymentsInput = {}) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsApi.list(params),
  });
}

export function useInitiateStkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateStkPaymentInput) => paymentsApi.initiateStk(input),
    onSuccess: () => {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}