import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queries/keys';
import { useUnreadCount } from '@/hooks/queries/use-chat';
import { newClientId } from '@/lib/client-id';
import { chatSocket, OFFLINE_ACK } from '@/lib/socket';
import type {
  ChatAck,
  ChatMessage,
  ConversationCount,
  ConversationPage,
  ConversationSummary,
  MessagePage,
  SendAck,
} from '@/api/types';
import { conversationsApi } from '@/api/chat';

/**
 * Mirrors `SendMessageDto` on the server.
 *
 * The number is duplicated deliberately — it is a UI affordance (the composer
 * stops counting) and the server is still the authority, but the two must agree.
 * They once did not: the client allowed 4000 and the server's `MaxLength(2000)`
 * rejected anything longer, so a composer that looked like it had room would
 * fail on send.
 */
export const MESSAGE_LIMITS = { maxLength: 2000 } as const;

export interface ChatActions {
  connected: boolean;
  /**
   * Resolves with a failure value for *every* rejection — offline, validation, not
   * a member, no reply — rather than throwing.
   *
   * Callers render a failed bubble in all of those cases, and a rejected promise
   * would make "your message did not send" indistinguishable from "the app
   * crashed", which is the wrong thing to show somebody who just hit send.
   */
  sendMessage: (conversationId: string, content: string) => Promise<SendAck>;
  markRead: (conversationId: string) => void;
  subscribe: (conversationId: string) => void;
  unsubscribe: (conversationId: string) => void;
  /**
   * Signals that this person is (or is no longer) typing in a thread.
   *
   * Fire-and-forget: the acknowledgement is read to be discarded — typing is
   * ephemeral, so neither branch offers a caller anything to act on. Guarded by
   * `canSend` all the same: an emit in the handshake window would be answered
   * with a 401 nobody is listening for, and a keystroke while offline is not
   * worth queueing.
   */
  setTyping: (conversationId: string, typing: boolean) => void;
}

const ChatActionsContext = createContext<ChatActions | null>(null);

/**
 * Owns the chat socket and every action that touches it.
 *
 * A provider rather than a hook each screen calls, because the connection has to
 * be established exactly once. A hook per thread screen would reconnect on every
 * navigation between two conversations, dropping subscriptions and racing the ack
 * of a message that was already in flight.
 *
 * Live events mark queries stale instead of writing into the cache. The server's
 * push and a subsequent HTTP read can disagree about ordering; refetching is the
 * one path that converges. The single exception is appending `message:new` to
 * cached history, deduplicated by server id because the sender receives both the
 * broadcast and its own acknowledgement for the same row.
 */
