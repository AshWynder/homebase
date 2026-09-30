import { ComingSoonScreen } from '@/components/tenant/coming-soon';
import { MessageSquare } from 'lucide-react-native';

export default function ChatsScreen() {
  return (
    <ComingSoonScreen
      title="Chats"
      subtitle="Direct chat with property managers and caretakers for immediate assistance."
      icon={MessageSquare}
    />
  );
}
