import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { ScreenHeader } from '@/components/owner/screen-header';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { usePayments } from '@/hooks/queries/use-payments';
import { useProperties } from '@/hooks/queries/use-properties';
import { formatDateTime, formatKes, tenantName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ChevronRight, CreditCard, DollarSign, Search, X } from 'lucide-react-native';
import type { Payment, PaymentMethod, PaymentStatus } from '@/api/types';

type SelectOption = { value: string; label: string };
const ALL_PROPERTIES: SelectOption = { value: 'all', label: 'All properties' };

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
  SUCCESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'SUCCESS' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'FAILED' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PENDING' },
};

const METHOD_ICONS = { MPESA_STK: DollarSign, MPESA_C2B: DollarSign, CARD: CreditCard } as const;
const METHOD_LABELS = { MPESA_STK: 'M-Pesa', MPESA_C2B: 'M-Pesa', CARD: 'Card' } as const;

export default function PaymentsScreen() {
  const [property, setProperty] = useState<Option | undefined>(ALL_PROPERTIES);
  const [search, setSearch] = useState('');

  const properties = useProperties();
  const selectedPropertyId =
    property && property.value !== ALL_PROPERTIES.value ? property.value : undefined;

  const payments = usePayments({ propertyId: selectedPropertyId, limit: 100 });

  const propertyOptions = useMemo<SelectOption[]>(
    () => [
      ALL_PROPERTIES,
      ...(properties.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties.data],
  );

  // Client-side tenant name search over the owner's payments
  const query = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const items = payments.data?.items ?? [];
    if (!query) return items;
    return items.filter((item) => {
      const tenant = item.invoice?.tenancy?.tenant?.user?.name ?? '';
      return tenant.toLowerCase().includes(query);
    });
  }, [payments.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== undefined;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader title="Payments" />

      <View className="gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <Select value={property} onValueChange={setProperty}>
          <SelectTrigger className="w-full rounded-lg border-2 border-primary">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            {propertyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <View>
          <Icon as={Search} size={16} className="absolute left-3 top-3 text-slate-400" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search tenants by name"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className={cn(
              'rounded-lg border-2 border-primary pl-9',
              'focus-visible:border-primary focus-visible:ring-primary/30',
              search.length > 0 && 'pr-9',
            )}
          />
          {search.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setSearch('')}
              accessibilityLabel="Clear search"
              className="absolute right-2 top-2 p-1">
              <Icon as={X} size={16} className="text-slate-400" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {payments.isLoading ? (
        <ListSkeleton />
      ) : payments.isError ? (
        <ListMessage
          title="Couldn't load payments"
          subtitle={(payments.error as Error).message}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            isFiltered ? (
              <ListMessage
                title="No payments found"
                subtitle="Try a different search or property filter."
              />
            ) : (
              <ListMessage
                title="No payments"
                subtitle="Payment records will appear here once tenants make payments."
              />
            )
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLES[item.status];
            const IconCmp = METHOD_ICONS[item.method];
            const tenant = item.invoice?.tenancy?.tenant?.user?.name ?? 'Unknown tenant';
            const property = item.invoice?.unit?.property?.name ?? 'Property';
            const unit = item.invoice?.unit?.unitNumber ?? '—';
            const period = item.invoice?.periodStart ? new Date(item.invoice.periodStart).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '—';

            return (
              <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-slate-900">{tenant}</Text>
                    <Text className="text-sm text-slate-500">
                      {property} • Unit {unit} • {period}
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
                      <Icon as={IconCmp} size={16} className="text-slate-600" />
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
    </SafeAreaView>
  );
}
