import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { RecordReadingDialog } from '@/components/owner/record-reading-dialog';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMeters } from '@/hooks/queries/use-meters';
import { formatKes } from '@/lib/format';
import { ChevronRight, CreditCard, DollarSign, Droplet, Zap } from 'lucide-react-native';
import type { UtilityMeter } from '@/api/types';

const METHOD_ICONS = { mpesa: DollarSign, card: CreditCard } as const;
const METER_ICONS = { WATER: Droplet, ELECTRICITY: Zap } as const;

function PaymentMethodRow({
  id,
  title,
  subtitle,
  icon,
}: {
  id: keyof typeof METHOD_ICONS;
  title: string;
  subtitle: string;
  icon: 'mpesa' | 'card';
}) {
  const IconCmp = METHOD_ICONS[icon];
  return (
    <Pressable className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon as={IconCmp} size={20} className="text-slate-700" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
        <Text className="text-xs text-slate-500">{subtitle}</Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-slate-400" />
    </Pressable>
  );
}

export default function PaymentsScreen() {
  const [selectedMeter, setSelectedMeter] = useState<UtilityMeter | null>(null);
  const meters = useMeters({ limit: 100 });

  const header = (
    <View className="gap-4 px-5 pt-4">
      <Text className="text-sm font-bold uppercase tracking-wide text-slate-500">Payment Methods</Text>
      <View className="gap-3">
        <PaymentMethodRow
          id="mpesa"
          icon="mpesa"
          title="M-Pesa"
          subtitle="Mobile payment"
        />
        <PaymentMethodRow
          id="card"
          icon="card"
          title="Card Payment"
          subtitle="Visa, Mastercard"
        />
      </View>
      <Text className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Utility Meters
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Payments" />

      {meters.isLoading ? (
        <ListSkeleton />
      ) : meters.isError ? (
        <ListMessage title="Couldn't load meters" subtitle={(meters.error as Error).message} />
      ) : (
        <FlatList
          data={meters.data?.items ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <ListMessage
              title="No meters"
              subtitle="Add a utility meter to a unit to start tracking readings."
            />
          }
          renderItem={({ item }) => {
            const IconCmp = METER_ICONS[item.meterType];
            return (
              <View className="mx-5 mb-3 gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <Icon
                      as={IconCmp}
                      size={20}
                      className={item.meterType === 'WATER' ? 'text-teal-700' : 'text-amber-600'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">
                      {item.meterType === 'WATER' ? 'Water' : 'Electricity'}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {item.unit?.unitNumber ? `Unit ${item.unit.unitNumber} · ` : ''}
                      {item.meterNumber ?? 'No meter no.'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-end justify-between">
                  <View className="gap-1">
                    <Text className="text-[11px] text-slate-500">Last Reading</Text>
                    <Text className="text-base font-bold text-slate-900">{item.lastReading}</Text>
                  </View>
                  <View className="gap-1">
                    <Text className="text-[11px] text-slate-500">Price/Unit</Text>
                    <Text className="text-base font-bold text-slate-900">
                      {formatKes(item.pricePerUnit)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedMeter(item)}
                    className="rounded-lg border border-slate-300 px-4 py-2 active:bg-slate-100">
                    <Text className="text-sm font-semibold text-slate-800">Update</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <RecordReadingDialog
        meter={selectedMeter}
        open={!!selectedMeter}
        onOpenChange={(open) => !open && setSelectedMeter(null)}
      />
    </SafeAreaView>
  );
}