import { View } from 'react-native';

import { StatTile } from '@/components/owner/stat-tile';
import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { formatCompactNumber } from '@/lib/format';

export interface PortfolioStats {
  totalProperties: number;
  totalUnits: number;
  totalActiveTenants: number;
  totalRevenue: number;
}

interface PortfolioSnapshotProps {
  stats: PortfolioStats;
}

/**
 * Gradient stops for the snapshot card. `expo-linear-gradient` needs literal
 * colours, so these live here rather than in the theme tokens.
 */
const GRADIENT_COLORS = ['#065F46', '#059669'] as const;

/**
 * Portfolio-wide totals shown at the top of the Units segment. Deliberately
 * unscoped: it is the "all of my properties" overview, so it is hidden rather
 * than recalculated whenever the property filter is narrowed.
 */
export function PortfolioSnapshot({ stats }: PortfolioSnapshotProps) {
  const occupancy =
    stats.totalUnits > 0
      ? Math.round((stats.totalActiveTenants / stats.totalUnits) * 100)
      : 0;

  const leasingState =
    stats.totalUnits === 0
      ? 'No units'
      : occupancy >= 100
        ? 'Fully Leased'
        : occupancy > 0
          ? 'Partially leased'
          : 'No leases';

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-3xl p-4">
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-emerald-300" />
          <Text className="text-[11px] font-bold uppercase tracking-widest text-white">
            Portfolio Snapshot
          </Text>
        </View>
        <View className="rounded-md bg-white/15 px-2 py-1">
          <Text className="text-[10px] font-semibold text-white/90">
            Updated Today
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <StatTile
          label="Total Properties"
          value={String(stats.totalProperties)}
          helper="Active"
        />
        <StatTile
          label="Total Units"
          value={String(stats.totalUnits)}
          helper={`${occupancy}% leased`}
        />
        <StatTile
          label="Active Tenants"
          value={String(stats.totalActiveTenants)}
          helper={leasingState}
        />
        <StatTile
          label="Monthly Revenue"
          value={formatCompactNumber(stats.totalRevenue)}
          suffix="KES"
        />
      </View>
    </LinearGradient>
  );
}
