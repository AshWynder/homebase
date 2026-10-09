import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  Bubble,
  GiftedChat,
  Message,
  MessageText,
  type IMessage,
} from 'react-native-gifted-chat';
import {
  ChevronDown,
  MessageSquare,
  Send,
  TriangleAlert,
  WifiOff,
} from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useConversation, useMessages } from '@/hooks/queries/use-chat';
import { useStore } from '@/stores/use-store';
import { chatSocket } from '@/lib/socket';
import type { ChatMessageWithState } from '@/api/types';
import { MESSAGE_LIMITS, useChatActions } from './chat-provider';

/**
 * `IMessage` plus where a send got to.
 *
 * Gifted Chat's own `sent`/`pending` flags only ever drove its ticks, which
 * this thread doesn't show; "failed" has no library concept either — the retry
 * pill under the bubble reads `state`.
 */
type ThreadMessage = IMessage & { state: ChatMessageWithState['state'] };

/** How often a *continuing* typing signal is refreshed, so a long streak stays alive. */
const TYPING_REFRESH_MS = 3_000;

/**
 * A peer's typing state expires without a stop signal.
 *
 * "Stopped typing" is the message most likely to be lost — the socket drops,
 * the app is killed, the sender backgrounds mid-sentence — and a dots indicator
 * that never clears reads as a broken feature rather than a lost packet.
 */
const TYPING_EXPIRY_MS = 4_000;

/**
 * One conversation: history, live delivery, and the composer.
 *
 * Gifted Chat owns the list, the bubbles, and the composer (inverted — newest
 * at index 0 — so history is mapped newest-first); the behaviours around it are
 * deliberate rather than obvious:
 *
 *  - Subscribes on mount and releases the room on unmount. The *socket* is shared
 *    app-wide; room membership is per-thread, so it is owned here.
 *  - Marks read on open. A thread somebody is looking at is not unread, and a
 *    "mark as read" button would leave the badge wrong the whole time.
 *  - Keeps unacknowledged messages in local state rather than the query cache. A
 *    failed send is the only copy of that text; dropping it on a refetch would
 *    lose what somebody typed.
 */
