import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors } from '@/theme/colors';

interface OccupancyBarProps {
  /** Units that currently have an active tenancy. */
  occupied: number;
  /** Total units on the property. */
  total: number;
}

/**
 * Occupancy summary: the rate on the right, the bar underneath.
 */
export function OccupancyBar({ occupied, total }: OccupancyBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  if (!isDark) {
    return (
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text style={{ color: '#334155', fontSize: 14 }}>Occupancy Rate</Text>
          <Text style={{ color: '#006241', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
            {rate}% ({occupied}/{total} Occupied)
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E2E8F0',
            overflow: 'hidden',
            width: '100%',
          }}>
          <View
            style={{
              height: '100%',
              width: `${Math.min(Math.max(rate, 0), 100)}%`,
              backgroundColor: '#006241',
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm" style={{ color: darkColors.textMuted }}>
          Occupancy Rate
        </Text>
        <Text
          className="text-sm font-bold"
          style={{ color: darkColors.emeraldLight }}
          numberOfLines={1}>
          {rate}% ({occupied}/{total} Occupied)
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          width: '100%',
        }}>
        <View
          style={{
            height: '100%',
            width: `${Math.min(Math.max(rate, 0), 100)}%`,
            backgroundColor: darkColors.emerald,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
