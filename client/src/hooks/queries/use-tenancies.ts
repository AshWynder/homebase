import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { tenanciesApi, type QueryTenanciesInput } from '@/api/tenancies';
import type { CreateTenancyInput, TerminateTenancyInput } from '@/api/types';

import { queryKeys } from './keys';

export function useTenancies(params: QueryTenanciesInput = {}) {
  return useQuery({
    queryKey: queryKeys.tenancies.list(params),
    queryFn: () => tenanciesApi.list(params),
  });
}

export function useActiveTenancies() {
  return useQuery({
    queryKey: queryKeys.tenancies.active(),
    queryFn: () => tenanciesApi.active(),
  });
}

export function useTenancy(id: string) {
  return useQuery({
    queryKey: queryKeys.tenancies.detail(id),
    queryFn: () => tenanciesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenancyInput) => tenanciesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenancies.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useTerminateTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: TerminateTenancyInput }) =>
      tenanciesApi.terminate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenancies.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useDeleteTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenanciesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenancies.all });
    },
  });
}