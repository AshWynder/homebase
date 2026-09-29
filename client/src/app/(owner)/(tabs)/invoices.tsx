import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { GenerateInvoicesDialog } from '@/components/owner/generate-invoices-dialog';
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
import { Toast } from '@/components/ui/toast';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { useProperties } from '@/hooks/queries/use-properties';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatKes, formatPeriod, tenantName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/use-store';
import { ChevronRight, Search, X } from 'lucide-react-native';
import type { InvoiceStatus } from '@/api/types';

const FILTERS: (InvoiceStatus | 'ALL')[] = ['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

type SelectOption = { value: string; label: string };
const ALL_PROPERTIES: SelectOption = { value: 'all', label: 'All properties' };

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  UNPAID: { bg: 'bg-red-100', text: 'text-red-700', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PARTIAL' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PAID' },
  OVERDUE: { bg: 'bg-red-200', text: 'text-red-800', label: 'OVERDUE' },
};

export default function InvoicesScreen() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [property, setProperty] = useState<Option | undefined>(ALL_PROPERTIES);
  const [search, setSearch] = useState('');
  const statusFilter = useStore((s) => s.invoiceStatusFilter);
  const setStatusFilter = useStore((s) => s.setInvoiceStatusFilter);

  const properties = useProperties();
  const invoices = useInvoices(
    statusFilter === 'ALL'
      ? { propertyId: property && property.value !== ALL_PROPERTIES.value ? property.value : undefined }
      : { status: statusFilter, propertyId: property && property.value !== ALL_PROPERTIES.value ? property.value : undefined }
  );
  const { visible, message, type, showToast, hideToast } = useToast();

  const propertyOptions = useMemo<SelectOption[]>(
    () => [
      ALL_PROPERTIES,
      ...(properties.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties.data],
  );

  const selectedPropertyId =
    property && property.value !== ALL_PROPERTIES.value ? property.value : undefined;

  // Client-side tenant name search over the owner's invoices
  const query = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const items = invoices.data?.items ?? [];
    if (!query) return items;
    return items.filter((item) => tenantName(item.tenancy).toLowerCase().includes(query));
  }, [invoices.data, query]);

  const isFiltered = query.length > 0 || selectedPropertyId !== undefined;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScreenHeader
        title="Invoices"
        onAdd={() => setGenerateOpen(true)}
        addLabel="Generate invoices"
      />

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
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            isFiltered ? (
              <ListMessage
                title="No invoices found"
                subtitle="Try a different search or property filter."
              />
            ) : (
              <ListMessage
                title="No invoices"
                subtitle="Generate invoices for the current billing period."
              />
            )
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLES[item.status];
            return (
              <Pressable
                onPress={() => router.push(`/invoice/${item.id}`)}
                className="gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
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
              </Pressable>
            );
          }}
        />
      )}

      <GenerateInvoicesDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onToast={showToast}
      />
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
