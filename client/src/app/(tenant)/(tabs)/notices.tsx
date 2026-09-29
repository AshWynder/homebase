import { ComingSoonScreen } from '@/components/tenant/coming-soon';
import { Megaphone } from 'lucide-react-native';

export default function NoticesScreen() {
  return (
    <ComingSoonScreen
      title="Notices"
      subtitle="Stay informed with official announcements, building updates, and scheduled utility maintenance."
      icon={Megaphone}
    />
  );
}
