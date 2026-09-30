import { ScrollView, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useStore } from '@/stores/use-store';
import type { InvoiceStatus } from '@/api/types';

export const INVOICE_STATUS_FILTERS: (InvoiceStatus | 'ALL')[] = [
  'ALL',
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
];

/**
 * Shared by the invoice list pills and the Money summary tiles so a status
 * always wears the same colour wherever it appears.
 */
export const STATUS_STYLES: Record<
  InvoiceStatus,
  { bg: string; text: string; label: string }
> = {
  UNPAID: { bg: 'bg-red-100', text: 'text-red-700', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PARTIAL' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PAID' },
  OVERDUE: { bg: 'bg-red-200', text: 'text-red-800', label: 'OVERDUE' },
};

/** Horizontal status filter for the invoice list. */
export function InvoiceStatusPills() {
  const statusFilter = useStore((s) => s.invoiceStatusFilter);
  const setStatusFilter = useStore((s) => s.setInvoiceStatusFilter);

  return (
    <View className="border-b border-slate-200 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
        {INVOICE_STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={
                status === 'ALL' ? 'All statuses' : `${STATUS_STYLES[status].label} invoices`
              }
              className={`rounded-full px-3 py-1 ${isActive ? 'bg-teal-700' : 'bg-slate-100'}`}>
              <Text
                className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {status === 'ALL' ? status : STATUS_STYLES[status].label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
