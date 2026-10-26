import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';

interface OccupancyBarProps {
  /** Units that currently have an active tenancy. */
  occupied: number;
  /** Total units on the property. */
  total: number;
}

/**
 * Occupancy summary: the rate on the right, the bar underneath.
 *
 * Occupied units are counted distinctly — a property with two active tenancies
 * on the same unit still counts as one occupied unit.
 */
export function OccupancyBar({ occupied, total }: OccupancyBarProps) {
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm text-muted-foreground">Occupancy Rate</Text>
        <Text className="text-sm font-bold text-primary" numberOfLines={1}>
          {rate}% ({occupied}/{total} Occupied)
        </Text>
      </View>
      <Progress
        value={rate}
        max={100}
        className="h-2 rounded-full bg-muted"
        indicatorClassName="bg-primary"
      />
    </View>
  );
}
