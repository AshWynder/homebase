import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, Building2, CalendarClock, Megaphone, UserRound } from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import { AudienceBadge, noticeScopeLabel } from '@/components/notice/notice-parts';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMarkNoticeRead, useNotice } from '@/hooks/queries/use-notices';
import { formatDateTime, shortId } from '@/lib/format';

export default function TenantNoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noticeId = String(id ?? '');

  const noticeQuery = useNotice(noticeId);
  const markRead = useMarkNoticeRead();

  const notice = noticeQuery.data;

  /**
   * Opening the notice is the read receipt, so the mutation fires from here
   * rather than behind a button. The ref guards the one thing that matters:
   * React re-runs effects whenever `notice` changes identity, and the mark-read
   * response invalidates the detail key — which would otherwise re-trigger this
   * effect on every render.
   */
  const markedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!notice || notice.isRead) return;
    if (markedFor.current === notice.id) return;

    markedFor.current = notice.id;
    markRead.mutate(notice.id);
  }, [notice, markRead]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await noticeQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [noticeQuery]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader title="Notice" subtitle={notice ? shortId(notice.id) : undefined} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {noticeQuery.isPending ? (
          <View className="gap-3 p-5">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </View>
        ) : noticeQuery.isError || !notice ? (
          // The server reports a notice that is not the caller's as 404, so this
          // covers a deleted notice and a stale link with one honest message.
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
              <Icon as={Megaphone} size={28} className="text-slate-400" />
            </View>
            <Text className="text-center text-base font-bold text-slate-800">
              Notice not found
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
              It may have been withdrawn, or the link may be out of date.
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              className="mt-5 rounded-xl bg-teal-800 px-5 py-2.5 active:bg-teal-900">
              <Text className="text-xs font-bold text-white">Go back</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4 p-5">
            <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
              <AudienceBadge audience={notice.audience} />

              <Text className="text-xl font-extrabold leading-7 tracking-tight text-slate-900">
                {notice.title}
              </Text>

              <Text className="text-[15px] leading-6 text-slate-700">{notice.message}</Text>
            </View>

            <View className="gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              <MetaRow
                icon={UserRound}
                label="From"
                value={notice.author.user.name || notice.author.user.email}
              />
              <MetaRow
                icon={notice.audience === 'PROPERTY' ? Building2 : Megaphone}
                label="Applies to"
                value={noticeScopeLabel(notice, 'tenant')}
              />
              <MetaRow icon={CalendarClock} label="Sent" value={formatDateTime(notice.createdAt)} />
            </View>

            {/* Only shown when the mark-read call is still in flight, so a settled
                screen never claims to be doing something it isn't. */}
            {markRead.isPending ? (
              <View className="flex-row items-center justify-center gap-2 py-1">
                <Icon as={BellRing} size={13} className="text-teal-600" />
                <Text className="text-[11px] font-semibold text-teal-700">
                  Marking as read…
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon as={icon} size={15} className="text-slate-600" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium text-slate-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-slate-900">{value}</Text>
      </View>
    </View>
  );
}