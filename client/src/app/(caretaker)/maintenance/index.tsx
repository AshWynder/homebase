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
import { runRefresh } from '@/lib/refresh';
import { useDeferredChange } from '@/hooks/use-deferred-change';

type Filter = 'all' | MaintenanceStatus;

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

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
  thumbnail: { width: 72, height: 72 },
});

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
  const onFilterChange = useDeferredChange(filter, setFilter);

  const ticketsQuery = useMaintenanceTickets(filter === 'all' ? undefined : filter);
  const counts = useMaintenanceStatusCounts();

  const tickets = useMemo(
    () => flattenMaintenancePages(ticketsQuery.data?.pages),
    [ticketsQuery.data?.pages],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(
    () => runRefresh([ticketsQuery.refetch()], setRefreshing),
    [ticketsQuery],
  );

  const countFor = (key: Filter) => {
    if (key === 'all') return counts.all;
    return counts.byStatus[key];
  };

  const openCount = counts.byStatus.OPEN + counts.byStatus.IN_PROGRESS;
  const isFirstLoad = ticketsQuery.isPending && !ticketsQuery.data;
  const isFilteredEmpty = !isFirstLoad && tickets.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <DetailHeader
        title="Maintenance"
        subtitle={openCount > 0 ? `${openCount} needing attention` : 'All clear'}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
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
          <View className="flex-row items-center rounded-2xl bg-muted p-1">
            {FILTERS.map((entry) => {
              const active = filter === entry.key;
              const count = countFor(entry.key);

              return (
                <Pressable
                  key={entry.key}
                  onPress={() => onFilterChange(entry.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className="flex-1 items-center rounded-xl py-2"
                  style={active ? styles.activeChip : undefined}>
                  <Text
                    numberOfLines={1}
                    className={`text-[11px] font-bold ${
                      active ? 'text-primary' : 'text-muted-foreground'
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
            <View className="items-center rounded-2xl border border-dashed border-destructive/20 bg-card p-6">
              <Text className="text-sm font-bold text-foreground">
                Could not load tickets
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground">
                {ticketsQuery.error instanceof Error
                  ? ticketsQuery.error.message
                  : 'Check your connection and try again.'}
              </Text>
              <Pressable
                onPress={() => ticketsQuery.refetch()}
                accessibilityRole="button"
                className="mt-4 rounded-xl bg-muted px-4 py-2">
                <Text className="text-xs font-bold text-foreground">Try again</Text>
              </Pressable>
            </View>
          ) : isFilteredEmpty ? (
            <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <Icon as={Wrench} size={26} className="text-primary" />
              </View>
              <Text className="text-base font-bold text-foreground">
                {filter === 'all' ? 'No tickets yet' : 'Nothing here'}
              </Text>
              <Text className="mt-1 max-w-[260px] text-center text-xs leading-5 text-muted-foreground">
                {filter === 'all'
                  ? 'Repairs your tenants report will appear here.'
                  : `You have no ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} tickets.`}
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
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
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 active:bg-accent">
                  {ticketsQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#0F766E" />
                  ) : (
                    <>
                      <Text className="text-xs font-bold text-primary">Load more</Text>
                      <Text className="text-[11px] font-medium text-muted-foreground">
                        ({tickets.length} of {ticketsQuery.data?.pages[0]?.total ?? '—'})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : tickets.length > 6 ? (
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

function TicketCard({ ticket }: { ticket: MaintenanceTicket }) {
  const thumbnail = ticket.photoUrls[0];

  return (
    <Pressable
      onPress={() => router.push(`/(caretaker)/maintenance/${ticket.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ticket, ${ticket.status.replace('_', ' ').toLowerCase()}`}
      className="flex-row gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm shadow-black/5 active:bg-accent">
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
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
            <Text className="flex-1 text-[13px] leading-5 text-foreground" numberOfLines={2}>
              {ticket.description}
            </Text>
            <Icon as={ChevronRight} size={16} className="mt-0.5 text-slate-300" />
          </View>

          {ticket.remarks ? (
            <Text className="mt-1 text-[11px] italic leading-4 text-muted-foreground" numberOfLines={1}>
              {ticket.remarks}
            </Text>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Text className="text-[11px] font-medium text-muted-foreground">
              {formatDateLong(ticket.createdAt)}
              {ticket.unit?.unitNumber ? ` • Unit ${ticket.unit.unitNumber}` : ''}
            </Text>
            <Text className="text-[10px] font-medium text-muted-foreground">
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
