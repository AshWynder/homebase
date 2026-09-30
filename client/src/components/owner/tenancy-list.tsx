import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { formatDate, formatKes, tenantName } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import { ChevronRight, Clock } from 'lucide-react-native';

/**
 * Tenants segment of the Portfolio tab. The search input only appears here
 * because "find me the tenant called X" is scoped to people, not to the unit
 * cards shown in the Units segment.
 */
export function TenancyList() {
  const [search, setSearch] = useState('');
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const tenancies = useTenancies({ isActive: true, propertyId: selectedPropertyId ?? undefined });

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
              title={isFiltered ? 'No tenants found' : 'No active tenancies'}
              subtitle={
                isFiltered
                  ? 'Try a different search or property filter.'
                  : 'Tap the + button to assign a tenant to a unit.'
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/tenancy/${item.id}`)}
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
                  <Badge variant="secondary" className="bg-emerald-100">
                    <Text className="text-[11px] font-semibold text-emerald-800">
                      {item.isActive ? 'ACTIVE' : 'ENDED'}
                    </Text>
                  </Badge>
                  <Icon as={ChevronRight} size={18} className="text-slate-400" />
                </View>
              </View>

              <View className="border-t border-slate-100 pt-3">
                <Text className="text-lg font-bold text-slate-900">
                  {formatKes(item.rentAmount)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
