import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePayments } from '@/hooks/queries/use-payments';
import { formatDateTime, formatKes, formatMonthYear } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import { CreditCard, DollarSign } from 'lucide-react-native';
import type { PaymentMethod, PaymentStatus } from '@/api/types';

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
  SUCCESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'SUCCESS' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'FAILED' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PENDING' },
};

const METHOD_ICONS = {
  MPESA_STK: DollarSign,
  MPESA_C2B: DollarSign,
  CARD: CreditCard,
} as const;

const METHOD_LABELS: Record<PaymentMethod, string> = {
  MPESA_STK: 'M-Pesa',
  MPESA_C2B: 'M-Pesa',
  CARD: 'Card',
};

/** Payments segment of the Money tab. */
export function PaymentList() {
  const [search, setSearch] = useState('');
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);

  const payments = usePayments({ propertyId: selectedPropertyId ?? undefined, limit: 100 });

  const query = search.trim().toLowerCase();
  const items = useMemo(() => {
    const all = payments.data?.items ?? [];
    if (!query) return all;
    return all.filter((item) => {
      const tenant = item.invoice?.tenancy?.tenant?.user?.name ?? '';
      return tenant.toLowerCase().includes(query);
    });
  }, [payments.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== null;

  return (
    <View className="flex-1">
      <PropertyFilterBar search={search} onSearchChange={setSearch} />

      {payments.isLoading ? (
        <ListSkeleton />
      ) : payments.isError ? (
        <ListMessage
          title="Couldn't load payments"
          subtitle={(payments.error as Error).message}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <ListMessage
              title={isFiltered ? 'No payments found' : 'No payments'}
              subtitle={
                isFiltered
                  ? 'Try a different search or property filter.'
                  : 'Payment records will appear here once tenants make payments.'
              }
            />
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLES[item.status];
            const MethodIcon = METHOD_ICONS[item.method];
            const tenant = item.invoice?.tenancy?.tenant?.user?.name ?? 'Unknown tenant';
            const propertyName = item.invoice?.unit?.property?.name ?? 'Property';
            const unitNumber = item.invoice?.unit?.unitNumber ?? '—';

            return (
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-slate-900">{tenant}</Text>
                    <Text className="text-sm text-slate-500">
                      {propertyName} • Unit {unitNumber} •{' '}
                      {formatMonthYear(item.invoice?.periodStart)}
                    </Text>
                  </View>
                  <Badge variant="secondary" className={style.bg}>
                    <Text className={`text-[11px] font-semibold ${style.text}`}>
                      {style.label}
                    </Text>
                  </Badge>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Icon as={MethodIcon} size={16} className="text-slate-600" />
                    </View>
                    <Text className="text-sm text-slate-600">{METHOD_LABELS[item.method]}</Text>
                  </View>
                  <Text className="text-base font-bold text-slate-900">
                    {formatKes(item.amount)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</Text>
                  <Text className="text-xs text-slate-400">{item.transactionRef}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
