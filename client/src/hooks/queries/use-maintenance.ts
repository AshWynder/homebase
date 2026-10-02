import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  MAINTENANCE_PAGE_SIZE,
  maintenanceApi,
  type QueryMaintenanceTicketsInput,
} from '@/api/maintenance';
import type { CreateMaintenanceTicketInput, MaintenanceStatus } from '@/api/types';

import { queryKeys } from './keys';

/** Every status a tenant can filter by, plus the unfiltered "All" bucket. */
const STATUS_FILTERS: readonly MaintenanceStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

/**
 * Paged maintenance list. `limit` is omitted from the query key on purpose: it
 * is a fixed page size, and leaving it out keeps the key stable if that ever
 * changes.
 */
export function useMaintenanceTickets(status?: MaintenanceStatus) {
  return useInfiniteQuery({
    queryKey: queryKeys.maintenance.infinite(status),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      maintenanceApi.list({ status, page: pageParam, limit: MAINTENANCE_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.items.length < lastPage.limit ? undefined : lastPage.page + 1,
  });
}

/** Flattens the pages into one array for rendering. */
export function flattenMaintenancePages(
  pages: Awaited<ReturnType<typeof maintenanceApi.list>>[] | undefined,
) {
  return pages?.flatMap((page) => page.items) ?? [];
}

export function useMaintenanceTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenance.detail(id),
    queryFn: () => maintenanceApi.get(id),
    enabled: !!id,
    // A ticket's status changes on the owner's side, so a tenant who leaves the
    // screen open should see the new state on return rather than a stale badge.
    refetchOnWindowFocus: true,
  });
}

/**
 * Per-status totals for the filter pills.
 *
 * These are three extra requests, but each asks the server for a single row and
 * reads only the count, and they keep the pill counts honest — deriving them
 * from the loaded pages would show "0" for any status the tenant has not
 * scrolled to yet.
 */
export function useMaintenanceStatusCounts() {
  const results = useQueries({
    queries: STATUS_FILTERS.map((status) => ({
      queryKey: queryKeys.maintenance.list({ status, limit: 1 }),
      queryFn: () => maintenanceApi.list({ status, limit: 1 }),
      staleTime: 30000,
    })),
  });

  const byStatus = {} as Record<MaintenanceStatus, number>;
  let all = 0;

  results.forEach((result, index) => {
    const status = STATUS_FILTERS[index];
    byStatus[status] = result.data?.total ?? 0;
    all += result.data?.total ?? 0;
  });

  return { byStatus, all, isLoading: results.some((result) => result.isPending) };
}

export function useCreateMaintenanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMaintenanceTicketInput) => maintenanceApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export type MaintenanceListParams = QueryMaintenanceTicketsInput;
