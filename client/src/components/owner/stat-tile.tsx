import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors } from '@/theme/colors';

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
 */
export function StatTile({ label, value, helper, suffix }: StatTileProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!isDark) {
    return (
      <View
        style={{
          minWidth: '45%',
          flex: 1,
          gap: 4,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(255,255,255,0.08)',
          padding: 12,
        }}>
        <Text style={{ color: '#D1FAE5', fontSize: 12 }} numberOfLines={1}>
          {label}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }} numberOfLines={1}>
            {value}
          </Text>
          {suffix ? (
            <Text style={{ color: '#A7F3D0', fontSize: 12, fontWeight: '600' }}>{suffix}</Text>
          ) : null}
        </View>
        {helper ? (
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              backgroundColor: 'rgba(0,0,0,0.18)',
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
            <Text style={{ color: '#A7F3D0', fontSize: 10, fontWeight: '600' }}>
              {helper}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        minWidth: '45%',
        flex: 1,
        gap: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: darkColors.border,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
      }}>
      <Text
        className="text-xs"
        style={{ color: darkColors.textMuted }}
        numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-2xl font-bold"
          style={{ color: darkColors.text }}
          numberOfLines={1}>
          {value}
        </Text>
        {suffix ? (
          <Text
            className="text-xs font-semibold"
            style={{ color: darkColors.teal }}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 6,
            borderWidth: 1,
            borderColor: darkColors.emeraldTintBorder,
            backgroundColor: darkColors.emeraldTintBg,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}>
          <Text
            className="text-[10px] font-semibold"
            style={{ color: darkColors.emeraldLight }}>
            {helper}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
