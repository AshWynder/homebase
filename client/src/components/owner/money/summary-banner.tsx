import { StyleSheet, View } from 'react-native';

import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { FINANCE } from '@/constants/finance-theme';
import { formatKes } from '@/lib/format';

interface SummaryBannerProps {
  totalOutstanding: number;
  invoiceCount: number;
  secondaryLabel: string;
}

const styles = StyleSheet.create({
  label: { color: 'rgba(255,255,255,0.8)' },
  amount: { color: '#ffffff' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: { color: '#ffffff' },
  secondary: { color: 'rgba(255,255,255,0.7)' },
});

/** The portfolio-wide outstanding balance summary above the stat cards. */
export function SummaryBanner({
  totalOutstanding,
  invoiceCount,
  secondaryLabel,
}: SummaryBannerProps) {
  return (
    <LinearGradient
      colors={[FINANCE.primary, FINANCE.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-2xl p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />
            <Text className="text-[12px] font-medium" style={styles.label}>
              Total Outstanding Balance
            </Text>
          </View>
          <Text
            className="mt-1 text-[28px] font-bold leading-9"
            style={styles.amount}
            numberOfLines={1}>
            {formatKes(totalOutstanding)}
          </Text>
        </View>

        <View className="items-end gap-1">
          <View className="rounded-full border px-3 py-1" style={styles.pill}>
            <Text className="text-[12px] font-semibold" style={styles.pillText}>
              {invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'} Due
            </Text>
          </View>
          <Text className="max-w-[120px] text-[10px]" style={styles.secondary} numberOfLines={1}>
            {secondaryLabel}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
