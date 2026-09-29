import { ComingSoonScreen } from '@/components/tenant/coming-soon';
import { Wrench } from 'lucide-react-native';

export default function MaintenanceScreen() {
  return (
    <ComingSoonScreen
      title="Maintenance"
      subtitle="Request repairs, report unit issues, and track contractor progress right from your phone."
      icon={Wrench}
    />
  );
}
