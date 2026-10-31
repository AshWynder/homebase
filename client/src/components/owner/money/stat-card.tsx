import { useMemo } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  BUCKET_THEME,
  FINANCE,
  ZERO_CARD_BACKGROUND,
  type BucketTheme,
} from '@/constants/finance-theme';
import type { InvoiceBucket } from '@/lib/invoice-buckets';
import { formatCompactKes, formatKes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BUCKET_THEME_DARK, FINANCE_DARK } from '@/constants/finance-theme';
import { darkColors } from '@/theme/colors';

interface StatCardProps {
  bucket: InvoiceBucket;
  count: number;
  amount: number;
  selected: boolean;
  onPress: () => void;
}

const DEFAULT_CARD_STYLE = {
  backgroundColor: '#ffffff',
  borderColor: '#E2E8F0',
  borderWidth: 1,
  shadowColor: 'rgba(15,23,42,0.06)',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 8,
} as const;

function buildSelectedCardStyles(): Record<InvoiceBucket, ViewStyle> {
  return Object.fromEntries(
    (Object.keys(BUCKET_THEME) as InvoiceBucket[]).map((bucket) => {
      const theme = BUCKET_THEME[bucket];
      return [
        bucket,
        {
          backgroundColor: theme.tint,
          borderColor: theme.color,
          borderWidth: 1.5,
          shadowColor: theme.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 3,
        },
      ];
    }),
  ) as Record<InvoiceBucket, ViewStyle>;
}

const SELECTED_CARD_STYLES = buildSelectedCardStyles();

const ZERO_TEXT_STYLE = { color: FINANCE.faint } as const;
const ZERO_COUNT_STYLE = { color: '#cbd5e1' } as const;
const DEFAULT_AMOUNT_STYLE = { color: FINANCE.text } as const;

function amountLabel(amount: number): string {
  return amount === 0 ? formatKes(0) : formatCompactKes(amount);
}

/** A single invoice bucket card. Doubles as the list's status filter. */
export function StatCard({ bucket, count, amount, selected, onPress }: StatCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const FD = FINANCE_DARK;
  const theme: BucketTheme = isDark ? BUCKET_THEME_DARK[bucket] : BUCKET_THEME[bucket];
  const isZero = count === 0;
  const isDisabled = isZero && !selected;

  const labelStyle = useMemo(() => {
    if (isDark) {
      return { color: theme.color };
    }
    return { color: '#334155' };
  }, [isDark, theme.color]);

  const amountStyle = useMemo(() => {
    if (isDark) {
      return { color: darkColors.text };
    }
    if (bucket === 'OVERDUE') {
      return { color: '#B91C1C' };
    }
    return { color: '#0F172A' };
  }, [isDark, bucket]);

  const countStyle = useMemo(() => {
    if (isDark) {
      return { color: darkColors.textMuted };
    }
    return { color: '#64748B' };
  }, [isDark]);

  const activeBadgeStyle = useMemo(() => {
    if (isDark) {
      if (bucket === 'OVERDUE') {
        return {
          backgroundColor: darkColors.redTintBg,
          borderColor: darkColors.redTintBorder,
          borderWidth: 1,
        };
      }
      return {
        backgroundColor: theme.badge,
        borderColor: theme.avatarBorder,
        borderWidth: 1,
      };
    }
    if (bucket === 'OVERDUE') {
      return {
        backgroundColor: '#FECACA',
        borderWidth: 0,
      };
    }
    return { backgroundColor: theme.badge, borderColor: theme.color };
  }, [isDark, bucket, theme.badge, theme.avatarBorder, theme.color]);

  const activeBadgeTextStyle = useMemo(() => {
    if (isDark) {
      return { color: bucket === 'OVERDUE' ? darkColors.red : theme.strong };
    }
    return { color: bucket === 'OVERDUE' ? '#B91C1C' : theme.strong };
  }, [isDark, bucket, theme.strong]);

  const dotWrapperStyle = useMemo(() => {
    if (isDark) {
      return undefined;
    }
    return selected ? { backgroundColor: theme.badge } : undefined;
  }, [isDark, selected, theme.badge]);

  const dotStyle = useMemo(() => {
    if (isDark) {
      return { backgroundColor: theme.color };
    }
    if (bucket === 'PAID') {
      return { backgroundColor: '#006241' };
    }
    if (bucket === 'OVERDUE') {
      return { backgroundColor: '#B91C1C' };
    }
    return { backgroundColor: '#94A3B8' };
  }, [isDark, bucket]);

  const cardStyle = useMemo(() => {
    if (isDark) {
      if (selected) {
        return {
          backgroundColor: bucket === 'OVERDUE' ? '#1D2130' : darkColors.surfaceElevated,
          borderColor: darkColors.borderStrong,
          borderWidth: 1,
        };
      }
      return {
        backgroundColor: darkColors.surface,
        borderColor: darkColors.border,
        borderWidth: 1,
      };
    }

    if (bucket === 'OVERDUE') {
      return {
        backgroundColor: '#FEDADA',
        borderColor: 'rgba(185,28,28,0.15)',
        borderWidth: 1,
        shadowColor: 'rgba(15,23,42,0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      };
    }

    return DEFAULT_CARD_STYLE;
  }, [isDark, selected, bucket]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, selected }}
      accessibilityLabel={`${theme.label}: ${count} invoices, ${formatKes(amount)}`}
      className="min-w-[46%] flex-1 active:opacity-90">
      <Card
        className="min-h-[88px] justify-between gap-0 rounded-2xl p-3 shadow-none"
        style={cardStyle}>
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <Text
              className="text-[10px] font-bold uppercase tracking-[1px]"
              style={labelStyle}
              numberOfLines={1}>
              {theme.label}
            </Text>
            {selected ? (
              <Badge className="rounded border px-1.5 py-0" style={activeBadgeStyle}>
                <Text className="text-[8px] font-bold uppercase" style={activeBadgeTextStyle}>
                  Active
                </Text>
              </Badge>
            ) : null}
          </View>

          <View
            className="h-3.5 w-3.5 items-center justify-center rounded-full"
            style={dotWrapperStyle}>
            <View className="h-2 w-2 rounded-full" style={dotStyle} />
          </View>
        </View>

        <Text
          className={cn('font-bold', selected ? 'text-2xl' : 'text-[22px]')}
          style={amountStyle}
          numberOfLines={1}>
          {amountLabel(amount)}
        </Text>

        <Text className="text-[11px]" style={countStyle} numberOfLines={1}>
          {count} {count === 1 ? 'invoice' : 'invoices'}
          {selected ? ' • Filtered' : ''}
        </Text>
      </Card>
    </Pressable>
  );
}
