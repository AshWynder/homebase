import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PortfolioSnapshot } from '@/components/owner/portfolio-snapshot';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { StatPill } from '@/components/owner/stat-pill';
import { UpdatePropertyDialog } from '@/components/owner/update-property-dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useDeleteProperty, useProperties } from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { formatKes } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import type { Property } from '@/api/types';
import {
  Building2,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react-native';

interface PropertyStats {
  units: number;
  active: number;
  revenue: number;
}

const EMPTY_STATS: PropertyStats = { units: 0, active: 0, revenue: 0 };

/**
 * Units segment of the Portfolio tab. The create dialog is owned by the tab so
 * the header's add button can swap target per segment; row-level actions
 * (update, delete) live here because they are scoped to a single card.
 */
export function PropertyList() {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();
  const deleteProperty = useDeleteProperty();
  const { visible, message, type, showToast, hideToast } = useToast();

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
      entry.revenue += Number(tenancy.rentAmount);
      map.set(propertyId, entry);
    }
    return map;
  }, [units.data, tenancies.data]);

  const portfolioStats = useMemo(
    () => ({
      totalProperties: properties.data?.length ?? 0,
      totalUnits: units.data?.items?.length ?? 0,
      totalActiveTenants: tenancies.data?.items?.length ?? 0,
      totalRevenue: (tenancies.data?.items ?? []).reduce(
        (sum, tenancy) => sum + Number(tenancy.rentAmount),
        0,
      ),
    }),
    [properties.data, units.data, tenancies.data],
  );

  const items = useMemo(() => {
    const all = properties.data ?? [];
    if (!selectedPropertyId) return all;
    return all.filter((property) => property.id === selectedPropertyId);
  }, [properties.data, selectedPropertyId]);

  const isLoading = properties.isLoading || units.isLoading || tenancies.isLoading;
  const isFiltered = selectedPropertyId !== null;

  const handleDelete = (property: Property) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProperty.mutate(property.id, {
              onSuccess: () => showToast('Property deleted successfully'),
            });
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1">
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
          ListHeaderComponent={
            isFiltered ? null : (
              <View className="mb-4">
                <PortfolioSnapshot stats={portfolioStats} />
              </View>
            )
          }
          ListEmptyComponent={
            <ListMessage
              title={isFiltered ? 'Property not found' : 'No properties yet'}
              subtitle={
                isFiltered
                  ? 'Try a different property filter.'
                  : 'Tap the + button to add your first property.'
              }
            />
          }
          renderItem={({ item }) => {
            const stats = statsByProperty.get(item.id) ?? EMPTY_STATS;
            return (
              <Pressable
                onPress={() => router.push(`/property/${item.id}`)}
                className="gap-4 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable
                        hitSlop={10}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={`Actions for ${item.name}`}
                        onPress={(e) => e.stopPropagation()}>
                        <Icon as={MoreVertical} size={18} className="text-slate-400" />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onPress={() => {
                          setSelectedProperty(item);
                          setUpdateOpen(true);
                        }}>
                        <Icon as={Pencil} size={16} className="text-slate-600" />
                        <Text>Update</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onPress={() => handleDelete(item)}>
                        <Icon as={Trash2} size={16} className="text-red-600" />
                        <Text>Delete</Text>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>

                <View className="flex-col gap-2">
                  <StatPill label="Units" value={String(stats.units)} tone="teal" icon={Building2} />
                  <StatPill
                    label="Active Tenants"
                    value={String(stats.active)}
                    tone="blue"
                    icon={Users}
                  />
                  <StatPill
                    label="Monthly Revenue"
                    value={formatKes(stats.revenue)}
                    tone="amber"
                    icon={Wallet}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <UpdatePropertyDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        property={selectedProperty}
        onToast={showToast}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </View>
  );
}
