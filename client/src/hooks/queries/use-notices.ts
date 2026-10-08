import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  NOTICE_PAGE_SIZE,
  noticesApi,
  type QueryNoticesInput,
} from '@/api/notices';
import type {
  CreateNoticeInput,
  NoticeAudience,
  NoticeDetail,
  ReceivedNotice,
  SentNotice,
} from '@/api/types';

import { queryKeys } from './keys';

/** Flattens pages into one array for rendering. */
export function flattenNoticePages<T extends SentNotice | ReceivedNotice>(
  pages: { items: T[]; limit: number; page: number }[] | undefined,
): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

/** A page is the last one when it came back short. */
function nextPage<T extends SentNotice | ReceivedNotice>(
  lastPage: { items: T[]; limit: number; page: number },
) {
  return lastPage.items.length < lastPage.limit ? undefined : lastPage.page + 1;
}

/**
 * The owner's sent notices.
 *
 * `page` and `limit` are left out of the query key: paging is mechanical, and
 * keeping it out means a filter change invalidates the whole list from a single
 * key rather than needing a wildcard over every page number.
 */
export function useSentNotices(filters: { propertyId?: string; audience?: NoticeAudience }) {
  return useInfiniteQuery({
    queryKey: queryKeys.notices.list(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      noticesApi.list<SentNotice>({
        ...filters,
        page: pageParam,
        limit: NOTICE_PAGE_SIZE,
      }),
    getNextPageParam: nextPage,
  });
}

/**
 * The tenant's inbox.
 *
 * Scoped entirely by the JWT — there is no tenant id in the params — so the same
 * key can never resolve to another tenant's notices.
 */
export function useReceivedNotices(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.notices.received(unreadOnly),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      noticesApi.list<ReceivedNotice>({
        unreadOnly: unreadOnly || undefined,
        page: pageParam,
        limit: NOTICE_PAGE_SIZE,
      }),
    getNextPageParam: nextPage,
  });
}

/**
 * A handful of notices for a feed — the home screen's recent activity needs a
 * few rows, not the inbox's full page size, and sharing the inbox key would
 * mean two different page sizes fighting over one cache entry.
 */
export function useRecentNotices(limit = 5) {
  return useQuery({
    queryKey: queryKeys.notices.recent(),
    queryFn: () => noticesApi.list<ReceivedNotice>({ page: 1, limit }),
    staleTime: 30000,
  });
}

export function useNotice(id: string) {
  return useQuery({
    queryKey: queryKeys.notices.detail(id),
    queryFn: () => noticesApi.get(id),
    enabled: !!id,
  });
}

/**
 * Unread total for the tenant's bell badge.
 *
 * Counted straight from the receipt rows rather than derived from a page, so it
 * is correct no matter how far the tenant has scrolled.
 */
export function useUnreadNoticeCount() {
  return useQuery({
    queryKey: queryKeys.notices.count(),
    queryFn: () => noticesApi.unreadCount(),
    staleTime: 30000,
  });
}

export function useSendNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoticeInput) => noticesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices.all });
    },
  });
}

/**
 * Marks a notice read. Used by the tenant detail screen, which calls it on open
 * so opening a notice is what dismisses the badge — no separate "mark as read"
 * button to find.
 */
export function useMarkNoticeRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.markRead(id),
    onSuccess: (receipt, id) => {
      // The response is a receipt, not the notice, so it is merged into whatever
      // detail is already cached rather than written over it — replacing the
      // entry outright would drop the title, body and author and leave the
      // screen that just marked itself read blank.
      queryClient.setQueryData<NoticeDetail>(queryKeys.notices.detail(id), (cached) =>
        cached ? { ...cached, isRead: receipt.isRead, readAt: receipt.readAt } : cached,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices.all });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notices.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices.all });
    },
  });
}

export type NoticeListFilters = QueryNoticesInput;