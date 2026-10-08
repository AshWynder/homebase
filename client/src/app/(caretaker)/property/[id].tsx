import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, DollarSign, Home, Users, Zap } from 'lucide-react-native';

import { StartGroupChatButton } from '@/components/chat/start-chat-button';
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

/**
 * One property's units, from the caretaker's side.
 *
 * Read-only like the properties tab: no CreateUnit FAB, since units are the
 * owner's to add. The group-chat button stays — starting the property's thread
 * is a caretaker action the server already permits.
 */
export default function CaretakerPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = typeof id === 'string' ? id : id?.[0] ?? '';
  const { visible, message, type, showToast, hideToast } = useToast();

  const propertyQuery = useProperty(propertyId);
  const unitsQuery = useUnitsByProperty(propertyId);
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const property = propertyQuery.data;

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

    for (const unit of units) {
      map.set(unit.id, {
        hasActiveTenancy: false,
        rentAmount: 0,
        meterCount: 0,
        tenantName: '',
      });
    }

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

  const isLoading =
    propertyQuery.isLoading ||
    unitsQuery.isLoading ||
    allTenanciesQuery.isLoading ||
    allMetersQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
          <Icon as={ArrowLeft} size={18} className="text-slate-800" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-slate-900">
          {property?.name || 'Property Units'}
        </Text>

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
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-4">
              <View className="rounded-2xl bg-teal-700 p-4">
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-teal-100">
                    {property?.address || 'Property Address'}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <View className="min-w-[45%] flex-1 gap-1 rounded-xl bg-teal-600/50 p-3">
                    <Text className="text-xs text-teal-100">Total Units</Text>
                    <Text className="text-2xl font-bold text-white">{units.length}</Text>
                  </View>
                  <View className="min-w-[45%] flex-1 gap-1 rounded-xl bg-teal-600/50 p-3">
                    <Text className="text-xs text-teal-100">Occupied</Text>
                    <Text className="text-2xl font-bold text-white">
                      {
                        Array.from(statsByUnit.values()).filter((s) => s.hasActiveTenancy)
                          .length
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
                onPress={() => router.push(`/(caretaker)/unit/${item.id}`)}
                className="gap-4 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-slate-900">
                        Unit {item.unitNumber}
                      </Text>
                      {item.blockName ? (
                        <Badge variant="secondary" className="bg-slate-100">
                          <Text className="text-[10px] font-semibold text-slate-600">
                            {item.blockName}
                          </Text>
                        </Badge>
                      ) : null}
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon as={Home} size={13} className="text-slate-400" />
                      <Text className="text-sm text-slate-500">
                        {item.property?.name ?? 'Property'}
                      </Text>
                    </View>
                  </View>
                  {stats.hasActiveTenancy ? (
                    <Badge className="bg-emerald-100">
                      <Text className="text-[10px] font-semibold text-emerald-800">
                        OCCUPIED
                      </Text>
                    </Badge>
                  ) : null}
                </View>

                <View className="flex-col gap-2">
                  {stats.hasActiveTenancy ? (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Users} size={14} className="text-sky-700" />
                      <Text className="text-sm text-slate-600">
                        {stats.tenantName || 'Tenant'}
                      </Text>
                    </View>
                  ) : null}
                  {stats.rentAmount > 0 ? (
                    <View className="flex-row items-center gap-2">
                      <Icon as={DollarSign} size={14} className="text-amber-700" />
                      <Text className="text-sm text-slate-600">
                        {formatKes(stats.rentAmount)}/month
                      </Text>
                    </View>
                  ) : null}
                  {stats.meterCount > 0 ? (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Zap} size={14} className="text-yellow-500" />
                      <Text className="text-sm text-slate-600">
                        {stats.meterCount} utility meter
                        {stats.meterCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : null}
                  {stats.meterCount === 0 && !stats.hasActiveTenancy ? (
                    <View className="flex-row items-center gap-2">
                      <Icon as={Building2} size={14} className="text-slate-400" />
                      <Text className="text-sm text-slate-400">Vacant • No meters</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
