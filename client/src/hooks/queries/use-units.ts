import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unitsApi, type QueryUnitsInput } from '@/api/units';
import type { CreateUnitInput } from '@/api/types';

import { queryKeys } from './keys';

export function useUnits(params: QueryUnitsInput = {}) {
  return useQuery({
    queryKey: queryKeys.units.list(params),
    queryFn: () => unitsApi.list(params),
  });
}

export function useUnitsByProperty(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.units.byProperty(propertyId),
    queryFn: () => unitsApi.byProperty(propertyId),
    enabled: !!propertyId,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUnitInput) => unitsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}