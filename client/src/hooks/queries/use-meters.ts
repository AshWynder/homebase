import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { metersApi, type QueryMetersInput } from '@/api/meters';
import type { CreateMeterInput, RecordReadingInput } from '@/api/types';

import { queryKeys } from './keys';

export function useMeters(params: QueryMetersInput = {}) {
  return useQuery({
    queryKey: queryKeys.meters.list(params),
    queryFn: () => metersApi.list(params),
  });
}

export function useMeter(id: string) {
  return useQuery({
    queryKey: queryKeys.meters.detail(id),
    queryFn: () => metersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeterInput) => metersApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meters.all });
    },
  });
}

export function useUpdateMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateMeterInput> }) =>
      metersApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meters.all });
    },
  });
}

export function useRecordReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecordReadingInput }) =>
      metersApi.recordReading(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meters.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.meters.readings(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}