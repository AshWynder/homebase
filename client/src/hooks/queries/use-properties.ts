import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { propertiesApi } from '@/api/properties';
import type {
  AssignCaretakerInput,
  CreatePropertyInput,
  UpdatePropertyInput,
} from '@/api/types';

import { queryKeys } from './keys';

export function useProperties() {
  return useQuery({
    queryKey: queryKeys.properties.list(),
    queryFn: propertiesApi.list,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => propertiesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePropertyInput) => propertiesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePropertyInput }) =>
      propertiesApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertiesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

/**
 * Create-and-assign (or attach an existing caretaker). One mutation, so the
 * property list refresh is the only invalidation needed — group-thread seating
 * happens server-side and notifies open threads over the socket.
 */
export function useAssignCaretaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AssignCaretakerInput;
    }) => propertiesApi.assignCaretaker(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useRemoveCaretaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertiesApi.removeCaretaker(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}