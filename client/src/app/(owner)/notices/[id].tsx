import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  CalendarClock,
  Megaphone,
  Send,
  Trash2,
} from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import {
  AudienceBadge,
  noticeScopeLabel,
  ReadProgress,
} from '@/components/notice/notice-parts';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteNotice, useNotice } from '@/hooks/queries/use-notices';
import { formatDateTime, shortId } from '@/lib/format';
import { runRefresh } from '@/lib/refresh';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noticeQuery = useNotice(String(id ?? ''));
  const deleteNotice = useDeleteNotice();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    () => runRefresh([noticeQuery.refetch()], setRefreshing),
    [noticeQuery],
  );

  const notice = noticeQuery.data;

  const confirmDelete = () => {
    // A notice cannot be edited or recalled — deleting is the only way to take
    // one back — so it takes a deliberate confirmation rather than a tap.
    Alert.alert(
      'Delete this notice?',
      'Tenants who already opened it will have seen it. This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteNotice.mutate(notice!.id, {
              onSuccess: () => router.back(),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <DetailHeader title="Notice" subtitle={notice ? shortId(notice.id) : undefined} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
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
            <Skeleton className="h-48 w-full rounded-2xl" />
          </View>
        ) : noticeQuery.isError || !notice ? (
          // The server answers 404 for both a deleted notice and someone else's,
          // so this covers "gone" and "not yours" without distinguishing them.
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
              <Icon as={Megaphone} size={28} className="text-muted-foreground" />
            </View>
            <Text className="text-center text-base font-bold text-foreground">
              Notice not found
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-muted-foreground">
              It may have been deleted, or the link may be out of date.
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 active:bg-primary/90">
              <Text className="text-xs font-bold text-primary-foreground">Go back</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4 p-5">
            {/* What it said */}
            <View className="gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
              <AudienceBadge audience={notice.audience} />

              <Text className="text-xl font-extrabold leading-7 tracking-tight text-foreground">
                {notice.title}
              </Text>

              <Text className="text-[15px] leading-6 text-foreground">{notice.message}</Text>
            </View>

            {/* Where it went */}
            <View className="gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <MetaRow
                icon={notice.audience === 'PROPERTY' ? Building2 : Megaphone}
                label="Sent to"
                value={noticeScopeLabel(notice, 'owner')}
              />
              <MetaRow icon={CalendarClock} label="Sent" value={formatDateTime(notice.createdAt)} />
            </View>

            {/* Whether it landed */}
            <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Read receipts
              </Text>
              <ReadProgress
                readCount={notice.readCount}
                recipientCount={notice.recipientCount}
              />
            </View>

            <Pressable
              onPress={confirmDelete}
              disabled={deleteNotice.isPending}
              accessibilityRole="button"
              accessibilityLabel="Delete this notice"
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-card py-3.5 active:bg-destructive/10">
              <Icon as={Trash2} size={16} className="text-destructive" />
              <Text className="text-sm font-bold text-destructive">
                {deleteNotice.isPending ? 'Deleting…' : 'Delete notice'}
              </Text>
            </Pressable>

            <View className="flex-row items-center justify-center gap-1.5">
              <Icon as={Send} size={11} className="text-muted-foreground" />
              <Text className="text-[11px] font-medium text-muted-foreground">
                Notices cannot be edited after sending
              </Text>
            </View>
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
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon as={icon} size={15} className="text-muted-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium text-muted-foreground">{label}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}