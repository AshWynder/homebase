import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { runRefresh } from '@/lib/refresh';
import { cn } from '@/lib/utils';
import { useDeferredChange } from '@/hooks/use-deferred-change';
import type { ReceivedNotice } from '@/api/types';

type Filter = 'all' | 'unread';

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so an inline literal (or a conditional className) re-dispatches from inside
// the render phase and hangs the app on any state change.
const styles = StyleSheet.create({
  activeChip: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default function NoticesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const onFilterChange = useDeferredChange(filter, setFilter);
  const unreadOnly = filter === 'unread';

  const noticesQuery = useReceivedNotices(unreadOnly);
  const unreadCount = useUnreadNoticeCount();

  const notices = useMemo(
    () => flattenNoticePages<ReceivedNotice>(noticesQuery.data?.pages),
    [noticesQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    // Pulled alongside the list: the badge is the number the tenant is about to
    // act on, and a pull-to-refresh that left it stale would be a small lie.
    () => runRefresh([noticesQuery.refetch(), unreadCount.refetch()], setRefreshing),
    [noticesQuery, unreadCount],
  );

  const total = noticesQuery.data?.pages[0]?.total ?? 0;
  const unread = unreadCount.data ?? 0;
  const isFirstLoad = noticesQuery.isPending && !noticesQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-[100px]"
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
            <Text className="text-2xl font-extrabold tracking-tight text-foreground">
              Notices
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {unread > 0
                ? `${unread} notice${unread === 1 ? '' : 's'} you haven’t read`
                : 'You’re all caught up'}
            </Text>
          </View>

          {unread > 0 ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1.5">
              <Icon as={BellRing} size={13} className="text-warning" />
              <Text className="text-[11px] font-bold text-warning">{unread} new</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1.5">
              <Icon as={CheckCheck} size={13} className="text-success" />
              <Text className="text-[11px] font-bold text-success">All read</Text>
            </View>
          )}
        </View>

        {/* Filters */}
        <View className="px-6 pt-4">
          <View className="flex-row items-center rounded-2xl bg-muted p-1">
            {(['all', 'unread'] as const).map((key) => {
              const active = filter === key;

              return (
                <Pressable
                  key={key}
                  onPress={() => onFilterChange(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className="flex-1 items-center rounded-xl py-2"
                  style={active ? styles.activeChip : undefined}>
                  <Text
                    className={cn(
                      'text-[11px] font-bold',
                      active ? 'text-primary' : 'text-muted-foreground',
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
            <View className="items-center rounded-2xl border border-dashed border-destructive/20 bg-card p-6">
              <Text className="text-sm font-bold text-foreground">
                Could not load notices
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground">
                {noticesQuery.error instanceof Error
                  ? noticesQuery.error.message
                  : 'Check your connection and try again.'}
              </Text>
              <Pressable
                onPress={() => noticesQuery.refetch()}
                accessibilityRole="button"
                className="mt-4 rounded-xl bg-muted px-4 py-2 active:bg-border">
                <Text className="text-xs font-bold text-foreground">Try again</Text>
              </Pressable>
            </View>
          ) : notices.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <Icon
                  as={unreadOnly ? CheckCheck : Megaphone}
                  size={26}
                  className="text-primary"
                />
              </View>
              <Text className="text-base font-bold text-foreground">
                {unreadOnly ? 'Nothing unread' : 'No notices yet'}
              </Text>
              <Text className="mt-1 max-w-[270px] text-center text-xs leading-5 text-muted-foreground">
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
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 active:bg-muted">
                  {noticesQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#0F766E" />
                  ) : (
                    <>
                      <Text className="text-xs font-bold text-primary">Load more</Text>
                      <Text className="text-[11px] font-medium text-muted-foreground">
                        ({notices.length} of {total})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : notices.length > 6 ? (
                <Text className="mt-4 text-center text-[11px] font-medium text-muted-foreground">
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
        'flex-row rounded-2xl border bg-card p-4 shadow-sm shadow-black/5 active:bg-muted',
        notice.isRead ? 'border-border' : 'border-primary/20',
      )}>
      {notice.isRead ? (
        <View className="w-1" />
      ) : (
        <View className="w-1 rounded-full bg-primary" />
      )}

      <View className="ml-3 flex-1 gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <AudienceBadge audience={notice.audience} />
          <Text className="text-[11px] font-medium text-muted-foreground">
            {formatDateLong(notice.createdAt)}
          </Text>
        </View>

        <Text
          className={cn(
            'text-[15px] leading-5',
            notice.isRead ? 'font-semibold text-foreground' : 'font-bold text-foreground',
          )}
          numberOfLines={2}>
          {notice.title}
        </Text>

        <Text className="text-[13px] leading-5 text-muted-foreground" numberOfLines={2}>
          {notice.message}
        </Text>

        <View className="mt-0.5 flex-row items-center gap-1.5 border-t border-border pt-2.5">
          <Icon as={Building2} size={12} className="text-muted-foreground" />
          <Text className="flex-1 text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
            {noticeScopeLabel(notice, 'tenant')}
          </Text>
          {!notice.isRead ? <UnreadDot /> : null}
        </View>
      </View>
    </Pressable>
  );
}