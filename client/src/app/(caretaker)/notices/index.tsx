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
import { formatDateLong } from '@/lib/format';
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

/**
 * Notices sent by this caretaker.
 *
 * The server scopes sent-notices to `authorId`, so this shows only what this
 * session sent — no property guard needed beyond the shared filter bar. Delete
 * lives on the detail screen.
 */
export default function CaretakerNoticesScreen() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('ALL');

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
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await noticesQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [noticesQuery]);

  const total = noticesQuery.data?.pages[0]?.total ?? 0;
  const isFirstLoad = noticesQuery.isPending && !noticesQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Notices"
        onAdd={() => setComposeOpen(true)}
        addLabel="Send a notice"
      />

      <PropertyFilterBar />

      <View className="border-b border-slate-200 bg-white px-5 pb-3">
        <View className="flex-row gap-2">
          {AUDIENCE_FILTERS.map((filter) => {
            const active = audienceFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => setAudienceFilter(filter.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={cn(
                  'rounded-full border px-3 py-1.5',
                  active
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 bg-white active:bg-slate-50',
                )}>
                <Text
                  className={cn(
                    'text-[11px] font-bold',
                    active ? 'text-teal-800' : 'text-slate-600',
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
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 12 }}
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
            <Text className="pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 active:bg-slate-50">
              <Text className="text-xs font-bold text-teal-800">Load more</Text>
              <Text className="text-[11px] font-medium text-slate-400">
                ({notices.length} of {total})
              </Text>
            </Pressable>
          ) : notices.length > 6 ? (
            <Text className="mt-4 text-center text-[11px] font-medium text-slate-400">
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
      onPress={() => router.push(`/(caretaker)/notices/${notice.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}, ${notice.readCount} of ${notice.recipientCount} read`}
      className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 active:bg-slate-50">
      <View className="flex-row items-start justify-between gap-3">
        <AudienceBadge audience={notice.audience} />

        <View className="flex-1 items-end">
          <Text className="text-[11px] font-medium text-slate-500">
            {formatDateLong(notice.createdAt)}
          </Text>
          <Text className="text-[10px] font-medium text-slate-400">
            {notice.recipientCount === 0
              ? 'Nobody reached'
              : `${notice.recipientCount} recipient${notice.recipientCount === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      <View>
        <Text className="text-[15px] font-bold leading-5 text-slate-900" numberOfLines={2}>
          {notice.title}
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-slate-500" numberOfLines={2}>
          {notice.message}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <View className="flex-1 gap-2">
          <ReadProgress
            readCount={notice.readCount}
            recipientCount={notice.recipientCount}
          />
          <Text className="text-[11px] font-medium text-slate-500" numberOfLines={1}>
            {noticeScopeLabel(notice, 'caretaker')}
          </Text>
        </View>

        <View className="items-center gap-1">
          {notice.recipientCount > 0 ? (
            <Text
              className={cn(
                'text-sm font-extrabold',
                readRatio === 100 ? 'text-emerald-600' : 'text-slate-700',
              )}>
              {readRatio}%
            </Text>
          ) : null}
          <Icon as={ChevronRight} size={16} className="text-slate-300" />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ onSend }: { onSend: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
        <Icon as={Megaphone} size={26} className="text-teal-600" />
      </View>
      <Text className="text-base font-bold text-slate-900">No notices yet</Text>
      <Text className="mt-1 max-w-[280px] text-center text-xs leading-5 text-slate-600">
        Tell your tenants about repairs, water shutdowns, or anything else they
        should not miss.
      </Text>
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 active:bg-teal-900">
        <Icon as={Send} size={14} className="text-white" />
        <Text className="text-xs font-bold text-white">Send your first notice</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-rose-200 bg-white p-6">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
        <Icon as={Megaphone} size={22} className="text-rose-500" />
      </View>
      <Text className="text-sm font-bold text-slate-800">Could not load notices</Text>
      <Text className="mt-1 text-center text-xs leading-5 text-slate-600">{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 active:bg-slate-200">
        <Icon as={Plus} size={13} className="text-slate-600" />
        <Text className="text-xs font-bold text-slate-700">Try again</Text>
      </Pressable>
    </View>
  );
}
