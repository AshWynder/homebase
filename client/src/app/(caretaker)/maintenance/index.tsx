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
import { Image } from 'expo-image';
import { ChevronRight, Wrench } from 'lucide-react-native';

import { DetailHeader } from '@/components/common/detail-header';
import {
  MaintenanceStatusPill,
  TicketPlaceholderTile,
} from '@/components/tenant/maintenance-status';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  flattenMaintenancePages,
  useMaintenanceStatusCounts,
  useMaintenanceTickets,
} from '@/hooks/queries/use-maintenance';
import { formatDateLong, shortId } from '@/lib/format';
import type { MaintenanceStatus, MaintenanceTicket } from '@/api/types';

type Filter = 'all' | MaintenanceStatus;

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

/**
 * Maintenance queue across the caretaker's properties.
 *
 * The server scopes the list to the caretaker's assignment, so no property
 * filter is needed here — unlike the owner's placeholder ActivityListScreen,
 * this is a working queue: filter pills, live counts, and a row per ticket
 * pushed to the detail screen where status and remarks are updated.
 */
export default function CaretakerMaintenanceScreen() {
  const [filter, setFilter] = useState<Filter>('all');

  const ticketsQuery = useMaintenanceTickets(filter === 'all' ? undefined : filter);
  const counts = useMaintenanceStatusCounts();

  const tickets = useMemo(
    () => flattenMaintenancePages(ticketsQuery.data?.pages),
    [ticketsQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ticketsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [ticketsQuery]);

  const countFor = (key: Filter) => {
    if (key === 'all') return counts.all;
    return counts.byStatus[key];
  };

  const openCount = counts.byStatus.OPEN + counts.byStatus.IN_PROGRESS;
  const isFirstLoad = ticketsQuery.isPending && !ticketsQuery.data;
  const isFilteredEmpty = !isFirstLoad && tickets.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <DetailHeader
        title="Maintenance"
        subtitle={openCount > 0 ? `${openCount} needing attention` : 'All clear'}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {/* Filters */}
        <View className="px-6 pt-4">
          <View className="flex-row items-center rounded-2xl bg-slate-200/70 p-1">
            {FILTERS.map((entry) => {
              const active = filter === entry.key;
              const count = countFor(entry.key);

              return (
                <Pressable
                  key={entry.key}
                  onPress={() => setFilter(entry.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 items-center rounded-xl py-2 ${
                    active ? 'bg-white shadow-sm' : ''
                  }`}>
                  <Text
                    numberOfLines={1}
                    className={`text-[11px] font-bold ${
                      active ? 'text-teal-900' : 'text-slate-600'
                    }`}>
                    {entry.label}
                    {counts.isLoading ? '' : ` (${count})`}
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
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </View>
          ) : ticketsQuery.isError ? (
            <View className="items-center rounded-2xl border border-dashed border-rose-200 bg-white p-6">
              <Text className="text-sm font-bold text-slate-800">
                Could not load tickets
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-600">
                {ticketsQuery.error instanceof Error
                  ? ticketsQuery.error.message
                  : 'Check your connection and try again.'}
              </Text>
              <Pressable
                onPress={() => ticketsQuery.refetch()}
                accessibilityRole="button"
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2">
                <Text className="text-xs font-bold text-slate-700">Try again</Text>
              </Pressable>
            </View>
          ) : isFilteredEmpty ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
                <Icon as={Wrench} size={26} className="text-teal-600" />
              </View>
              <Text className="text-base font-bold text-slate-900">
                {filter === 'all' ? 'No tickets yet' : 'Nothing here'}
              </Text>
              <Text className="mt-1 max-w-[260px] text-center text-xs leading-5 text-slate-600">
                {filter === 'all'
                  ? 'Repairs your tenants report will appear here.'
                  : `You have no ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} tickets.`}
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {filter === 'all'
                  ? 'All tickets'
                  : FILTERS.find((f) => f.key === filter)?.label}
              </Text>

              <View className="gap-3">
                {tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </View>

              {ticketsQuery.hasNextPage ? (
                <Pressable
                  onPress={() => ticketsQuery.fetchNextPage()}
                  disabled={ticketsQuery.isFetchingNextPage}
                  accessibilityRole="button"
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 active:bg-slate-50">
                  {ticketsQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#0F766E" />
                  ) : (
                    <>
                      <Text className="text-xs font-bold text-teal-800">Load more</Text>
                      <Text className="text-[11px] font-medium text-slate-400">
                        ({tickets.length} of {ticketsQuery.data?.pages[0]?.total ?? '—'})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : tickets.length > 6 ? (
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

function TicketCard({ ticket }: { ticket: MaintenanceTicket }) {
  const thumbnail = ticket.photoUrls[0];

  return (
    <Pressable
      onPress={() => router.push(`/(caretaker)/maintenance/${ticket.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ticket, ${ticket.status.replace('_', ' ').toLowerCase()}`}
      className="flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100 active:bg-slate-50">
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={{ width: 72, height: 72 }}
          contentFit="cover"
          transition={200}
          className="rounded-xl"
        />
      ) : (
        <TicketPlaceholderTile size={72} />
      )}

      <View className="flex-1 justify-between py-0.5">
        <View>
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-[13px] leading-5 text-slate-800" numberOfLines={2}>
              {ticket.description}
            </Text>
            <Icon as={ChevronRight} size={16} className="mt-0.5 text-slate-300" />
          </View>

          {ticket.remarks ? (
            <Text className="mt-1 text-[11px] italic leading-4 text-slate-500" numberOfLines={1}>
              {ticket.remarks}
            </Text>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Text className="text-[11px] font-medium text-slate-500">
              {formatDateLong(ticket.createdAt)}
              {ticket.unit?.unitNumber ? ` • Unit ${ticket.unit.unitNumber}` : ''}
            </Text>
            <Text className="text-[10px] font-medium text-slate-400">
              {shortId(ticket.id)}
              {ticket.unit?.property?.name ? ` • ${ticket.unit.property.name}` : ''}
            </Text>
          </View>
          <MaintenanceStatusPill status={ticket.status} />
        </View>
      </View>
    </Pressable>
  );
}
