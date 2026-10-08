import { ConversationInboxScreen } from '@/components/chat/conversation-inbox-screen';

/**
 * The owner's inbox.
 *
 * `basePath` matches this stack so a row pushes to `/chats/:id`, which resolves
 * here. The component is shared with the tenant stack — the server scopes the
 * list by session, so there is nothing role-specific to branch on.
 */
export default function OwnerChatsScreen() {
  // `['top', 'bottom']` because a stack screen has no tab bar to inset the bottom
  // for, and the FAB would otherwise sit under the navigation bar.
  return <ConversationInboxScreen basePath="/chats" edges={['top', 'bottom']} />;
}
