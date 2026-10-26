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

interface StatCardProps {
  bucket: InvoiceBucket;
  count: number;
  amount: number;
  selected: boolean;
  onPress: () => void;
}

const DEFAULT_CARD_STYLE = {
  backgroundColor: '#ffffff',
  borderColor: FINANCE.border,
  borderWidth: 1,
} as const;

const ZERO_CARD_STYLE = {
  backgroundColor: ZERO_CARD_BACKGROUND,
  borderColor: FINANCE.border,
  borderWidth: 1,
  opacity: 0.6,
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
  const theme: BucketTheme = BUCKET_THEME[bucket];
  const isZero = count === 0;
  const isDisabled = isZero && !selected;

  const labelStyle = useMemo(
    () => (isDisabled ? ZERO_TEXT_STYLE : { color: theme.color }),
    [isDisabled, theme.color],
  );
  const amountStyle = useMemo(
    () =>
      isDisabled
        ? ZERO_TEXT_STYLE
        : selected
          ? { color: theme.strong }
          : DEFAULT_AMOUNT_STYLE,
    [isDisabled, selected, theme.strong],
  );
  const countStyle = useMemo(
    () => (isDisabled ? ZERO_COUNT_STYLE : selected ? { color: theme.strong } : undefined),
    [isDisabled, selected, theme.strong],
  );
  const activeBadgeStyle = useMemo(
    () => ({ backgroundColor: theme.badge, borderColor: theme.color }),
    [theme.badge, theme.color],
  );
  const activeBadgeTextStyle = useMemo(() => ({ color: theme.strong }), [theme.strong]);
  const dotWrapperStyle = useMemo(
    () => (selected ? { backgroundColor: theme.badge } : undefined),
    [selected, theme.badge],
  );
  const dotStyle = useMemo(
    () => ({ backgroundColor: isDisabled ? FINANCE.faint : theme.color }),
    [isDisabled, theme.color],
  );

  const cardStyle = isDisabled
    ? ZERO_CARD_STYLE
    : selected
      ? SELECTED_CARD_STYLES[bucket]
      : DEFAULT_CARD_STYLE;

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