export function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id ?? '');

  const insets = useSafeAreaInsets();
  const profileId = useStore((s) => s.profile?.id);
  const { connected, sendMessage, markRead, subscribe, unsubscribe, setTyping } =
    useChatActions();

  const conversationQuery = useConversation(conversationId);
  const historyQuery = useMessages(conversationId);
  const conversation = conversationQuery.data;

  /** Sender labels are a group affordance — a DM already says who it is. */
  const isGroup = conversation?.type === 'GROUP';

  /** Sends not yet confirmed by the server. */
  const [pending, setPending] = useState<ChatMessageWithState[]>([]);
  const [draft, setDraft] = useState('');

  /** Peers currently typing, by profile id. Feeds Gifted Chat's indicator. */
  const [typers, setTypers] = useState<Record<string, string>>({});
  const typerTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /** Whether this device has an un-retracted "I am typing" on the wire. */
  const typingOn = useRef(false);
  const lastTypingAt = useRef(0);

  /**
   * Height of everything above the thread: header plus offline banner.
   *
   * Gifted Chat's keyboard avoidance measures its own container as if it began
   * at the top of the screen, so the offset between the two — what sits above —
   * has to be handed to it explicitly or the composer stops short of the
   * keyboard by the header's height.
   */
  const [topBlock, setTopBlock] = useState(0);

  // Subscribing on connect as well as on mount: the thread is usually opened while
  // the socket is still connecting, and a subscribe emitted then is dropped.
  useEffect(() => {
    if (!conversationId || !connected) return;

    subscribe(conversationId);
    return () => unsubscribe(conversationId);
  }, [conversationId, connected, subscribe, unsubscribe]);

  /**
   * Read receipts, keyed on how far this device has read rather than on a flag.
   *
   * Keyed on `lastMessageAt` because "open the thread" is only half of it — a
   * message arriving while somebody is reading the thread is also read, and a
   * one-shot on mount leaves the badge sitting there for messages that are
   * literally on screen.
   *
   * A ref, not a dependency, because `markRead` invalidates the conversation key:
   * depending on the query object would re-fire this on every refetch. Comparing
   * against the timestamp makes the second pass a no-op instead.
   */
  const markedThrough = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationId || !conversation) return;

    const newest = conversation.lastMessageAt ?? null;
    if (!newest || markedThrough.current === newest) return;

    markedThrough.current = newest;
    markRead(conversationId);
  }, [conversation, conversationId, markRead]);

  /**
   * Records or retracts a peer's typing state, refreshing the peer's expiry.
   *
   * Refreshed on every signal rather than started once: a peer who keeps typing
   * must keep proving it, and the timer that clears them is restarted here so
   * the last signal before a dropped connection still expires on its own.
   */
  const noteTyping = useCallback((peerId: string, name: string, typing: boolean) => {
    const timers = typerTimers.current;
    const pending = timers.get(peerId);
    if (pending) {
      clearTimeout(pending);
      timers.delete(peerId);
    }

    const drop = () =>
      setTypers((current) => {
        if (!(peerId in current)) return current;
        const next = { ...current };
        delete next[peerId];
        return next;
      });

    if (!typing) {
      drop();
      return;
    }

    setTypers((current) => (current[peerId] === name ? current : { ...current, [peerId]: name }));

    timers.set(
      peerId,
      setTimeout(() => {
        typerTimers.current.delete(peerId);
        drop();
      }, TYPING_EXPIRY_MS),
    );
  }, []);

  /**
   * Says whether *this* person is typing, throttled to a refresh cadence.
   *
   * The first keystroke goes out immediately; the next only after the interval,
   * so a long streak stays visible without a packet per key. Stops are never
   * throttled — an early retraction only ever helps — and an unretracted state
   * is tracked in a ref rather than state so a re-render cannot send twice.
   */
  const signalTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId) return;

      if (typing) {
        const now = Date.now();
        if (typingOn.current && now - lastTypingAt.current < TYPING_REFRESH_MS) return;
        typingOn.current = true;
        lastTypingAt.current = now;
      } else {
        if (!typingOn.current) return;
        typingOn.current = false;
        lastTypingAt.current = 0;
      }

      setTyping(conversationId, typing);
    },
    [conversationId, setTyping],
  );

  const handleChangeText = useCallback(
    (next: string) => {
      setDraft(next);
      // Empty text stops the signal — and Gifted Chat's own composer reset after
      // a send runs through this same handler, so sending retracts typing too.
      signalTyping(next.trim().length > 0);
    },
    [signalTyping],
  );

  // The other side's state arrives over the same shared socket as messages, so
  // it is subscribed here rather than in the provider: only this thread has
  // anywhere to show it, and unmount takes the listener with it.
  useEffect(() => {
    const off = chatSocket.on<{
      conversationId: string;
      profileId: string;
      name: string;
      typing: boolean;
    }>('typing:state', (payload) => {
      if (payload.conversationId !== conversationId) return;
      // The sender's own other devices receive this too — same room, different
      // socket — and "you are typing" is not a status worth rendering.
      if (payload.profileId === profileId) return;
      noteTyping(payload.profileId, payload.name, payload.typing);
    });
    return off;
  }, [conversationId, noteTyping, profileId]);

  // Retract on the way out: a thread unmounted mid-sentence would otherwise
  // leave "typing" showing on the other side until its expiry.
  useEffect(() => () => signalTyping(false), [signalTyping]);

  // Backgrounding does not blur the composer, so the stop has to come from here.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') signalTyping(false);
    });
    return () => subscription.remove();
  }, [signalTyping]);

  // Expiry timers must not outlive the screen — a pending one would call
  // setState on an unmounted tree.
  useEffect(() => {
    const timers = typerTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const chatUser = useMemo(() => ({ _id: profileId ?? 'me', name: 'You' }), [profileId]);

  const messages = useMemo<ThreadMessage[]>(() => {
    const toMessage = (row: ChatMessageWithState): ThreadMessage => ({
      _id: row.id,
      text: row.content,
      createdAt: new Date(row.createdAt),
      user: { _id: row.sender.id, name: row.sender.name },
      state: row.state,
    });

    // Pages arrive newest-page-first, but each page's items run oldest → newest
    // *within* the page. Reversing inside the page — not the whole concatenation —
    // is what yields one newest-first list: a whole-list reverse would leave the
    // chunks interleaved, which is exactly the order the old non-inverted list
    // got wrong past the first 30 messages.
    const history = (historyQuery.data?.pages ?? []).flatMap((page) =>
      [...page.items].reverse().map((message) => toMessage({ ...message, state: 'sent' })),
    );
    const unsent = [...pending].reverse().map(toMessage);

    return [...unsent, ...history];
  }, [historyQuery.data, pending]);

  /**
   * One send: optimistic row in, acknowledgement back, and the row either
   * disappears into the refetched history or is stamped failed.
   *
   * The composer is not touched here — Gifted Chat clears it itself when the
   * send button fires, and clearing it twice would race the draft the next
   * keystroke sets.
   */
  const deliver = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !conversationId) return;

      const optimistic: ChatMessageWithState = {
        id: `pending-${newClientIdLocal()}`,
        conversationId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        // `role` is not on the optimistic row's meaning yet — nothing reads it
        // before the server's copy replaces this one.
        sender: { id: profileId ?? 'me', name: 'You', role: 'TENANT' },
        state: 'sending',
      };

      setPending((current) => [...current, optimistic]);

      const ack = await sendMessage(conversationId, trimmed);

      if (ack.ok) {
        // The row is in the server's history now, so the local copy has done its
        // job and the refetch is what puts the canonical version on screen.
        setPending((current) => current.filter((m) => m.id !== optimistic.id));
        void historyQuery.refetch();
      } else {
        setPending((current) =>
          current.map((m) => (m.id === optimistic.id ? { ...m, state: 'failed' } : m)),
        );
      }
    },
    [conversationId, historyQuery, profileId, sendMessage],
  );

  const handleSend = useCallback(
    (incoming: ThreadMessage[]) => {
      const content = incoming[0]?.text ?? '';
      if (content.trim()) void deliver(content);
    },
    [deliver],
  );

  /**
   * A failed send goes back through the composer rather than being re-emitted
   * silently: the text is what survived, and the draft lets it be edited first.
   */
  const retry = useCallback((message: ThreadMessage) => {
    setPending((current) => current.filter((m) => m.id !== message._id));
    setDraft(message.text);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <View onLayout={(event) => setTopBlock(event.nativeEvent.layout.height)}>
        <DetailHeader
          title={conversation?.name ?? 'Chat'}
          subtitle={
            conversation?.type === 'GROUP'
              ? `${conversation.participants.length} members`
              : undefined
          }
        />

        {!connected ? (
          <View className="flex-row items-center gap-2 bg-amber-50 px-4 py-2">
            <Icon as={WifiOff} size={13} className="text-amber-700" />
            <Text className="text-[11px] font-semibold text-amber-800">
              Offline — messages will not send until you reconnect.
            </Text>
          </View>
        ) : null}
      </View>

      <GiftedChat<ThreadMessage>
        messages={messages}
        user={chatUser}
        onSend={handleSend}
        // Controlled: the draft lives here so `retry` can put failed text back
        // in the composer, and so the library's own reset clears one source.
        text={draft}
        textInputProps={{
          onChangeText: handleChangeText,
          onBlur: () => signalTyping(false),
          placeholder: 'Message',
          maxLength: MESSAGE_LIMITS.maxLength,
        }}
        isTyping={Object.keys(typers).length > 0}
        keyboardAvoidingViewProps={{ keyboardVerticalOffset: insets.top + topBlock }}
        maxComposerHeight={112}
        loadEarlierMessagesProps={{
          isAvailable: historyQuery.hasNextPage,
          isLoading: historyQuery.isFetchingNextPage,
          isInfiniteScrollEnabled: true,
          onPress: () => {
            if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
              void historyQuery.fetchNextPage();
            }
          },
        }}
        isScrollToBottomEnabled
        scrollToBottomComponent={() => (
          <Icon as={ChevronDown} size={20} className="text-slate-600" />
        )}
        // Avatars were never part of this thread's design; passing null removes
        // the avatar component and its grouping indentation completely.
        renderAvatar={null}
        listProps={{
          // GiftedChat's `renderChatEmpty` wrapper returns its content bare, so the
          // counter-flip RN injects into `ListEmptyComponent` — to undo the inverted
          // list's own transform — never reaches it and the hint rendered upside
          // down. Handing the element over here lets RN apply that flip itself.
          ListEmptyComponent: historyQuery.isPending ? (
            <View className="h-48" />
          ) : (
            <View className="h-48 items-center justify-center gap-2">
              <Icon as={MessageSquare} size={26} className="text-slate-300" />
              <Text className="text-sm text-slate-500">No messages yet. Say hello.</Text>
            </View>
          ),
          // The library sizes the content container to its contents, leaving the
          // cell nothing to centre within. Growing it — only while the thread is
          // empty, so a short history still rests against the composer — puts the
          // hint mid-message-area.
          contentContainerStyle:
            messages.length > 0
              ? { paddingBottom: 10 }
              : { flexGrow: 1, justifyContent: 'center', paddingBottom: 10 },
        }}
        renderBubble={(props) => {
          // In an inverted list `previousMessage` is the older neighbour, so
          // "differs from the one above" marks the first message of a run —
          // the only spot a sender label earns its space.
          const showName =
            isGroup &&
            props.position === 'left' &&
            props.previousMessage?.user?._id !== props.currentMessage.user._id &&
            !!props.currentMessage.user.name;

          return (
            <Bubble
              {...props}
              wrapperStyle={{
                left: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1 },
                right: {
                  backgroundColor: '#115E59',
                  opacity: props.currentMessage.state === 'sending' ? 0.6 : 1,
                },
              }}
              // Ticks say nothing this thread needs; a failed send is flagged
              // by the retry pill instead.
              renderTicks={() => null}
              renderMessageText={(textProps) => (
                <View>
                  {showName ? (
                    <Text className="mt-1.5 px-2.5 text-[10px] font-semibold text-slate-500">
                      {props.currentMessage.user.name}
                    </Text>
                  ) : null}
                  <MessageText {...textProps} />
                </View>
              )}
            />
          );
        }}
        renderMessage={(props) => (
          <View>
            {/* The library's 8px leaves bubbles hard against the screen. */}
            <Message
              {...props}
              containerStyle={{ left: { marginLeft: 16 }, right: { marginRight: 16 } }}
            />

            {props.currentMessage.state === 'failed' ? (
              <View className="items-end">
                <Pressable
                  onPress={() => retry(props.currentMessage)}
                  accessibilityRole="button"
                  className="mt-1 flex-row items-center gap-1 rounded-lg bg-red-50 px-2 py-1">
                  <Icon as={TriangleAlert} size={11} className="text-red-600" />
                  <Text className="text-[10px] font-semibold text-red-700">
                    Not sent — tap to retry
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
        renderSend={(props) => {
          const canSend = !!props.text?.trim();
          return (
            <Pressable
              onPress={() => {
                if (canSend) props.onSend?.({ text: props.text?.trim() }, true);
              }}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className={
                canSend ? 'rounded-full bg-teal-800 p-3' : 'rounded-full bg-slate-200 p-3'
              }>
              <Icon
                as={Send}
                size={16}
                className={canSend ? 'text-white' : 'text-slate-400'}
              />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

/** Local-only id for an optimistic row; never sent to the server. */
function newClientIdLocal(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
