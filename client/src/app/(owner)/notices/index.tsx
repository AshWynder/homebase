import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Megaphone, Plus, Send } from 'lucide-react-native';

import {
  AudienceBadge,
  noticeScopeLabel,
  ReadProgress,
} from '@/components/notice/notice-parts';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { ScreenHeader } from '@/components/owner/screen-header';
import { SendNoticeDialog } from '@/components/owner/send-notice-dialog';
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

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  pillActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
  pillInactive: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
});

export default function NoticesListScreen() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('ALL');
  const onAudienceChange = useDeferredChange(audienceFilter, setAudienceFilter);

  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const noticesQuery = useSentNotices({
    ...(audienceFilter !== 'ALL' ? { audience: audienceFilter } : {}),
    ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
  });

  const notices = useMemo(
    () => flattenNoticePages<SentNotice>(noticesQuery.data?.pages),
    [noticesQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    () => runRefresh([noticesQuery.refetch()], setRefreshing),
    [noticesQuery],
  );

  const total = noticesQuery.data?.pages[0]?.total ?? 0;
  const isFirstLoad = noticesQuery.isPending && !noticesQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Notices"
        showBack
        onAdd={() => setComposeOpen(true)}
        addLabel="Send a notice"
      />

      <PropertyFilterBar />

      <View className="border-b border-border bg-background px-5 pb-3">
        <View className="flex-row gap-2">
          {AUDIENCE_FILTERS.map((filter) => {
            const active = audienceFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => onAudienceChange(filter.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className="rounded-full border px-3 py-1.5"
                style={active ? styles.pillActive : styles.pillInactive}>
                <Text
                  className={cn(
                    'text-[11px] font-bold',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-5 pb-[100px] gap-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }
        onEndReached={() => {
          if (noticesQuery.hasNextPage && !noticesQuery.isFetchingNextPage) {
            void noticesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          !isFirstLoad && total > 0 ? (
            <Text className="pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {total} notice{total === 1 ? '' : 's'} sent
            </Text>
          ) : null
        }
        ListEmptyComponent={
          isFirstLoad ? (
            <View className="gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))}
            </View>
          ) : noticesQuery.isError ? (
            <ErrorState
              message={
                noticesQuery.error instanceof Error
                  ? noticesQuery.error.message
                  : 'Check your connection and try again.'
              }
              onRetry={() => noticesQuery.refetch()}
            />
          ) : (
            <EmptyState onSend={() => setComposeOpen(true)} />
          )
        }
        ListFooterComponent={
          noticesQuery.isFetchingNextPage ? (
            <ActivityIndicator className="mt-4" color="#0F766E" />
          ) : noticesQuery.hasNextPage ? (
            <Pressable
              onPress={() => noticesQuery.fetchNextPage()}
              accessibilityRole="button"
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 active:bg-muted">
              <Text className="text-xs font-bold text-primary">Load more</Text>
              <Text className="text-[11px] font-medium text-muted-foreground">
                ({notices.length} of {total})
              </Text>
            </Pressable>
          ) : notices.length > 6 ? (
            <Text className="mt-4 text-center text-[11px] font-medium text-muted-foreground">
              That&apos;s every notice you&apos;ve sent.
            </Text>
          ) : null
        }
        renderItem={({ item }) => <NoticeCard notice={item} />}
      />

      <SendNoticeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        initialPropertyId={selectedPropertyId}
      />
    </SafeAreaView>
  );
}

function NoticeCard({ notice }: { notice: SentNotice }) {
  const readRatio =
    notice.recipientCount === 0
      ? 0
      : Math.round((notice.readCount / notice.recipientCount) * 100);

  return (
    <Pressable
      onPress={() => router.push(`/notices/${notice.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}, ${notice.readCount} of ${notice.recipientCount} read`}
      className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 active:bg-muted">
      <View className="flex-row items-start justify-between gap-3">
        <AudienceBadge audience={notice.audience} />

        <View className="flex-1 items-end">
          <Text className="text-[11px] font-medium text-muted-foreground">
            {formatDateLong(notice.createdAt)}
          </Text>
          {/* The count belongs next to the date rather than in the badge: it is
              the freshness of a notice that matters most when scanning. */}
          <Text className="text-[10px] font-medium text-muted-foreground">
            {notice.recipientCount === 0
              ? 'Nobody reached'
              : `${notice.recipientCount} recipient${notice.recipientCount === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      <View>
        <Text className="text-[15px] font-bold leading-5 text-foreground" numberOfLines={2}>
          {notice.title}
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-muted-foreground" numberOfLines={2}>
          {notice.message}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
        <View className="flex-1 gap-2">
          <ReadProgress
            readCount={notice.readCount}
            recipientCount={notice.recipientCount}
          />
          <Text className="text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
            {noticeScopeLabel(notice, 'owner')}
          </Text>
        </View>

        <View className="items-center gap-1">
          {notice.recipientCount > 0 ? (
            <Text
              className={cn(
                'text-sm font-extrabold',
                readRatio === 100 ? 'text-success' : 'text-foreground',
              )}>
              {readRatio}%
            </Text>
          ) : null}
          <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ onSend }: { onSend: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        <Icon as={Megaphone} size={26} className="text-primary" />
      </View>
      <Text className="text-base font-bold text-foreground">No notices yet</Text>
      <Text className="mt-1 max-w-[280px] text-center text-xs leading-5 text-muted-foreground">
        Send an announcement to your tenants about repairs, water shutdowns, or
        anything else they should not miss.
      </Text>
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 active:bg-primary/90">
        <Icon as={Send} size={14} className="text-primary-foreground" />
        <Text className="text-xs font-bold text-primary-foreground">Send your first notice</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-destructive/20 bg-card p-6">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
        <Icon as={Megaphone} size={22} className="text-destructive" />
      </View>
      <Text className="text-sm font-bold text-foreground">Could not load notices</Text>
      <Text className="mt-1 text-center text-xs leading-5 text-muted-foreground">{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-muted px-4 py-2 active:bg-border">
        <Icon as={Plus} size={13} className="text-muted-foreground" />
        <Text className="text-xs font-bold text-foreground">Try again</Text>
      </Pressable>
    </View>
  );
}
