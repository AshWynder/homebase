import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Building2, MapPin, Users, Zap } from 'lucide-react-native';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { ScreenHeader } from '@/components/owner/screen-header';
import { StatPill } from '@/components/owner/stat-pill';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useProperties } from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { useStore } from '@/stores/use-store';
import type { Property } from '@/api/types';

interface PropertyStats {
  units: number;
  active: number;
  meters: number;
}

const EMPTY_STATS: PropertyStats = { units: 0, active: 0, meters: 0 };

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
    for (const unit of units.data?.items ?? []) {
      const entry = map.get(unit.propertyId) ?? { ...EMPTY_STATS };
      entry.units += 1;
      map.set(unit.propertyId, entry);
    }
    for (const tenancy of tenancies.data?.items ?? []) {
      const propertyId = tenancy.unit?.property?.id;
      if (!propertyId) continue;
      const entry = map.get(propertyId) ?? { ...EMPTY_STATS };
      entry.active += 1;
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([properties.refetch(), units.refetch(), tenancies.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
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
          contentContainerStyle={{ padding: 20, gap: 12 }}
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
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              stats={statsByProperty.get(item.id) ?? EMPTY_STATS}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function PropertyCard({ property, stats }: { property: Property; stats: PropertyStats }) {
  return (
    <Pressable
      onPress={() => router.push(`/(caretaker)/property/${property.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Property ${property.name}`}
      className="gap-4 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
      <View className="gap-1">
        <Text className="text-base font-bold text-slate-900">{property.name}</Text>
        {property.address ? (
          <View className="flex-row items-center gap-1">
            <Icon as={MapPin} size={13} className="text-slate-400" />
            <Text className="text-sm text-slate-500">{property.address}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-col gap-2">
        <StatPill label="Units" value={String(stats.units)} tone="teal" icon={Building2} />
        <StatPill
          label="Occupied"
          value={String(stats.active)}
          tone="blue"
          icon={Users}
        />
        <StatPill
          label="Needs reading"
          value={String(stats.units)}
          tone="amber"
          icon={Zap}
        />
      </View>
    </Pressable>
  );
}
