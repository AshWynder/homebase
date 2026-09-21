import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePropertyDialog } from '@/components/owner/create-property-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { StatPill } from '@/components/owner/stat-pill';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useProperties } from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { formatKes } from '@/lib/format';
import { MapPin, MoreVertical } from 'lucide-react-native';

export default function PropertiesScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();

  const ownerId = properties.data?.[0]?.ownerId ?? '';

  const statsByProperty = useMemo(() => {
    const map = new Map<string, { units: number; active: number; revenue: number }>();
    for (const unit of units.data?.items ?? []) {
      const entry = map.get(unit.propertyId) ?? { units: 0, active: 0, revenue: 0 };
      entry.units += 1;
      map.set(unit.propertyId, entry);
    }
    for (const tenancy of tenancies.data?.items ?? []) {
      const propertyId = tenancy.unit?.property?.id;
      if (!propertyId) continue;
      const entry = map.get(propertyId) ?? { units: 0, active: 0, revenue: 0 };
      entry.active += 1;
      entry.revenue += Number(tenancy.rentAmount);
      map.set(propertyId, entry);
    }
    return map;
  }, [units.data, tenancies.data]);

  const isLoading = properties.isLoading || units.isLoading || tenancies.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Your Properties" onAdd={() => setCreateOpen(true)} addLabel="Add property" />

      {isLoading ? (
        <ListSkeleton />
      ) : properties.isError ? (
        <ListMessage
          title="Couldn't load properties"
          subtitle={(properties.error as Error).message}
        />
      ) : (
        <FlatList
          data={properties.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <ListMessage
              title="No properties yet"
              subtitle="Tap the + button to add your first property."
            />
          }
          renderItem={({ item }) => {
            const stats = statsByProperty.get(item.id) ?? { units: 0, active: 0, revenue: 0 };
            return (
              <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-slate-900">{item.name}</Text>
                    {item.address ? (
                      <View className="flex-row items-center gap-1">
                        <Icon as={MapPin} size={13} className="text-slate-400" />
                        <Text className="text-sm text-slate-500">{item.address}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable hitSlop={10} className="p-1">
                    <Icon as={MoreVertical} size={18} className="text-slate-400" />
                  </Pressable>
                </View>

                <View className="flex-row gap-2">
                  <StatPill label="Units" value={String(stats.units)} tone="teal" />
                  <StatPill label="Active Tenants" value={String(stats.active)} tone="blue" />
                  <StatPill label="Monthly Revenue" value={formatKes(stats.revenue)} tone="amber" />
                </View>
              </View>
            );
          }}
        />
      )}

      <CreatePropertyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownerId={ownerId}
      />
    </SafeAreaView>
  );
}