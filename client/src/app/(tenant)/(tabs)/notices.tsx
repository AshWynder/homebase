import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BellRing, Building2, CheckCheck, Megaphone } from 'lucide-react-native';

import {
  AudienceBadge,
  noticeScopeLabel,
  UnreadDot,
} from '@/components/notice/notice-parts';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  flattenNoticePages,
  useReceivedNotices,
  useUnreadNoticeCount,
} from '@/hooks/queries/use-notices';
import { formatDateLong } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReceivedNotice } from '@/api/types';

type Filter = 'all' | 'unread';

export default function NoticesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const unreadOnly = filter === 'unread';

  const noticesQuery = useReceivedNotices(unreadOnly);
  const unreadCount = useUnreadNoticeCount();

  const notices = useMemo(
    () => flattenNoticePages<ReceivedNotice>(noticesQuery.data?.pages),
    [noticesQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await noticesQuery.refetch();
      // Pulled alongside the list: the badge is the number the tenant is about to
      // act on, and a pull-to-refresh that left it stale would be a small lie.
      await unreadCount.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [noticesQuery, unreadCount]);

  const total = noticesQuery.data?.pages[0]?.total ?? 0;
  const unread = unreadCount.data ?? 0;
  const isFirstLoad = noticesQuery.isPending && !noticesQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <View className="flex-1">
            <Text className="text-2xl font-extrabold tracking-tight text-slate-900">
              Notices
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {unread > 0
                ? `${unread} notice${unread === 1 ? '' : 's'} you haven’t read`
                : 'You’re all caught up'}
            </Text>
          </View>

          {unread > 0 ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5">
              <Icon as={BellRing} size={13} className="text-amber-700" />
              <Text className="text-[11px] font-bold text-amber-800">{unread} new</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5">
              <Icon as={CheckCheck} size={13} className="text-emerald-700" />
              <Text className="text-[11px] font-bold text-emerald-800">All read</Text>
            </View>
          )}
        </View>

        {/* Filters */}
        <View className="px-6 pt-4">
          <View className="flex-row items-center rounded-2xl bg-slate-200/70 p-1">
            {(['all', 'unread'] as const).map((key) => {
              const active = filter === key;

              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={cn(
                    'flex-1 items-center rounded-xl py-2',
                    active ? 'bg-white shadow-sm' : '',
                  )}>
                  <Text
                    className={cn(
                      'text-[11px] font-bold',
                      active ? 'text-teal-900' : 'text-slate-600',
                    )}>
                    {key === 'all' ? 'All notices' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* List */}
        <View className="px-6 pt-5">
          {isFirstLoad ? (
            <View className="gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </View>
          ) : noticesQuery.isError ? (
            <View className="items-center rounded-2xl border border-dashed border-rose-200 bg-white p-6">
              <Text className="text-sm font-bold text-slate-800">
                Could not load notices
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-600">
                {noticesQuery.error instanceof Error
                  ? noticesQuery.error.message
                  : 'Check your connection and try again.'}
              </Text>
              <Pressable
                onPress={() => noticesQuery.refetch()}
                accessibilityRole="button"
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 active:bg-slate-200">
                <Text className="text-xs font-bold text-slate-700">Try again</Text>
              </Pressable>
            </View>
          ) : notices.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
                <Icon
                  as={unreadOnly ? CheckCheck : Megaphone}
                  size={26}
                  className="text-teal-600"
                />
              </View>
              <Text className="text-base font-bold text-slate-900">
                {unreadOnly ? 'Nothing unread' : 'No notices yet'}
              </Text>
              <Text className="mt-1 max-w-[270px] text-center text-xs leading-5 text-slate-600">
                {unreadOnly
                  ? 'You’ve read everything your landlord has sent you.'
                  : 'Announcements about repairs, utilities and your building will show up here.'}
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-3">
                {notices.map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} />
                ))}
              </View>

              {noticesQuery.hasNextPage ? (
                <Pressable
                  onPress={() => noticesQuery.fetchNextPage()}
                  disabled={noticesQuery.isFetchingNextPage}
                  accessibilityRole="button"
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 active:bg-slate-50">
                  {noticesQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#0F766E" />
                  ) : (
                    <>
                      <Text className="text-xs font-bold text-teal-800">Load more</Text>
                      <Text className="text-[11px] font-medium text-slate-400">
                        ({notices.length} of {total})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : notices.length > 6 ? (
                <Text className="mt-4 text-center text-[11px] font-medium text-slate-400">
                  That&apos;s everything.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NoticeCard({ notice }: { notice: ReceivedNotice }) {
  return (
    <Pressable
      onPress={() => router.push(`/(tenant)/notices/${notice.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}${notice.isRead ? '' : ', unread'}`}
      // Unread rows carry the weight: a left rail plus a bolder title reads
      // "this one is waiting for you" without needing a badge on every card.
      className={cn(
        'flex-row rounded-2xl border bg-white p-4 shadow-sm shadow-slate-100 active:bg-slate-50',
        notice.isRead ? 'border-slate-200' : 'border-teal-200',
      )}>
      {notice.isRead ? (
        <View className="w-1" />
      ) : (
        <View className="w-1 rounded-full bg-teal-600" />
      )}

      <View className="ml-3 flex-1 gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <AudienceBadge audience={notice.audience} />
          <Text className="text-[11px] font-medium text-slate-500">
            {formatDateLong(notice.createdAt)}
          </Text>
        </View>

        <Text
          className={cn(
            'text-[15px] leading-5',
            notice.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900',
          )}
          numberOfLines={2}>
          {notice.title}
        </Text>

        <Text className="text-[13px] leading-5 text-slate-500" numberOfLines={2}>
          {notice.message}
        </Text>

        <View className="mt-0.5 flex-row items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <Icon as={Building2} size={12} className="text-slate-400" />
          <Text className="flex-1 text-[11px] font-medium text-slate-500" numberOfLines={1}>
            {noticeScopeLabel(notice, 'tenant')}
          </Text>
          {!notice.isRead ? <UnreadDot /> : null}
        </View>
      </View>
    </Pressable>
  );
}