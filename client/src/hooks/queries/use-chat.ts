import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { conversationsApi } from '@/api/chat';
import type { ConversationCount } from '@/api/types';
import { queryKeys } from './keys';

/**
 * The inbox.
 *
 * Infinite rather than paged because a chat list is scrolled, not stepped
 * through, and each page brings its own participants and preview line — a `page`
 * number in the key would mean every fetch rebuilding a list the user is looking
 * at.
 */
export function useConversations(search = '') {
  const trimmed = search.trim();

  return useInfiniteQuery({
    queryKey: queryKeys.chat.list({ search: trimmed }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      conversationsApi.list({ search: trimmed || undefined, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.items.length < lastPage.limit ? undefined : lastPage.page + 1,
  });
}

/** A thread's own record, for the header: participants and unread count. */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chat.detail(id ?? ''),
    queryFn: () => conversationsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * A thread's history, oldest-first, walked backwards with the cursor.
 *
 * Not seeded from the inbox's preview line. A preview is a summary that happens
 * to contain content, and seeding the page from it would put an unverified row at
 * the bottom of a message list — the one place where a mistake looks like a data
 * bug rather than a rendering one.
 */
export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      conversationsApi.messages(conversationId!, { before: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
  });
}

/**
 * The unread total behind the tab badge.
 *
 * A separate query from the inbox so the badge can be right even when the inbox
 * has not been opened — a person who never taps Chats should still see that there
 * is something waiting.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.chat.count(),
    queryFn: () => conversationsApi.unreadCount(),
    // Refetched on a timer rather than only on invalidation: unread state changes
    // on the server for reasons this device never hears about (another device
    // reading, a message arriving while the socket was down).
    refetchInterval: 60_000,
  });
}

/** Unread total for the badge, defaulting to 0 while unknown. */
export function useUnreadTotal(): number {
  const { data } = useUnreadCount();
  return (data as ConversationCount | undefined)?.unread ?? 0;
}

/**
 * Properties whose group thread this caller may open.
 *
 * `enabled` is off until the picker asks, so the inbox does not fetch a list that
 * most sessions never look at.
 */
export function useMessageableGroups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.groups(),
    queryFn: () => conversationsApi.messageableGroups(),
    enabled,
    // The set changes when a tenancy starts or ends, which arrives as a socket
    // event rather than as anything this device navigates.
    staleTime: 5 * 60_000,
  });
}

/** People this caller may open a direct thread with. Same lazy, long-lived shape. */
export function useMessageablePeople(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.people(),
    queryFn: () => conversationsApi.messageablePeople(),
    enabled,
    staleTime: 5 * 60_000,
  });
}
