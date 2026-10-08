import { ConversationInboxScreen } from '@/components/chat/conversation-inbox-screen';

/**
 * The caretaker's inbox.
 *
 * `basePath` matches this stack so a row pushes to `/(caretaker)/chats/:id`.
 * The server scopes the conversation list to the session (owner or caretaker
 * of the relevant properties), so there is nothing role-specific to branch on.
 */
export default function CaretakerChatsScreen() {
  return (
    <ConversationInboxScreen basePath="/(caretaker)/chats" edges={['top', 'bottom']} />
  );
}
