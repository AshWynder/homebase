import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Gauge, Zap } from 'lucide-react-native';

import { RecordReadingDialog } from '@/components/owner/record-reading-dialog';
import { ListMessage } from '@/components/owner/list-state';
import {
  MeterRecencyBadge,
  meterDaysSince,
} from '@/components/owner/meter-recency-badge';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMeters } from '@/hooks/queries/use-meters';
import type { MeterType, UtilityMeter } from '@/api/types';

const METER_TYPE_CONFIG: Record<
  MeterType,
  { icon: typeof Droplets; label: string; chip: string }
> = {
  WATER: { icon: Droplets, label: 'Water', chip: 'bg-blue-50 text-blue-700' },
  ELECTRICITY: { icon: Zap, label: 'Electricity', chip: 'bg-amber-50 text-amber-700' },
};

/**
 * Meters tab: the caretaker's reading round.
 *
 * The server scopes `GET /meters` to the caretaker's assigned properties, so
 * this list is only ever their own portfolio's meters. Every row opens the
 * shared record-reading dialog — recording a reading is the one write this tab
 * exists for, and it bills through the same endpoint the owner uses.
 */
export default function CaretakerMetersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeMeter, setActiveMeter] = useState<UtilityMeter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const metersQuery = useMeters({ limit: 100 });

  const meters = useMemo(
    () => metersQuery.data?.items ?? [],
    [metersQuery.data],
  );

  const grouped = useMemo(() => {
    const byProperty = new Map<
      string,
      { name: string; meters: UtilityMeter[] }
    >();
    for (const meter of meters) {
      const property = meter.unit?.property;
      const key = property?.id ?? meter.unitId;
      const entry = byProperty.get(key) ?? {
        name: property?.name ?? 'Unassigned',
        meters: [],
      };
      entry.meters.push(meter);
      byProperty.set(key, entry);
    }
    return [...byProperty.entries()];
  }, [meters]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await metersQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openReading = (meter: UtilityMeter) => {
    setActiveMeter(meter);
    setDialogOpen(true);
  };

  const isFirstLoad = metersQuery.isPending && !metersQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Meter readings" />

      {isFirstLoad ? (
        <View className="gap-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </View>
      ) : metersQuery.isError ? (
        <ListMessage
          title="Couldn't load meters"
          subtitle={(metersQuery.error as Error).message}
        />
      ) : meters.length === 0 ? (
        <ListMessage
          title="No meters yet"
          subtitle="Meters on the units you manage will appear here."
        />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([key]) => key}
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F766E']}
              tintColor="#0F766E"
            />
          }
          ListHeaderComponent={
            <Text className="text-xs leading-5 text-slate-500">
              Tap a meter to log its current reading. The reading is billed onto
              the invoice covering the reading date.
            </Text>
          }
          renderItem={({ item: [propertyId, group] }) => (
            <View key={propertyId} className="gap-3">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {group.name}
              </Text>
              {group.meters.map((meter) => (
                <MeterRow key={meter.id} meter={meter} onPress={() => openReading(meter)} />
              ))}
            </View>
          )}
        />
      )}

      <RecordReadingDialog
        meter={activeMeter}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setActiveMeter(null);
        }}
      />
    </SafeAreaView>
  );
}

function MeterRow({ meter, onPress }: { meter: UtilityMeter; onPress: () => void }) {
  const config = METER_TYPE_CONFIG[meter.meterType];
  const unitLabel = meter.unit?.unitNumber
    ? `Unit ${meter.unit.unitNumber}`
    : 'Unit';
  const recencyLabel = recencyAccessibility(meter.lastReadingAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${config.label} meter, ${unitLabel}. ${recencyLabel} Record a reading.`}
      className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 active:bg-slate-50">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
        <Icon as={config.icon} size={20} className="text-slate-600" />
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row flex-shrink items-center gap-2">
            <Text className="text-sm font-bold text-slate-900">{unitLabel}</Text>
            <Badge variant="secondary" className={config.chip}>
              <Text className={`text-[10px] font-semibold ${config.chip.split(' ')[1]}`}>
                {config.label}
              </Text>
            </Badge>
          </View>
          <MeterRecencyBadge date={meter.lastReadingAt} />
        </View>
        <Text className="text-xs text-slate-500">
          Last reading {meter.lastReading}
          {meter.meterNumber ? ` • ${meter.meterNumber}` : ''}
        </Text>
      </View>

      <View className="items-center gap-1 rounded-xl bg-teal-50 px-3 py-2">
        <Icon as={Gauge} size={16} className="text-teal-700" />
        <Text className="text-[10px] font-bold text-teal-800">Log</Text>
      </View>
    </Pressable>
  );
}

/**
 * Days since the meter's most recent reading, spoken for a screen reader —
 * the badge itself only paints the number, not the sentence around it.
 */
function recencyAccessibility(date?: string | null): string {
  const days = meterDaysSince(date);
  if (days === null) return 'No readings yet.';
  if (days === 0) return 'Read today.';
  if (days === 1) return 'Last read yesterday.';
  return `Last read ${days} days ago.`;
}
