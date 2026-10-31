import { Platform, StyleSheet, View } from 'react-native';
import { Building2 } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { FINANCE } from '@/constants/finance-theme';
import { darkColors } from '@/theme/colors';
import { formatKes } from '@/lib/format';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!isDark) {
    const rawFormatted = formatKes(totalOutstanding);
    const numberOnly = rawFormatted.replace(/^KES\s*/, '');
    return (
      <LinearGradient
        colors={['#00563A', '#006241', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1FAE5' }} />
            <Text style={{ color: '#D1FAE5', fontSize: 12, fontWeight: '500' }}>
              Total Outstanding Balance
            </Text>
          </View>

          <View
            style={{
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)',
              backgroundColor: '#D1FAE5',
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
            <Text style={{ color: '#006241', fontSize: 11, fontWeight: '700' }}>
              {invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'} Due
            </Text>
          </View>
        </View>

        <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700', marginTop: 8 }} numberOfLines={1}>
          <Text style={{ color: '#A7F3D0', fontSize: 16, fontWeight: '600' }}>KES </Text>
          {numberOnly}
        </Text>

        {secondaryLabel ? (
          <Text style={{ color: '#A7F3D0', fontSize: 12, marginTop: 6 }} numberOfLines={1}>
            {secondaryLabel}
          </Text>
        ) : null}
      </LinearGradient>
    );
  }

  const rawFormatted = formatKes(totalOutstanding);
  const numberOnly = rawFormatted.replace(/^KES\s*/, '');

  return (
    <LinearGradient
      colors={['rgba(16,185,129,0.14)', darkColors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-2xl p-4"
      style={{
        backgroundColor: darkColors.surface,
        borderColor: 'rgba(16,185,129,0.25)',
        borderWidth: 1,
        shadowColor: darkColors.emerald,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0,
        shadowRadius: 16,
      }}>
      {/* Row 1: Left: amber dot + label; Right: Invoices Due pill */}
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: darkColors.amber }} />
          <Text className="text-[12px] font-medium" style={{ color: darkColors.textSlateLight }}>
            Total Outstanding Balance
          </Text>
        </View>

        <View
          className="rounded-full border px-2.5 py-1"
          style={{
            backgroundColor: darkColors.emeraldTintBg,
            borderColor: darkColors.emeraldTintBorder,
            borderWidth: 1,
          }}>
          <Text className="text-[11px] font-semibold" style={{ color: darkColors.emeraldLight }}>
            {invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'} Due
          </Text>
        </View>
      </View>

      {/* Row 2: Currency KES prefix in teal + large bold white amount */}
      <Text
        className="mt-2 text-[32px] font-bold leading-10"
        style={{ color: darkColors.text }}
        numberOfLines={1}>
        <Text className="text-[16px] font-semibold" style={{ color: darkColors.teal }}>
          KES{' '}
        </Text>
        {numberOnly}
      </Text>

      {/* Row 3: Building icon in teal + property name in muted gray */}
      {secondaryLabel ? (
        <View className="mt-2 flex-row items-center gap-1.5">
          <Icon as={Building2} size={14} color={darkColors.teal} />
          <Text className="text-[12px]" style={{ color: darkColors.textMuted }} numberOfLines={1}>
            {secondaryLabel}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}
