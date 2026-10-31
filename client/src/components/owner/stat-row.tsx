import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/utils';
import { darkColors } from '@/theme/colors';

export type StatRowTone = 'units' | 'tenants' | 'rent';

interface StatRowToneClasses {
  panel: string;
  tile: string;
  icon: string;
}

const LIGHT_TONES: Record<StatRowTone, StatRowToneClasses> = {
  units: {
    panel: 'border-0',
    tile: '',
    icon: '',
  },
  tenants: {
    panel: 'border-0',
    tile: '',
    icon: '',
  },
  rent: {
    panel: 'border-0',
    tile: '',
    icon: '',
  },
};

interface StatRowProps {
  label: string;
  value: string;
  /** Optional prefix rendered before the value, e.g. "KES". */
  prefix?: string;
  icon: LucideIcon;
  tone?: StatRowTone;
}

/**
 * A labelled statistic row: a tinted panel with the value on the left and a
 * coloured icon tile on the right.
 */
export function StatRow({
  label,
  value,
  prefix,
  icon,
  tone = 'units',
}: StatRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!isDark) {
    if (tone === 'units') {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 16,
            backgroundColor: '#EEF3FF',
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
            <Text style={{ color: '#64748B', fontSize: 12 }} numberOfLines={1}>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              {prefix ? (
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{prefix}</Text>
              ) : null}
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                {value}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: '#A7F3D0',
            }}>
            <Icon as={icon} size={18} color="#006241" />
          </View>
        </View>
      );
    }
    if (tone === 'tenants') {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 16,
            backgroundColor: '#E6F0FF',
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
            <Text style={{ color: '#64748B', fontSize: 12 }} numberOfLines={1}>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              {prefix ? (
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{prefix}</Text>
              ) : null}
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                {value}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: '#BFDBFE',
            }}>
            <Icon as={icon} size={18} color="#1E40AF" />
          </View>
        </View>
      );
    }
    // rent
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(217,119,6,0.25)',
          backgroundColor: '#FFF4E5',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}>
        <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
          <Text style={{ color: '#64748B', fontSize: 12 }} numberOfLines={1}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            {prefix ? (
              <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{prefix}</Text>
            ) : null}
            <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: '#92400E',
          }}>
          <Icon as={icon} size={18} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  // Dark mode styles using Obsidian Emerald Operations tokens
  const darkConfig = {
    units: {
      panelBg: darkColors.surface,
      panelBorder: darkColors.border,
      tileBg: darkColors.emeraldTintBg,
      tileBorder: darkColors.emeraldTintBorder,
      iconColor: darkColors.emeraldLight,
    },
    tenants: {
      panelBg: darkColors.surface,
      panelBorder: darkColors.blueTintBorder,
      tileBg: darkColors.blueTintBg,
      tileBorder: darkColors.blueTintBorder,
      iconColor: darkColors.blueLight,
    },
    rent: {
      panelBg: darkColors.surface,
      panelBorder: darkColors.amberTintBorder,
      tileBg: darkColors.amberTintBg,
      tileBorder: darkColors.amberTintBorder,
      iconColor: darkColors.amberLight,
    },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: darkConfig.panelBorder,
        backgroundColor: darkConfig.panelBg,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}>
      <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <Text
          className="text-xs"
          style={{ color: darkColors.textMuted }}
          numberOfLines={1}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          {prefix ? (
            <Text
              className="text-xs font-semibold"
              style={{ color: darkColors.textMuted }}>
              {prefix}
            </Text>
          ) : null}
          <Text
            className="text-lg font-bold"
            style={{ color: darkColors.text }}
            numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      <View
        style={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: darkConfig.tileBorder,
          backgroundColor: darkConfig.tileBg,
        }}>
        <Icon as={icon} size={18} color={darkConfig.iconColor} />
      </View>
    </View>
  );
}
