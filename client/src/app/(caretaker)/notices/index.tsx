import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Megaphone } from 'lucide-react-native';

import {
  AudienceBadge,
  noticeScopeLabel,
  ReadProgress,
} from '@/components/notice/notice-parts';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { ScreenHeader } from '@/components/owner/screen-header';
import { flattenNoticePages, useSentNotices } from '@/hooks/queries/use-notices';
import { useDeferredChange } from '@/hooks/use-deferred-change';
import { formatDateLong } from '@/lib/format';
import { runRefresh } from '@/lib/refresh';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/use-store';
import type { NoticeAudience, SentNotice } from '@/api/types';

type AudienceFilter = NoticeAudience | 'ALL';

const AUDIENCE_FILTERS: readonly { key: AudienceFilter; label: string }[] = [
  { key: 'ALL', label: 'Everything' },
  { key: 'ALL_PROPERTIES', label: 'All properties' },
  { key: 'PROPERTY', label: 'One property' },
  { key: 'TENANT', label: 'One tenant' },
];

export default function CaretakerNoticesScreen() {
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const [audience, setAudience] = useState<AudienceFilter>('ALL');
  const onAudienceChange = useDeferredChange(audience, setAudience);

  const filters = useMemo(
    () => ({
      propertyId: selectedPropertyId ?? undefined,
      audience: audience === 'ALL' ? undefined : audience,
    }),
    [selectedPropertyId, audience],
  );

  const noticesQuery = useSentNotices(filters);
  const items = useMemo(
    () => flattenNoticePages(noticesQuery.data?.pages),
    [noticesQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    () => runRefresh([noticesQuery.refetch()], setRefreshing),
    [noticesQuery],
  );

  const isFirstLoad = noticesQuery.isPending && !noticesQuery.data;
  const isEmpty = !isFirstLoad && items.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScreenHeader title="Announcements" showBack />

      <View className="bg-background">
        <PropertyFilterBar />
        <View className="flex-row flex-wrap gap-2 px-4 pb-3">
          {AUDIENCE_FILTERS.map((filter) => {
            const active = audience === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => onAudienceChange(filter.key)}
                className={cn(
                  'rounded-full px-3 py-1.5',
                  active ? 'bg-primary' : 'bg-muted',
                )}
                accessibilityRole="button"
                accessibilityLabel={filter.label}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isFirstLoad ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="hsl(var(--primary))" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName={cn('px-4 pb-8', isEmpty ? 'flex-1' : 'gap-3')}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 px-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon as={Megaphone} size={22} className="text-muted-foreground" />
              </View>
              <Text className="text-base font-bold text-foreground">No announcements yet</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Announcements will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => <NoticeRow notice={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function NoticeRow({ notice }: { notice: SentNotice }) {
  return (
    <Pressable
      onPress={() => router.push(`/(caretaker)/notices/${notice.id}` as any)}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-accent"
      accessibilityRole="button"
      accessibilityLabel={notice.title}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <Icon as={Megaphone} size={20} className="text-primary" />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-sm font-bold text-foreground" numberOfLines={1}>
            {notice.title}
          </Text>
          <AudienceBadge audience={notice.audience} />
        </View>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {noticeScopeLabel(notice)}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">{formatDateLong(notice.createdAt)}</Text>
          <ReadProgress readCount={notice.readCount} recipientCount={notice.recipientCount} />
        </View>
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
