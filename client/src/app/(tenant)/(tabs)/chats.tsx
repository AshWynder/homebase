import { ConversationInboxScreen } from '@/components/chat/conversation-inbox-screen';

export default function TenantChatsScreen() {
  return <ConversationInboxScreen basePath="/(tenant)/chats" />;
}
