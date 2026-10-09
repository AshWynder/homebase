import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import {
  METER_TYPE_LABELS,
  MeterRecencyBadge,
} from '@/components/owner/meter-recency-badge';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { formatDate, formatKes, tenantName } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import type { Tenancy, Unit } from '@/api/types';
import { ChevronRight, Clock } from 'lucide-react-native';

interface TenancyListProps {
  isActive?: boolean | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  rowHref?: (tenancy: Tenancy) => Href | null;
  showTerminationDetails?: boolean;
}

/**
 * Tenants segment of the Portfolio tab. The search input only appears here
 * because "find me the tenant called X" is scoped to people, not to the unit
 * cards shown in the Units segment.
 */
export function TenancyList({
  isActive = true,
  emptyTitle,
  emptySubtitle,
  rowHref = (tenancy) => `/tenancy/${tenancy.id}` as Href,
  showTerminationDetails = false,
}: TenancyListProps) {
  const [search, setSearch] = useState('');
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const tenancies = useTenancies({
    ...(isActive !== null ? { isActive } : {}),
    propertyId: selectedPropertyId ?? undefined,
  });

  const query = search.trim().toLowerCase();
  const items = useMemo(() => {
    const all = tenancies.data?.items ?? [];
    if (!query) return all;
    return all.filter((item) => tenantName(item).toLowerCase().includes(query));
  }, [tenancies.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== null;
  const showPropertyName = selectedPropertyId === null;

  return (
    <View className="flex-1">
      <PropertyFilterBar search={search} onSearchChange={setSearch} />

      {tenancies.isLoading ? (
        <ListSkeleton />
      ) : tenancies.isError ? (
        <ListMessage
          title="Couldn't load tenancies"
          subtitle={(tenancies.error as Error).message}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <ListMessage
              title={isFiltered ? 'No tenants found' : (emptyTitle ?? 'No active tenancies')}
              subtitle={
                isFiltered
                  ? 'Try a different search or property filter.'
                  : (emptySubtitle ?? 'Tap the + button to assign a tenant to a unit.')
              }
            />
          }
          renderItem={({ item }) => {
            const href = rowHref(item);

            return (
              <Pressable
                onPress={href ? () => router.push(href) : undefined}
                accessibilityRole={href ? 'button' : undefined}
                className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-slate-900">{tenantName(item)}</Text>
                    <Text className="text-sm text-slate-500">
                      {showPropertyName
                        ? `${item.unit?.property?.name ?? 'Property'} • Unit ${item.unit?.unitNumber ?? '—'}`
                        : `Unit ${item.unit?.unitNumber ?? '—'}`}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Icon as={Clock} size={13} className="text-slate-400" />
                      <Text className="text-xs text-slate-500">Ends: {formatDate(item.endDate)}</Text>
                    </View>
                  </View>
                  <View className="items-end gap-2">
                    <Badge
                      variant="secondary"
                      className={item.isActive ? 'bg-emerald-100' : 'bg-slate-100'}>
                      <Text
                        className={
                          item.isActive
                            ? 'text-[11px] font-semibold text-emerald-800'
                            : 'text-[11px] font-semibold text-slate-600'
                        }>
                        {item.isActive ? 'ACTIVE' : 'ENDED'}
                      </Text>
                    </Badge>
                    {href ? <Icon as={ChevronRight} size={18} className="text-slate-400" /> : null}
                  </View>
                </View>

                <View className="gap-2 border-t border-slate-100 pt-3">
                  <Text className="text-lg font-bold text-slate-900">
                    {formatKes(item.rentAmount)}
                  </Text>
                  {showTerminationDetails && !item.isActive ? (
                    <View className="gap-1 rounded-xl bg-rose-50 p-3">
                      <Text className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                        Move-out notice
                      </Text>
                      <Text className="text-xs font-semibold text-slate-800">
                        {item.terminationReason ?? 'No reason provided'}
                      </Text>
                      {item.terminationNotes ? (
                        <Text className="text-xs leading-5 text-slate-600" numberOfLines={3}>
                          {item.terminationNotes}
                        </Text>
                      ) : null}
                      {item.terminationRequestedAt ? (
                        <Text className="text-[11px] text-slate-500">
                          Submitted {formatDate(item.terminationRequestedAt)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <UnitMeterBadges unit={item.unit} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

/**
 * Reading recency for every meter on the tenant's unit, so an owner scanning
 * the list can see which units' rounds are slipping without opening any of
 * them. Units with no meter show nothing — a tenancy does not imply utilities.
 */
function UnitMeterBadges({ unit }: { unit?: Unit }) {
  const meters = unit?.utilityMeters;
  if (!meters?.length) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {meters.map((meter) => (
        <MeterRecencyBadge
          key={meter.id}
          date={meter.lastReadingAt}
          label={METER_TYPE_LABELS[meter.meterType]}
        />
      ))}
    </View>
  );
}
