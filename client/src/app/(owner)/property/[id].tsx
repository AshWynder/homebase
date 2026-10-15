import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, DollarSign, Home, Plus, Users, Zap } from 'lucide-react-native';

import { StartGroupChatButton } from '@/components/chat/start-chat-button';
import { CreateUnitDialog } from '@/components/owner/create-unit-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useMeters } from '@/hooks/queries/use-meters';
import { useProperty } from '@/hooks/queries/use-properties';
import { useUnitsByProperty } from '@/hooks/queries/use-units';
import { useToast } from '@/hooks/use-toast';
import { formatKes } from '@/lib/format';

export default function PropertyUnitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = typeof id === 'string' ? id : id?.[0] ?? '';
  const insets = useSafeAreaInsets();

  // Memoized: NativeWind's native interop identity-checks `style` on every
  // render, so an inline literal re-dispatches from inside the render phase.
  const fabInsetStyle = useMemo(() => ({ marginBottom: insets.bottom }), [insets.bottom]);

  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  const propertyQuery = useProperty(propertyId);
  const unitsQuery = useUnitsByProperty(propertyId);
  const units = unitsQuery.data ?? [];
  const property = propertyQuery.data;

  // Fetch all tenancies and meters, then filter by unit
  const allTenanciesQuery = useTenancies({ propertyId, isActive: true, limit: 100 });
  const allMetersQuery = useMeters({ propertyId, limit: 100 });

  const statsByUnit = useMemo(() => {
    const map = new Map<
      string,
      {
        hasActiveTenancy: boolean;
        rentAmount: number;
        meterCount: number;
        tenantName: string;
      }
    >();

    // Initialize all units with default values
    for (const unit of units) {
      map.set(unit.id, {
        hasActiveTenancy: false,
        rentAmount: 0,
        meterCount: 0,
        tenantName: '',
      });
    }

    // Populate tenancy data
    for (const tenancy of allTenanciesQuery.data?.items ?? []) {
      if (tenancy.unitId) {
        const entry = map.get(tenancy.unitId);
        if (entry) {
          entry.hasActiveTenancy = !!tenancy.isActive;
          entry.rentAmount = Number(tenancy.rentAmount);
          entry.tenantName = tenancy.tenant?.user?.name ?? '';
        }
      }
    }

    // Populate meter data
    for (const meter of allMetersQuery.data?.items ?? []) {
      if (meter.unitId) {
        const entry = map.get(meter.unitId);
        if (entry) {
          entry.meterCount += 1;
        }
      }
    }

    return map;
  }, [units, allTenanciesQuery.data, allMetersQuery.data]);

  const isLoading = propertyQuery.isLoading || unitsQuery.isLoading || allTenanciesQuery.isLoading || allMetersQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-muted active:bg-border">
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-foreground">
          {property?.name || 'Property Units'}
        </Text>

        {/* The one place a group thread can be reached for the first time: nobody
            else in the app creates one, and the server does it lazily. */}
        {propertyId ? (
          <StartGroupChatButton
            propertyId={propertyId}
            onError={(m) => showToast(m, 'error')}
          />
        ) : null}
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : propertyQuery.isError || unitsQuery.isError ? (
        <ListMessage
          title="Couldn't load property"
          subtitle={
            ((propertyQuery.error || unitsQuery.error) as Error)?.message ||
            'An error occurred'
          }
        />
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-5 gap-3"
          ListHeaderComponent={
            <View className="mb-4">
              <View className="rounded-2xl bg-primary p-4">
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-primary-foreground">
                    {property?.address || 'Property Address'}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <View className="flex-1 min-w-[45%] rounded-xl bg-primary-foreground/10 p-3 gap-1">
                    <Text className="text-xs text-primary-foreground">Total Units</Text>
                    <Text className="text-2xl font-bold text-primary-foreground">
                      {units.length}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl bg-primary-foreground/10 p-3 gap-1">
                    <Text className="text-xs text-primary-foreground">Occupied</Text>
                    <Text className="text-2xl font-bold text-primary-foreground">
                      {
                        Array.from(statsByUnit.values()).filter(
                          (s) => s.hasActiveTenancy
                        ).length
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <ListMessage
              title="No units yet"
              subtitle="This property doesn't have any units yet."
            />
          }
          renderItem={({ item }) => {
            const stats = statsByUnit.get(item.id) ?? {
              hasActiveTenancy: false,
              rentAmount: 0,
              meterCount: 0,
              tenantName: '',
            };

            return (
              <Pressable
                onPress={() => router.push(`/unit/${item.id}`)}
                className="gap-4 rounded-2xl border border-border bg-card p-4 active:bg-muted">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-foreground">
                        Unit {item.unitNumber}
                      </Text>
                      {item.blockName && (
                        <Badge variant="secondary" className="bg-muted">
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            {item.blockName}
                          </Text>
                        </Badge>
                      )}
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon as={Home} size={13} className="text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">
                        {item.property?.name ?? 'Property'}
                      </Text>
                    </View>
                  </View>
                  {stats.hasActiveTenancy && (
                    <Badge className="bg-success/10">
                      <Text className="text-[10px] font-semibold text-success">
                        OCCUPIED
                      </Text>
                    </Badge>
                  )}
                </View>

                <View className="flex-col gap-2">
                  {stats.hasActiveTenancy && (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Users} size={14} className="text-info" />
                      <Text className="text-sm text-muted-foreground">
                        {stats.tenantName || 'Tenant'}
                      </Text>
                    </View>
                  )}
                  {stats.rentAmount > 0 && (
                    <View className="flex-row items-center gap-2">
                      <Icon as={DollarSign} size={14} className="text-warning" />
                      <Text className="text-sm text-muted-foreground">
                        {formatKes(stats.rentAmount)}/month
                      </Text>
                    </View>
                  )}
                  {stats.meterCount > 0 && (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Zap} size={14} className="text-warning" />
                      <Text className="text-sm text-muted-foreground">
                        {stats.meterCount} utility meter{stats.meterCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {stats.meterCount === 0 && !stats.hasActiveTenancy && (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Building2} size={14} className="text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">
                        Vacant • No meters
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        onPress={() => setCreateUnitOpen(true)}
        disabled={isLoading}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary/90"
        style={fabInsetStyle}>
        <Icon as={Plus} size={24} className="text-primary-foreground" />
      </Pressable>

      <CreateUnitDialog
        open={createUnitOpen}
        onOpenChange={setCreateUnitOpen}
        propertyId={propertyId}
        onToast={showToast}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
