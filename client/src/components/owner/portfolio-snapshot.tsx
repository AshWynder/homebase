import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatCompactKes } from '@/lib/format';

export interface PortfolioStats {
  totalProperties: number;
  totalUnits: number;
  totalActiveTenants: number;
  totalRevenue: number;
}

interface PortfolioSnapshotProps {
  stats: PortfolioStats;
}

const TILES: {
  key: keyof PortfolioStats;
  label: string;
  format: (value: number) => string;
}[] = [
  { key: 'totalProperties', label: 'Total Properties', format: (value) => String(value) },
  { key: 'totalUnits', label: 'Total Units', format: (value) => String(value) },
  { key: 'totalActiveTenants', label: 'Active Tenants', format: (value) => String(value) },
  { key: 'totalRevenue', label: 'Monthly Revenue', format: formatCompactKes },
];

/**
 * Portfolio-wide totals shown at the top of the Units segment. Deliberately
 * unscoped: it is the "all of my properties" overview, so it is hidden rather
 * than recalculated whenever the property filter is narrowed.
 */
export function PortfolioSnapshot({ stats }: PortfolioSnapshotProps) {
  return (
    <View className="rounded-2xl bg-teal-700 p-4">
      <View className="mb-4 flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-emerald-400" />
        <Text className="text-xs font-bold uppercase tracking-wider text-white">
          Portfolio Snapshot
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {TILES.map((tile) => (
          <View
            key={tile.key}
            className="min-w-[45%] flex-1 gap-1 rounded-xl bg-teal-600/50 p-3">
            <Text className="text-xs text-teal-100">{tile.label}</Text>
            <Text className="text-2xl font-bold text-white" numberOfLines={1}>
              {tile.format(stats[tile.key])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
