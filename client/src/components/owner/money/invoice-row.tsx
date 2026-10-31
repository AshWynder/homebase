import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { Invoice } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { BUCKET_THEME, FINANCE } from '@/constants/finance-theme';
import {
  getAmountPaid,
  getInvoiceBucket,
  type InvoiceBucket,
} from '@/lib/invoice-buckets';
import { formatKes, formatMonthDay, formatMonthYear, tenantName } from '@/lib/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BUCKET_THEME_DARK, FINANCE_DARK } from '@/constants/finance-theme';
import { darkColors, darkTints } from '@/theme/colors';

interface InvoiceRowProps {
  invoice: Invoice;
}

const styles = StyleSheet.create({
  text: { color: FINANCE.text },
  faintText: { color: FINANCE.faint },
});

function buildBucketStyles() {
  const avatar: Record<string, ViewStyle> = {};
  const avatarText: Record<string, { color: string }> = {};
  const badge: Record<string, ViewStyle> = {};
  const badgeText: Record<string, { color: string }> = {};

  (Object.keys(BUCKET_THEME) as InvoiceBucket[]).forEach((bucket) => {
    const theme = BUCKET_THEME[bucket];
    avatar[bucket] = {
      backgroundColor: theme.tint,
      borderColor: theme.avatarBorder,
    };
    avatarText[bucket] = { color: theme.color };
    badge[bucket] = {
      backgroundColor: theme.badge,
      borderColor: theme.color,
    };
    badgeText[bucket] = { color: theme.strong };
  });

  return {
    avatar: avatar as Record<InvoiceBucket, ViewStyle>,
    avatarText: avatarText as Record<InvoiceBucket, { color: string }>,
    badge: badge as Record<InvoiceBucket, ViewStyle>,
    badgeText: badgeText as Record<InvoiceBucket, { color: string }>,
  };
}

const bucketStyles = buildBucketStyles();

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase() || '?';
}

/** Compact invoice row used by the redesigned Invoices list. */
export function InvoiceRow({ invoice }: InvoiceRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const FD = FINANCE_DARK;
  const bucket = getInvoiceBucket(invoice);
  const theme = isDark ? BUCKET_THEME_DARK[bucket] : BUCKET_THEME[bucket];
  const name = tenantName(invoice.tenancy);
  const unitNumber =
    invoice.unit?.unitNumber ?? invoice.tenancy?.unit?.unitNumber ?? '—';
  const remaining = Math.max(0, Number(invoice.balanceDue));
  const amountPaid = getAmountPaid(invoice);
  const isOverduePartial = bucket === 'OVERDUE' && amountPaid > 0;
  const displayAmount = bucket === 'PAID' ? amountPaid : remaining;

  const avatarStyle = isDark
    ? {
        backgroundColor: theme.tint,
        borderColor: theme.avatarBorder,
        borderWidth: 1,
        borderRadius: 12,
      }
    : {
        backgroundColor: '#FEE2E2',
        borderWidth: 0,
        borderRadius: 12,
      };
  const avatarTextStyle = { color: isDark ? theme.strong : '#B91C1C' };
  const badgeStyle = isDark
    ? {
        backgroundColor: theme.badge,
        borderColor: theme.avatarBorder,
        borderWidth: 1,
      }
    : bucket === 'OVERDUE'
    ? {
        backgroundColor: '#FEE2E2',
        borderColor: 'rgba(185,28,28,0.35)',
        borderWidth: 1,
      }
    : {
        backgroundColor: theme.badge,
        borderColor: theme.avatarBorder,
        borderWidth: 1,
      };
  const badgeTextStyle = { color: theme.strong };

  return (
    <Pressable
      onPress={() => router.push(`/invoice/${invoice.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Invoice for ${name}, ${formatKes(displayAmount)}, ${theme.label}`}
      className="active:opacity-90">
      <Card
        className="flex-row items-center gap-3 rounded-2xl p-3 py-3 shadow-none"
        style={{
          backgroundColor: isDark ? darkColors.surface : undefined,
          borderColor: isDark ? darkColors.border : undefined,
          borderWidth: isDark ? 1 : undefined,
        }}>
        <View
          className="h-10 w-10 items-center justify-center rounded-full border"
          style={avatarStyle}>
          <Text className="text-xs font-bold" style={avatarTextStyle}>
            {initials(name)}
          </Text>
        </View>

        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] font-semibold"
            style={{ color: isDark ? darkColors.text : styles.text.color }}
            numberOfLines={1}>
            {name}
          </Text>
          <Text
            className="mt-0.5 text-xs"
            style={{ color: isDark ? darkColors.textMuted : styles.faintText.color }}
            numberOfLines={1}>
            Unit {unitNumber} • {formatMonthYear(invoice.periodStart)}
          </Text>
        </View>

        <View className="shrink-0 items-end gap-1">
          <Text
            className="text-[15px] font-bold"
            style={{ color: isDark ? darkColors.text : styles.text.color }}
            numberOfLines={1}>
            {formatKes(displayAmount)}
          </Text>
          <View className="flex-row items-center gap-1">
            <Badge className="rounded-md border px-1.5 py-0" style={badgeStyle}>
              <Text className="text-[9px] font-bold uppercase" style={badgeTextStyle}>
                {theme.label}
              </Text>
            </Badge>
            {isOverduePartial ? (
              <Badge
                className="rounded-md border px-1.5 py-0"
                style={{
                  backgroundColor: isDark
                    ? darkTints.indigo.bg
                    : bucketStyles.badge.PARTIAL.backgroundColor,
                  borderColor: isDark
                    ? darkTints.indigo.border
                    : bucketStyles.badge.PARTIAL.borderColor,
                  borderWidth: isDark ? 1 : undefined,
                }}>
                <Text
                  className="text-[9px] font-bold uppercase"
                  style={{
                    color: isDark
                      ? darkTints.indigo.text
                      : bucketStyles.badgeText.PARTIAL.color,
                  }}>
                  PARTIAL
                </Text>
              </Badge>
            ) : null}
            <Text
              className="text-[11px]"
              style={{ color: isDark ? darkColors.textMuted : styles.faintText.color }}>
              • {formatMonthDay(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <Icon as={ChevronRight} size={16} color={isDark ? darkColors.textDim : FINANCE.faint} />
      </Card>
    </Pressable>
  );
}
