import { ComingSoonScreen } from '@/components/tenant/coming-soon';
import { MessageSquare } from 'lucide-react-native';

export default function MessagesScreen() {
  return (
    <ComingSoonScreen
      title="Messages"
      subtitle="Direct chat with property managers and caretakers for immediate assistance."
      icon={MessageSquare}
    />
  );
}
