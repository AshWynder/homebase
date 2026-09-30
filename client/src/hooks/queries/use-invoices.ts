import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invoicesApi, type QueryInvoicesInput, type QueryInvoiceSummaryInput } from '@/api/invoices';
import type { GenerateInvoicesInput } from '@/api/types';

import { queryKeys } from './keys';

export function useInvoices(params: QueryInvoicesInput = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoicesApi.list(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
}

/** Money totals for the Money tab's status tiles. */
export function useInvoiceSummary(params: QueryInvoiceSummaryInput = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.summary(params),
    queryFn: () => invoicesApi.summary(params),
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateInvoicesInput = {}) => invoicesApi.generate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

export function useRefreshInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.refresh(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}