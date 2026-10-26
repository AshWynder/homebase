import { useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Users } from 'lucide-react-native';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PropertyCard } from '@/components/owner/property-card';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { ScreenHeader } from '@/components/owner/screen-header';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useProperties } from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { useStore } from '@/stores/use-store';
import { runRefresh } from '@/lib/refresh';

interface PropertyStats {
  units: number;
  active: number;
  /** Units with an active tenancy, counted once per unit. */
  occupied: number;
}

const EMPTY_STATS: PropertyStats = { units: 0, active: 0, occupied: 0 };

/**
 * Properties tab: the caretaker's portfolio, read-only.
 *
 * The server already scopes `GET /properties` to the caretaker's assignment,
 * so this list cannot show a property they do not manage. There is no add /
 * edit / delete affordance — assignments come from the owner — and row actions
 * are absent for the same reason.
 */
export default function CaretakerPropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const statsByProperty = useMemo(() => {
    const map = new Map<string, PropertyStats>();
    const occupiedUnits = new Map<string, Set<string>>();
    for (const unit of units.data?.items ?? []) {
      const entry = map.get(unit.propertyId) ?? { ...EMPTY_STATS };
      entry.units += 1;
      map.set(unit.propertyId, entry);
    }
    for (const tenancy of tenancies.data?.items ?? []) {
      const propertyId = tenancy.unit?.propertyId ?? tenancy.unit?.property?.id;
      if (!propertyId) continue;
      const entry = map.get(propertyId) ?? { ...EMPTY_STATS };
      entry.active += 1;
      map.set(propertyId, entry);
      const seen = occupiedUnits.get(propertyId) ?? new Set<string>();
      if (tenancy.unitId) seen.add(tenancy.unitId);
      occupiedUnits.set(propertyId, seen);
    }
    for (const [propertyId, seen] of occupiedUnits) {
      const entry = map.get(propertyId) ?? { ...EMPTY_STATS };
      entry.occupied = seen.size;
      map.set(propertyId, entry);
    }
    return map;
  }, [units.data, tenancies.data]);

  const items = useMemo(() => {
    const all = properties.data ?? [];
    if (!selectedPropertyId) return all;
    return all.filter((property) => property.id === selectedPropertyId);
  }, [properties.data, selectedPropertyId]);

  const isLoading = properties.isLoading || units.isLoading || tenancies.isLoading;
  const isFiltered = selectedPropertyId !== null;

  const onRefresh = () => {
    return runRefresh(
      [properties.refetch(), units.refetch(), tenancies.refetch()],
      setRefreshing,
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Properties" />

      <PropertyFilterBar />

      {isLoading ? (
        <ListSkeleton />
      ) : properties.isError ? (
        <ListMessage
          title="Couldn't load properties"
          subtitle={(properties.error as Error).message}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-4 px-4 pb-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F766E']}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <ListMessage
              title={isFiltered ? 'Property not found' : 'No properties assigned'}
              subtitle={
                isFiltered
                  ? 'Try a different property filter.'
                  : 'Properties your manager assigns to you will appear here.'
              }
            />
          }
          renderItem={({ item }) => {
            const stats = statsByProperty.get(item.id) ?? EMPTY_STATS;
            return (
              <PropertyCard
                property={item}
                units={stats.units}
                occupied={stats.occupied}
                href={`/(caretaker)/property/${item.id}`}
                showCaretaker={false}
                stats={[
                  {
                    label: 'Total Units',
                    value: String(stats.units),
                    icon: Building2,
                    tone: 'units',
                  },
                  {
                    label: 'Active Tenants',
                    value: String(stats.active),
                    icon: Users,
                    tone: 'tenants',
                  },
                ]}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
