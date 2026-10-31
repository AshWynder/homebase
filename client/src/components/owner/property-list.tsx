import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PortfolioSnapshot } from '@/components/owner/portfolio-snapshot';
import { PropertyCard } from '@/components/owner/property-card';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { UpdatePropertyDialog } from '@/components/owner/update-property-dialog';
import { AssignCaretakerDialog } from '@/components/owner/assign-caretaker-dialog';
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
import {
  useDeleteProperty,
  useProperties,
  useRemoveCaretaker,
} from '@/hooks/queries/use-properties';
import { useUnits } from '@/hooks/queries/use-units';
import { formatThousands } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import type { Property } from '@/api/types';
import {
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';

interface PropertyStats {
  units: number;
  active: number;
  /** Units with an active tenancy, counted once per unit. */
  occupied: number;
  revenue: number;
}

const EMPTY_STATS: PropertyStats = { units: 0, active: 0, occupied: 0, revenue: 0 };

/**
 * Units segment of the Portfolio tab. The create dialog is owned by the tab so
 * the header's add button can swap target per segment; row-level actions
 * (update, delete) live here because they are scoped to a single card.
 */
export function PropertyList() {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [assignCaretakerOpen, setAssignCaretakerOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const tenancies = useActiveTenancies();
  const deleteProperty = useDeleteProperty();
  const removeCaretaker = useRemoveCaretaker();
  const { visible, message, type, showToast, hideToast } = useToast();

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
      entry.revenue += Number(tenancy.rentAmount);
      map.set(propertyId, entry);
      // A unit with two active tenancies is still one occupied unit.
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

  const handleRemoveCaretaker = (property: Property) => {
    const name = property.caretaker?.user?.name ?? 'this caretaker';
    Alert.alert(
      'Remove Caretaker',
      `Remove ${name} from "${property.name}"? They will lose access to the property and its group chat.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeCaretaker.mutate(property.id, {
              onSuccess: () => showToast('Caretaker removed'),
              onError: (error) => showToast((error as Error).message, 'error'),
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
          contentContainerClassName="gap-4 px-4 pt-6 pb-6"
          ListHeaderComponent={
            isFiltered ? null : (
              <View>
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
              <PropertyCard
                property={item}
                units={stats.units}
                occupied={stats.occupied}
                href={`/property/${item.id}`}
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
                  {
                    label: 'Monthly Rent Target',
                    value: formatThousands(stats.revenue),
                    prefix: 'KES',
                    icon: Wallet,
                    tone: 'rent',
                  },
                ]}
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable
                        hitSlop={10}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={`Actions for ${item.name}`}
                        onPress={(e) => e.stopPropagation()}>
                        <Icon
                          as={MoreVertical}
                          size={18}
                          className="text-muted-foreground"
                        />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onPress={() => {
                          setSelectedProperty(item);
                          setUpdateOpen(true);
                        }}>
                        <Icon as={Pencil} size={16} className="text-muted-foreground" />
                        <Text>Update</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onPress={() => {
                          setSelectedProperty(item);
                          setAssignCaretakerOpen(true);
                        }}>
                        <Icon as={UserPlus} size={16} className="text-muted-foreground" />
                        <Text>
                          {item.caretaker ? 'Change caretaker' : 'Assign caretaker'}
                        </Text>
                      </DropdownMenuItem>
                      {item.caretaker ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onPress={() => handleRemoveCaretaker(item)}>
                          <Icon as={UserMinus} size={16} className="text-destructive" />
                          <Text>Remove caretaker</Text>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onPress={() => handleDelete(item)}>
                        <Icon as={Trash2} size={16} className="text-destructive" />
                        <Text>Delete</Text>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
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
      <AssignCaretakerDialog
        open={assignCaretakerOpen}
        onOpenChange={setAssignCaretakerOpen}
        property={selectedProperty}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </View>
  );
}
