import { Pressable, View } from 'react-native';

import { STATUS_STYLES } from '@/components/owner/invoice-status';
import { Text } from '@/components/ui/text';
import { useInvoiceSummary } from '@/hooks/queries/use-invoices';
import { useStore } from '@/stores/use-store';
import { formatCompactKes } from '@/lib/format';

/** Rendered in the same order as the status pills, minus the "All" option. */
const TILES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
] as const;

interface InvoiceSummaryTilesProps {
  /** Called after a tile is picked, so Money can reveal the Invoices segment. */
  onSelect?: () => void;
}

/**
 * Portfolio-level invoice totals, shown above the invoice list. Each tile is a
 * shortcut into the filtered list rather than a chart, so the numbers here come
 * from the same status rules the list below uses. `onSelect` exists so a caller
 * rendering these outside the Invoices segment can switch to it on tap.
 */
export function InvoiceSummaryTiles({ onSelect }: InvoiceSummaryTilesProps = {}) {
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const setInvoiceStatusFilter = useStore((s) => s.setInvoiceStatusFilter);
  const { data, isPending } = useInvoiceSummary(
    selectedPropertyId ? { propertyId: selectedPropertyId } : {},
  );

  const onPress = (status: (typeof TILES)[number]) => {
    setInvoiceStatusFilter(status);
    onSelect?.();
  };

  return (
    <View className="flex-row flex-wrap gap-3">
      {TILES.map((status) => {
        const style = STATUS_STYLES[status];
        const entry = data?.byStatus[status];

        return (
          <Pressable
            key={status}
            onPress={() => onPress(status)}
            accessibilityRole="button"
            accessibilityLabel={`${style.label}: ${
              isPending || !entry ? 'loading' : `${entry.count} invoices, ${entry.total} KES`
            }`}
            className={`min-w-[46%] flex-1 gap-1 rounded-2xl border border-slate-200 p-3 active:bg-slate-50`}>
            <Text className={`text-xs font-semibold ${style.text}`}>{style.label}</Text>
            {isPending || !entry ? (
              <Text className="text-lg font-bold text-slate-300">—</Text>
            ) : (
              <>
                <Text className="text-lg font-bold text-slate-900">
                  {formatCompactKes(entry.total)}
                </Text>
                <Text className="text-xs text-slate-500">
                  {entry.count} {entry.count === 1 ? 'invoice' : 'invoices'}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
