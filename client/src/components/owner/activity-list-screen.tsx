import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/common/detail-header';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { ListMessage } from '@/components/owner/list-state';
import { activityByKind, type ActivityKind } from '@/lib/activity';

interface ActivityListScreenProps {
  kind: ActivityKind;
}

/**
 * Shared list shell for Maintenance, Notices and Chats.
 *
 * All three are driven by the same property filter and the same empty state;
 * they differ only in copy, so they are one component parameterised by kind
 * instead of three near-identical screens. Phase 2 replaces the empty branch
 * with the query for the matching resource.
 */
export function ActivityListScreen({ kind }: ActivityListScreenProps) {
  const destination = activityByKind(kind);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader title={destination.title} />

      <View className="bg-white px-5 pb-3">
        <PropertyFilterBar />
      </View>

      <ListMessage title={destination.emptyTitle} subtitle={destination.emptyBody} />
    </SafeAreaView>
  );
}
