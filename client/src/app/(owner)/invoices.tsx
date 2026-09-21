import { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GenerateInvoicesDialog } from '@/components/owner/generate-invoices-dialog';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { SendPaymentDialog } from '@/components/owner/send-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { formatDate, formatKes, formatPeriod, tenantName } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import { ChevronRight, Send } from 'lucide-react-native';
import type { Invoice, InvoiceStatus } from '@/api/types';

const FILTERS: (InvoiceStatus | 'ALL')[] = ['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  UNPAID: { bg: 'bg-red-100', text: 'text-red-700', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PARTIAL' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PAID' },
  OVERDUE: { bg: 'bg-red-200', text: 'text-red-800', label: 'OVERDUE' },
};

export default function InvoicesScreen() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const statusFilter = useStore((s) => s.invoiceStatusFilter);
  const setStatusFilter = useStore((s) => s.setInvoiceStatusFilter);

  const invoices = useInvoices(statusFilter === 'ALL' ? {} : { status: statusFilter });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Invoices"
        onAdd={() => setGenerateOpen(true)}
        addLabel="Generate invoices"
      />

      <View className="border-b border-slate-200 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
          {FILTERS.map((f) => {
            const active = statusFilter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setStatusFilter(f)}
                className={`rounded-full px-3 py-1 ${
                  active ? 'bg-teal-700' : 'bg-slate-100'
                }`}>
                <Text
                  className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
                  {f === 'PARTIALLY_PAID' ? 'PARTIAL' : f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {invoices.isLoading ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ListMessage
          title="Couldn't load invoices"
          subtitle={(invoices.error as Error).message}
        />
      ) : (
        <FlatList
          data={invoices.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <ListMessage
              title="No invoices"
              subtitle="Generate invoices for the current billing period."
            />
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLES[item.status];
            const payable = item.status === 'UNPAID' || item.status === 'OVERDUE';
            return (
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-slate-900">
                      {tenantName(item.tenancy)}
                    </Text>
                    <Text className="text-sm text-slate-500">{formatPeriod(item.periodStart)}</Text>
                  </View>
                  <Badge variant="secondary" className={style.bg}>
                    <Text className={`text-[11px] font-semibold ${style.text}`}>
                      {style.label}
                    </Text>
                  </Badge>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Amount Due</Text>
                  <Text className="text-base font-bold text-slate-900">
                    {formatKes(item.balanceDue)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</Text>
                  <Icon as={ChevronRight} size={16} className="text-slate-400" />
                </View>

                {payable ? (
                  <Pressable
                    onPress={() => setSelected(item)}
                    className="flex-row items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 active:bg-teal-800">
                    <Icon as={Send} size={15} className="text-white" />
                    <Text className="text-sm font-semibold text-white">Send Payment Link</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <SendPaymentDialog
        invoice={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <GenerateInvoicesDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </SafeAreaView>
  );
}