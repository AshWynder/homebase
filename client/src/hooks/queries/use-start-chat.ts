import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { conversationsApi } from '@/api/chat';
import type { ConversationSummary } from '@/api/types';
import { chatThreadPath } from '@/lib/chat-routing';
import { useStore } from '@/stores/use-store';
import { queryKeys } from './keys';

/**
 * Opening a thread from somewhere other than the inbox.
 *
 * Both endpoints are idempotent — a direct thread is keyed by the profile pair,
 * a group thread by property — so pressing "Message" twice lands in the same
 * thread instead of creating a duplicate. That is what makes this safe to wire to
 * a button without a "has this already been opened?" check behind it.
 *
 * The opened thread is pushed rather than returned for the caller to route,
 * because every caller wants exactly the same thing afterwards: go there. The
 * only decision that differs is who may be messaged, and the server decides that.
 */
export interface StartChatOptions {
  /**
   * Called when the thread could not be opened.
   *
   * Not handled here on purpose. Which failure text fits depends on the screen —
   * a button in a header and a chip in a list row have nowhere in common to put
   * an error — and a toast this hook raised itself would be invisible on any
   * screen that has not rendered a `<Toast>`.
   */
  onError?: (message: string) => void;
}

function useOpenChat(options: StartChatOptions) {
  const queryClient = useQueryClient();
  const profile = useStore((s) => s.profile);

  return async (open: () => Promise<ConversationSummary>) => {
    try {
      const conversation = await open();

      // The thread may now exist for the first time, or have gained activity, and
      // the unread total is about to change either way.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.listAll() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.count() });

      router.push(chatThreadPath(profile, conversation.id));
    } catch (error) {
      options.onError?.(
        error instanceof Error
          ? error.message
          : 'Could not open that conversation.',
      );
    }
  };
}

/** Opens (or finds) the direct thread with one person, then navigates to it. */
export function useStartDirectChat(options: StartChatOptions = {}) {
  const open = useOpenChat(options);
  const mutation = useMutation({
    mutationFn: (profileId: string) => conversationsApi.openDirect(profileId),
  });

  return {
    ...mutation,
    start: (profileId: string) => open(() => mutation.mutateAsync(profileId)),
  };
}

/** Opens (or lazily creates) a property's group thread, then navigates to it. */
export function useStartGroupChat(options: StartChatOptions = {}) {
  const open = useOpenChat(options);
  const mutation = useMutation({
    mutationFn: (propertyId: string) => conversationsApi.openGroup(propertyId),
  });

  return {
    ...mutation,
    start: (propertyId: string) => open(() => mutation.mutateAsync(propertyId)),
  };
}