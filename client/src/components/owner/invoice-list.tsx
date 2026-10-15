import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { InvoiceStatusPills, STATUS_STYLES } from '@/components/owner/invoice-status';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { PropertyFilterBar } from '@/components/owner/property-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { formatDate, formatKes, formatPeriod, tenantName } from '@/lib/format';
import { useStore } from '@/stores/use-store';
import { ChevronRight } from 'lucide-react-native';

/** Invoices segment of the Money tab. */
export function InvoiceList() {
  const [search, setSearch] = useState('');
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const statusFilter = useStore((s) => s.invoiceStatusFilter);

  const propertyId = selectedPropertyId ?? undefined;
  const invoices = useInvoices(
    statusFilter === 'ALL'
      ? { propertyId }
      : { status: statusFilter, propertyId },
  );

  const query = search.trim().toLowerCase();
  const items = useMemo(() => {
    const all = invoices.data?.items ?? [];
    if (!query) return all;
    return all.filter((item) => tenantName(item.tenancy).toLowerCase().includes(query));
  }, [invoices.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== null;

  return (
    <View className="flex-1">
      <PropertyFilterBar search={search} onSearchChange={setSearch} />
      <InvoiceStatusPills />

      {invoices.isLoading ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ListMessage
          title="Couldn't load invoices"
          subtitle={(invoices.error as Error).message}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-5 gap-3"
          ListEmptyComponent={
            <ListMessage
              title={isFiltered ? 'No invoices found' : 'No invoices'}
              subtitle={
                isFiltered
                  ? 'Try a different search, property or status filter.'
                  : 'Generate invoices for the current billing period.'
              }
            />
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLES[item.status];
            return (
              <Pressable
                onPress={() => router.push(`/invoice/${item.id}`)}
                className="gap-3 rounded-2xl border border-border bg-card p-4 active:bg-muted">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-foreground">
                      {tenantName(item.tenancy)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">{formatPeriod(item.periodStart)}</Text>
                  </View>
                  <Badge variant="secondary" className={style.bg}>
                    <Text className={`text-[11px] font-semibold ${style.text}`}>{style.label}</Text>
                  </Badge>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">Amount Due</Text>
                  <Text className="text-base font-bold text-foreground">
                    {formatKes(item.balanceDue)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Due: {formatDate(item.dueDate)}</Text>
                  <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
