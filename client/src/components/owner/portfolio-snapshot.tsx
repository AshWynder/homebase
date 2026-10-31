import { Platform, View } from 'react-native';

import { StatTile } from '@/components/owner/stat-tile';
import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCompactNumber } from '@/lib/format';
import { darkColors } from '@/theme/colors';

export interface PortfolioStats {
  totalProperties: number;
  totalUnits: number;
  totalActiveTenants: number;
  totalRevenue: number;
}

interface PortfolioSnapshotProps {
  stats: PortfolioStats;
}

const LIGHT_GRADIENT_COLORS = ['#00563A', '#006241', '#047857'] as const;
const DARK_GRADIENT_COLORS = ['rgba(16,185,129,0.16)', '#0B0F17'] as const;

/**
 * Portfolio-wide totals shown at the top of the Units segment.
 */
export function PortfolioSnapshot({ stats }: PortfolioSnapshotProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  if (!isDark) {
    return (
      <LinearGradient
        colors={LIGHT_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-3xl p-4">
        <View className="mb-3 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' }} />
            <Text
              className="text-[10px] font-bold uppercase"
              style={{ color: '#A7F3D0', letterSpacing: 1.2 }}>
              PORTFOLIO SNAPSHOT
            </Text>
          </View>
          <View
            style={{
              borderRadius: 6,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.25)',
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}>
            <Text className="text-[10px] font-semibold" style={{ color: '#FFFFFF' }}>
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

  return (
    <LinearGradient
      colors={DARK_GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        padding: 16,
        backgroundColor: darkColors.background,
        borderWidth: 1,
        borderColor: darkColors.emeraldTintBorder,
        shadowColor: darkColors.emerald,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0,
        shadowRadius: 16,
        elevation: 2,
        overflow: 'hidden',
      }}>
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: darkColors.emeraldLight,
              shadowColor: darkColors.emeraldLight,
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }}
          />
          <Text
            className="text-[10px] font-bold uppercase"
            style={{
              color: darkColors.emeraldLight,
              letterSpacing: 1.2,
            }}>
            PORTFOLIO SNAPSHOT
          </Text>
        </View>
        <View
          style={{
            borderRadius: 6,
            borderWidth: 1,
            borderColor: darkColors.emeraldTintBorder,
            backgroundColor: darkColors.emeraldTintBg,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
          <Text
            className="text-[10px] font-semibold"
            style={{ color: darkColors.emeraldLight }}>
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
