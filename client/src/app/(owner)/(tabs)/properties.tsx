import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { CreatePropertyDialog } from '@/components/owner/create-property-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { StatPill } from '@/components/owner/stat-pill';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdatePropertyDialog } from '@/components/owner/update-property-dialog';
import { Toast } from '@/components/ui/toast';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { useDeleteProperty, useProperties } from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { formatKes } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import { useToast } from '@/hooks/use-toast';
import type { Property } from '@/api/types';
import { Building2, MapPin, MoreVertical, Pencil, Trash2, Users, Wallet } from 'lucide-react-native';

export default function PropertiesScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLiveBlinking, setIsLiveBlinking] = useState(true);
  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();
  const deleteProperty = useDeleteProperty();
  const { visible, message, type, showToast, hideToast } = useToast();

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
              onSuccess: () => {
                showToast('Property deleted successfully');
              },
            });
          },
        },
      ],
    );
  };

  const handleUpdate = (property: Property) => {
    setSelectedProperty(property);
    setUpdateOpen(true);
  };

  // Blinking effect for live indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLiveBlinking((prev) => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // The authenticated owner's UserProfile id — Property.ownerId references it.
  const ownerId = useStore((s) => s.profile?.id ?? '');
  const user = useStore((s) => s.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';

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

  // Calculate portfolio-wide stats
  const portfolioStats = useMemo(() => {
    const totalProperties = properties.data?.length ?? 0;
    const totalUnits = units.data?.items?.length ?? 0;
    const totalActiveTenants = tenancies.data?.items?.length ?? 0;
    const totalRevenue = (tenancies.data?.items ?? []).reduce(
      (sum, tenancy) => sum + Number(tenancy.rentAmount),
      0
    );

    return {
      totalProperties,
      totalUnits,
      totalActiveTenants,
      totalRevenue,
    };
  }, [properties.data, units.data, tenancies.data]);

  const isLoading = properties.isLoading || units.isLoading || tenancies.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title={firstName ? `Hello ${firstName} 👋` : 'Your Properties'}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add property"
      />

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
          ListHeaderComponent={
            <View className="mb-4">
              <View className="rounded-2xl bg-teal-700 p-4">
                <View className="mb-4 flex-row items-center gap-2">
                  <View
                    className={`h-2 w-2 rounded-full ${
                      isLiveBlinking ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}
                  />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white">
                    Portfolio Snapshot
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <View className="flex-1 min-w-[45%] rounded-xl bg-teal-600/50 p-3 gap-1">
                    <Text className="text-xs text-teal-100">Total Properties</Text>
                    <Text className="text-2xl font-bold text-white">
                      {portfolioStats.totalProperties}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl bg-teal-600/50 p-3 gap-1">
                    <Text className="text-xs text-teal-100">Total Units</Text>
                    <Text className="text-2xl font-bold text-white">
                      {portfolioStats.totalUnits}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl bg-teal-600/50 p-3 gap-1">
                    <Text className="text-xs text-teal-100">Active Tenants</Text>
                    <Text className="text-2xl font-bold text-white">
                      {portfolioStats.totalActiveTenants}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl bg-teal-600/50 p-3 gap-1">
                    <Text className="text-xs text-teal-100">Monthly Revenue</Text>
                    <Text className="text-2xl font-bold text-white" numberOfLines={1}>
                      {formatKes(portfolioStats.totalRevenue)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <ListMessage
              title="No properties yet"
              subtitle="Tap the + button to add your first property."
            />
          }
          renderItem={({ item }) => {
            const stats = statsByProperty.get(item.id) ?? { units: 0, active: 0, revenue: 0 };
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
                      <Pressable hitSlop={10} className="p-1" onPress={(e) => e.stopPropagation()}>
                        <Icon as={MoreVertical} size={18} className="text-slate-400" />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onPress={() => handleUpdate(item)}>
                        <Icon as={Pencil} size={16} className="text-slate-600" />
                        <Text>Update</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onPress={() => handleDelete(item)}>
                        <Icon as={Trash2} size={16} className="text-red-600" />
                        <Text>Delete</Text>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>

                <View className="flex-col gap-2">
                  <StatPill
                    label="Units"
                    value={String(stats.units)}
                    tone="teal"
                    icon={Building2}
                  />
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

      <CreatePropertyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownerId={ownerId}
        onToast={showToast}
      />
      <UpdatePropertyDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        property={selectedProperty}
        onToast={showToast}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}