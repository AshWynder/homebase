import type { Href } from 'expo-router';

import type { UserProfile } from '@/api/types';
import { isCaretakerSession, isTenantSession } from '@/lib/auth-routing';

/**
 * Where a thread lives, per role.
 *
 * The stacks are separate route groups with separate `[id]` routes, so the
 * path depends on who is asking. Derived from the server profile for the same
 * reason `homeRouteFor` is: a role cached on the device is a role that can be
 * stale, and the wrong one sends somebody into a tree they cannot read.
 *
 * Kept next to `auth-routing` rather than inlined at call sites because getting it
 * wrong is silent — the push simply resolves to nothing — and it has to agree
 * with `ConversationInboxScreen`'s `basePath`.
 */
export function chatThreadPath(
  profile: UserProfile | null,
  conversationId: string,
): Href {
  if (isTenantSession(profile)) {
    return `/(tenant)/chats/${conversationId}` as Href;
  }
  if (isCaretakerSession(profile)) {
    return `/(caretaker)/chats/${conversationId}` as Href;
  }
  return `/chats/${conversationId}` as Href;
}
