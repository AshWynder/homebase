import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/owner/detail-header';
import { ListMessage } from '@/components/owner/list-state';
import { Text } from '@/components/ui/text';
import { activityByKind, type ActivityKind } from '@/lib/activity';

interface ActivityDetailProps {
  kind: ActivityKind;
  id: string;
  title: string;
}

/**
 * Shared detail shell for a Maintenance ticket, a Notice and a Chat.
 *
 * Kept deliberately thin: the header, the title and the placeholder body are
 * identical for all three, so the route files are one-liners and the real
 * per-type body is a drop-in replacement for the `ListMessage` below.
 */
export function ActivityDetail({ kind, id, title }: ActivityDetailProps) {
  const destination = activityByKind(kind);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader title={destination.title} subtitle={title} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <View className="border-b border-slate-200 bg-white px-5 py-4">
          <Text className="text-lg font-bold text-slate-900">{title}</Text>
          <Text className="mt-1 text-xs text-slate-500">Reference {id.slice(0, 8)}</Text>
        </View>

        <ListMessage
          title="Nothing to show yet"
          subtitle={`Details for this ${destination.title.toLowerCase().replace(/s$/, '')} will appear here.`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
