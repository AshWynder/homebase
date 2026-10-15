import { ScrollView, Pressable, StyleSheet, View } from 'react-native';

import { useDeferredChange } from '@/hooks/use-deferred-change';
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
  UNPAID: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-warning/10', text: 'text-warning', label: 'PARTIAL' },
  PAID: { bg: 'bg-success/10', text: 'text-success', label: 'PAID' },
  OVERDUE: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'OVERDUE' },
};

/** Horizontal status filter for the invoice list. */
export function InvoiceStatusPills() {
  const statusFilter = useStore((s) => s.invoiceStatusFilter);
  const setStatusFilter = useStore((s) => s.setInvoiceStatusFilter);
  const onStatusChange = useDeferredChange(statusFilter, setStatusFilter);

  return (
    <View className="border-b border-border bg-background">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-5 py-3 gap-2">
        {INVOICE_STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <Pressable
              key={status}
              onPress={() => onStatusChange(status)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={
                status === 'ALL' ? 'All statuses' : `${STATUS_STYLES[status].label} invoices`
              }
              className="rounded-full px-3 py-1"
              style={isActive ? styles.pillActive : styles.pillInactive}>
              <Text
                className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                {status === 'ALL' ? status : STATUS_STYLES[status].label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  pillActive: { backgroundColor: '#0F766E' },
  pillInactive: { backgroundColor: '#F1F5F9' },
});
