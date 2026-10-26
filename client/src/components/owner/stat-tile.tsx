import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface StatTileProps {
  label: string;
  value: string;
  /** Chip under the value, e.g. "Fully Leased". */
  helper?: string;
  /** Small suffix beside the value, e.g. "KES". */
  suffix?: string;
}

/**
 * A single stat cell of the Portfolio Snapshot card.
 *
 * The card paints the tile on a saturated gradient, so every colour here is a
 * translucent white rather than a theme token.
 */
export function StatTile({ label, value, helper, suffix }: StatTileProps) {
  return (
    <View className="min-w-[45%] flex-1 gap-1 rounded-2xl border border-white/15 bg-white/10 p-3">
      <Text className="text-xs text-white/80" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-2xl font-bold text-white" numberOfLines={1}>
          {value}
        </Text>
        {suffix ? (
          <Text className="text-xs font-semibold text-white/70">{suffix}</Text>
        ) : null}
      </View>
      {helper ? (
        <View className="self-start rounded-md bg-white/15 px-1.5 py-0.5">
          <Text className="text-[10px] font-semibold text-white/90">
            {helper}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