export function ChatProvider({
  token,
  children,
}: {
  token: string | null;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  /**
   * The unread total is subscribed to here, not in the screens that display it.
   *
   * An invalidation only reaches a query that is mounted, and the badge lives in
   * places that are not always on screen — the tenant tab bar, the owner's
   * Activity hub. Mounting the count once at the root keeps it live for both, and
   * means a `conversation:touched` broadcast refreshes a badge the person is
   * currently looking at somewhere else in the app.
   */
  useUnreadCount();

  // Initialized from the socket rather than `false`: on a remount (a role switch,
  // or a fast refresh) the connection may already be up, and starting from
  // `false` would briefly render every screen's offline banner over a live socket.
  // `onStatusChange` still covers the transition afterwards.
  const [connected, setConnected] = useState(() => chatSocket.isReady());

  useEffect(() => {
    if (!token) {
      chatSocket.disconnect();
      return;
    }

    chatSocket.connect(token);

    const onMessageNew = (payload: {
      conversationId: string;
      message: ChatMessage;
    }) => {
      /**
       * Appended to `pages[0]`, not to a flat list.
       *
       * `useMessages` is an infinite query, so its cached value is
       * `{ pages, pageParams }` and `pages[0]` is the *newest* page — the one the
       * user is looking at. Writing `{ items }` here, which is what an earlier
       * version of this hook did, leaves the live message invisible: it lands in
       * an object React Query never reads, while the thread looks frozen until
       * something else triggers a refetch.
       *
       * Deduplicated by server id because the sender receives this broadcast for
       * its own message *and* the ack returns the same row, so the same message
       * arrives twice by design.
       */
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        queryKeys.chat.messages(payload.conversationId),
        (existing) => {
          const [newest, ...older] = existing?.pages ?? [];
          if (!newest) return existing;
          if (newest.items.some((m) => m.id === payload.message.id)) return existing;

          return {
            pages: [{ ...newest, items: [...newest.items, payload.message] }, ...older],
            pageParams: existing!.pageParams,
          };
        },
      );

      /**
       * The inbox row moved too: preview, timestamp, unread badge.
       *
       * The targeted invalidations are for the thread just updated — an
       * invalidation by prefix key would also refetch every other thread's history,
       * which is the expensive query in this feature.
       */
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.detail(payload.conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.listAll() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.count() });
    };

    /**
     * Sent to every thread of this user's own rooms, so it fires for messages in
     * threads that are *not* open — that is the point of it, it is what keeps the
     * inbox's preview and badge live.
     *
     * Only the inbox and the count are invalidated. History is deliberately not
     * touched: this event means "some thread has new activity", and refetching
     * every thread's messages on it would pull every page of every conversation
     * over the network the moment anybody sent anything.
     */
    const onConversationTouched = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.listAll() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.count() });
    };

    const onConversationUpdated = (payload: { conversationId: string }) => {
      // The roster changed (a tenancy started or ended). Only this thread's detail
      // and the inbox, which lists participants, are affected.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.detail(payload.conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.listAll() });
    };

    const offs = [
      chatSocket.on('message:new', onMessageNew),
      chatSocket.on('conversation:touched', onConversationTouched),
      chatSocket.on('conversation:updated', onConversationUpdated),
    ];

    /**
     * On the way back up, everything this device missed is refetched.
     *
     * Messages sent while the socket was down were never pushed here, and the
     * server has no queue to replay them from — so without a refetch the thread
     * silently ends at the last message received before the outage.
     *
     * Scoped to `false → true` so the first connect of a session does not
     * duplicate the fetches the mounting queries are already making.
     */
    let wasReady = chatSocket.isReady();
    const offStatus = chatSocket.onStatusChange((ready) => {
      const reconnected = ready && !wasReady;
      wasReady = ready;
      setConnected(ready);

      if (reconnected) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
      }
    });

    return () => {
      for (const off of offs) off();
      offStatus();
    };
  }, [token, queryClient]);

  const markRead = useCallback(
    (conversationId: string) => {
      /**
       * Applied locally first.
       *
       * A badge should not wait on a round trip the user reads as lag, and the
       * server's cursor only ever moves forward, so clearing it optimistically
       * cannot hide a message that was already seen.
       *
       * Narrowed to the inbox pages, the detail and the count. A blanket
       * `setQueriesData` over the `chat` prefix would also rewrite every cached
       * message page, stamping an `unreadCount` field onto objects that do not
       * have one — harmless today, silently corrupting the moment a page gains a
       * different shape.
       */
      queryClient.setQueriesData<InfiniteData<ConversationPage>>(
        { queryKey: queryKeys.chat.listAll() },
        (existing) =>
          existing && {
            ...existing,
            pages: existing.pages.map((page) => ({
              ...page,
              items: page.items.map((c) =>
                c.id === conversationId ? { ...c, unreadCount: 0 } : c,
              ),
            })),
          },
      );
      queryClient.setQueryData<ConversationSummary>(
        queryKeys.chat.detail(conversationId),
        (existing) => (existing ? { ...existing, unreadCount: 0 } : existing),
      );
      // Decremented rather than zeroed: one thread becoming read says nothing
      // about the others, and zeroing would clear the badge for unread threads the
      // person has not opened.
      queryClient.setQueryData<ConversationCount>(
        queryKeys.chat.count(),
        (existing) => existing && { unread: Math.max(0, existing.unread - 1) },
      );

      // Over the socket when connected, HTTP otherwise. Both move the same cursor,
      // so a dropped connection does not strand the badge.
      if (chatSocket.canSend()) {
        void chatSocket.emitWithAck<
          { conversationId: string },
          ChatAck<{ conversationId: string; lastReadAt: string }>
        >('message:read', { conversationId });
      } else {
        void conversationsApi.markRead(conversationId).catch(() => {
          // Nothing actionable: the badge is already clear on screen, and the next
          // inbox fetch restores whatever the server actually believes.
        });
      }
    },
    [queryClient],
  );

  const subscribe = useCallback((conversationId: string) => {
    if (!chatSocket.canSend()) return;
    void chatSocket.emitWithAck<{ conversationId: string }, ChatAck<unknown>>(
      'conversation:subscribe',
      { conversationId },
    );
  }, []);

  const unsubscribe = useCallback((conversationId: string) => {
    if (!chatSocket.canSend()) return;
    void chatSocket.emitWithAck<{ conversationId: string }, ChatAck<unknown>>(
      'conversation:unsubscribe',
      { conversationId },
    );
  }, []);

  const setTyping = useCallback((conversationId: string, typing: boolean) => {
    if (!chatSocket.canSend()) return;
    void chatSocket.emitWithAck<
      { conversationId: string; typing: boolean },
      ChatAck<{ conversationId: string }>
    >('typing:state', { conversationId, typing });
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string): Promise<SendAck> => {
      const trimmed = content.trim();

      if (!trimmed) {
        return { ok: false, code: 400, message: 'Message cannot be empty' };
      }
      if (trimmed.length > MESSAGE_LIMITS.maxLength) {
        return {
          ok: false,
          code: 400,
          message: `Messages are limited to ${MESSAGE_LIMITS.maxLength} characters`,
        };
      }

      // Checked *before* emitting. A Socket.IO ack callback is never invoked once
      // the transport is down, so an offline send would sit unresolved until it
      // timed out — which reads as a slow network, not as "offline".
      if (!chatSocket.canSend()) return OFFLINE_ACK;

      return chatSocket.emitWithAck<
        { conversationId: string; clientId: string; content: string },
        SendAck
      >('message:send', {
        conversationId,
        clientId: newClientId(),
        content: trimmed,
      });
    },
    [],
  );

  const value = useMemo<ChatActions>(
    () => ({ connected, sendMessage, markRead, subscribe, unsubscribe, setTyping }),
    [connected, sendMessage, markRead, subscribe, unsubscribe, setTyping],
  );

  return (
    <ChatActionsContext.Provider value={value}>{children}</ChatActionsContext.Provider>
  );
}

/**
 * The chat actions, or throws if used outside the provider.
 *
 * Throwing rather than returning null: a screen rendered without the provider
 * would silently do nothing on send, which surfaces as "the button is broken" in
 * somebody else's hands rather than as a missing ancestor here.
 */
export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) {
    throw new Error('useChatActions must be used inside <ChatProvider>');
  }
  return actions;
}