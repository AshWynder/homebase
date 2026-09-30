import { useLocalSearchParams } from 'expo-router';

import { ActivityDetail } from '@/components/owner/activity-detail';

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ActivityDetail kind="maintenance" id={id} title="Maintenance" />;
}
