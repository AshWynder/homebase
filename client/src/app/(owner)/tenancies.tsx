import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateTenancyDialog } from '@/components/owner/create-tenancy-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useActiveTenancies } from '@/hooks/queries/use-tenancies';
import { formatDate, formatKes, tenantName } from '@/lib/format';
import { Clock, MoreVertical } from 'lucide-react-native';

export default function TenanciesScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const tenancies = useActiveTenancies();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Active Tenancies"
        onAdd={() => setCreateOpen(true)}
        addLabel="Add tenancy"
      />

      {tenancies.isLoading ? (
        <ListSkeleton />
      ) : tenancies.isError ? (
        <ListMessage
          title="Couldn't load tenancies"
          subtitle={(tenancies.error as Error).message}
        />
      ) : (
        <FlatList
          data={tenancies.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <ListMessage
              title="No active tenancies"
              subtitle="Tap the + button to assign a tenant to a unit."
            />
          }
          renderItem={({ item }) => (
            <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-slate-900">{tenantName(item)}</Text>
                  <Text className="text-sm text-slate-500">
                    {item.unit?.property?.name ?? 'Property'} • Unit {item.unit?.unitNumber ?? '—'}
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
                  <Pressable hitSlop={10} className="p-1">
                    <Icon as={MoreVertical} size={18} className="text-slate-400" />
                  </Pressable>
                </View>
              </View>

              <View className="border-t border-slate-100 pt-3">
                <Text className="text-lg font-bold text-slate-900">
                  {formatKes(item.rentAmount)}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <CreateTenancyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </SafeAreaView>
  );
}