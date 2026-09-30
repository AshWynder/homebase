import { useLocalSearchParams } from 'expo-router';

import { ActivityDetail } from '@/components/owner/activity-detail';

export default function ChatsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ActivityDetail kind="chats" id={id} title="Chats" />;
}
