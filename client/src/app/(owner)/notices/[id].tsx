import { useLocalSearchParams } from 'expo-router';

import { ActivityDetail } from '@/components/owner/activity-detail';

export default function NoticesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ActivityDetail kind="notices" id={id} title="Notices" />;
}
