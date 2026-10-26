import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Plus, ReceiptText, Search } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { Invoice } from '@/api/types';
import { ListMessage, ListSkeleton } from '@/components/owner/list-state';
import { InvoiceRow } from '@/components/owner/money/invoice-row';
import { PropertySelectorField } from '@/components/owner/money/property-selector-field';
import {
  INVOICE_SORT_OPTIONS,
  SortSheet,
  type InvoiceSortKey,
} from '@/components/owner/money/sort-sheet';
import { StatCard } from '@/components/owner/money/stat-card';
import { SummaryBanner } from '@/components/owner/money/summary-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { BUCKET_THEME, FINANCE, STAT_CARD_BUCKETS } from '@/constants/finance-theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDeferredChange } from '@/hooks/use-deferred-change';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { useProperties } from '@/hooks/queries/use-properties';
import {
  getBucketTotals,
  getInvoiceBucket,
  type InvoiceBucket,
} from '@/lib/invoice-buckets';
import { tenantName } from '@/lib/format';
import { useStore } from '@/stores/use-store';

type Segment = 'invoices' | 'payments';

const PAGE_SIZE = 5;
const EMPTY_INVOICES: Invoice[] = [];

const styles = StyleSheet.create({
  headerLabel: { color: FINANCE.faint },
  headerTitle: { color: FINANCE.text },
  headerButton: {
    backgroundColor: FINANCE.primary,
    shadowColor: FINANCE.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  tabActiveText: { color: FINANCE.primary },
  tabInactiveText: { color: FINANCE.muted },
  input: { borderColor: FINANCE.border, color: FINANCE.text },
  filterButtonBorder: { borderColor: FINANCE.border },
  listHeaderText: { color: FINANCE.muted },
  sortLink: { color: FINANCE.primary },
  showMoreBorder: { borderColor: FINANCE.border },
  showMoreText: { color: FINANCE.primary },
});

interface InvoicesTabProps {
  onShowPayments: () => void;
  onAdd: () => void;
}

function MoneyHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={styles.headerLabel}>
          FINANCES
        </Text>
        <Text className="text-2xl font-bold" style={styles.headerTitle}>
          Money
        </Text>
      </View>

      <Button
        onPress={onAdd}
        size="icon"
        accessibilityRole="button"
        accessibilityLabel="Generate invoices"
        className="h-11 w-11 rounded-full shadow-none active:opacity-90"
        style={styles.headerButton}>
        <Icon as={Plus} size={24} color="#ffffff" />
      </Button>
    </View>
  );
}

function MoneyTabs({ onShowPayments }: { onShowPayments: () => void }) {
  const requestSegment = useDeferredChange<Segment>('invoices', (next) => {
    if (next === 'payments') onShowPayments();
  });

  return (
    <Tabs
      value="invoices"
      onValueChange={(next) => {
        if (next === 'payments') requestSegment('payments');
      }}
      className="gap-0">
      <TabsList className="h-auto w-full flex-row items-center rounded-2xl border border-[#e2e8f0] bg-[#eef2f6] p-1">
        <TabsTrigger
          value="invoices"
          className="h-10 flex-1 rounded-xl border-0 bg-white shadow-sm shadow-black/5">
          <Text className="text-sm font-bold" style={styles.tabActiveText}>
            Invoices
          </Text>
        </TabsTrigger>
        <TabsTrigger
          value="payments"
          className="h-10 flex-1 rounded-xl border-0 bg-transparent shadow-none">
          <Text className="text-sm font-bold" style={styles.tabInactiveText}>
            Payments
          </Text>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

interface SearchRowProps {
  value: string;
  onChange: (value: string) => void;
  sortKey: InvoiceSortKey;
  onSortChange: (value: InvoiceSortKey) => void;
}

function SearchRow({ value, onChange, sortKey, onSortChange }: SearchRowProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <View pointerEvents="none" className="absolute left-3 top-0 z-10 h-11 justify-center">
          <Icon as={Search} size={18} color={FINANCE.faint} />
        </View>
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="Search tenants or unit..."
          placeholderTextColor={FINANCE.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className="h-11 rounded-xl border bg-white pl-10 pr-3 text-sm"
          style={styles.input}
        />
      </View>

      <SortSheet value={sortKey} onChange={onSortChange}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sort invoices"
          className="h-11 w-11 items-center justify-center rounded-xl border bg-white active:opacity-80"
          style={styles.filterButtonBorder}>
          <Icon as={Filter} size={18} color={FINANCE.muted} />
        </Pressable>
      </SortSheet>
    </View>
  );
}

interface ListHeaderRowProps {
  bucket: InvoiceBucket | null;
  shown: number;
  total: number;
  sortKey: InvoiceSortKey;
  onSortChange: (value: InvoiceSortKey) => void;
}

function ListHeaderRow({ bucket, shown, total, sortKey, onSortChange }: ListHeaderRowProps) {
  const theme = bucket ? BUCKET_THEME[bucket] : null;
  const title = theme?.listLabel ?? 'ALL INVOICES';
  const sortLabel =
    INVOICE_SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? 'Due Date';

  const badgeStyle = useMemo(
    () => ({
      backgroundColor: theme?.badge ?? '#e2e8f0',
      borderColor: theme?.color ?? '#e2e8f0',
    }),
    [theme?.badge, theme?.color],
  );
  const badgeTextStyle = useMemo(
    () => ({ color: theme?.strong ?? FINANCE.muted }),
    [theme?.strong],
  );

  return (
    <View className="flex-row items-center justify-between gap-3 pt-1">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Text
          className="text-[11px] font-bold uppercase tracking-[1px]"
          style={styles.listHeaderText}
          numberOfLines={1}>
          {title}
        </Text>
        <Badge className="rounded-full border px-2 py-0.5" style={badgeStyle}>
          <Text className="text-[10px] font-bold" style={badgeTextStyle}>
            {shown} of {total}
          </Text>
        </Badge>
      </View>

      <SortSheet value={sortKey} onChange={onSortChange}>
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${sortLabel}`}
          className="active:opacity-70">
          <Text className="text-xs font-semibold" style={styles.sortLink}>
            Sort: {sortLabel}
          </Text>
        </Pressable>
      </SortSheet>
    </View>
  );
}

function EmptyInvoices() {
  return (
    <View className="items-center justify-center gap-2 px-8 py-16">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef2f6]">
        <Icon as={ReceiptText} size={22} color={FINANCE.faint} />
      </View>
      <Text className="text-center text-base font-semibold" style={styles.headerTitle}>
        No invoices found
      </Text>
      <Text className="text-center text-sm" style={styles.listHeaderText}>
        Try a different filter or search.
      </Text>
    </View>
  );
}

function InvoiceSeparator() {
  return <View className="h-2" />;
}

function compareInvoices(a: Invoice, b: Invoice, sortKey: InvoiceSortKey): number {
  if (sortKey === 'amount') {
    return Number(b.amount) - Number(a.amount);
  }
  if (sortKey === 'tenantName') {
    return tenantName(a.tenancy).localeCompare(tenantName(b.tenancy));
  }
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

/** Invoices segment of the Money tab, including its scrollable dashboard. */
export function InvoicesTab({ onShowPayments, onAdd }: InvoicesTabProps) {
  const [selectedBucket, setSelectedBucket] = useState<InvoiceBucket | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<InvoiceSortKey>('dueDate');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const initialized = useRef(false);
  const hasScrolled = useRef(false);

  const properties = useProperties();
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const setSelectedPropertyId = useStore((s) => s.setSelectedPropertyId);

  const showPropertySelector = (properties.data?.length ?? 0) > 1;
  const effectivePropertyId =
    properties.data?.length === 1
      ? properties.data[0]?.id
      : selectedPropertyId ?? undefined;

  const invoicesQuery = useInvoices({ propertyId: effectivePropertyId });
  const invoices = invoicesQuery.data?.items ?? EMPTY_INVOICES;
  const totals = useMemo(() => getBucketTotals(invoices), [invoices]);

  const debouncedSearch = useDebouncedValue(search, 200);
  const query = debouncedSearch.trim().toLowerCase();

  const requestBucket = useDeferredChange<InvoiceBucket | null>(
    selectedBucket,
    setSelectedBucket,
  );

  useEffect(() => {
    if (initialized.current || !invoicesQuery.isSuccess) return;
    const preferred = (['OVERDUE', 'UNPAID', 'PARTIAL'] as const).find(
      (bucket) => totals[bucket].count > 0,
    );
    setSelectedBucket(preferred ?? null);
    initialized.current = true;
  }, [invoicesQuery.isSuccess, totals]);

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      if (selectedBucket && getInvoiceBucket(invoice) !== selectedBucket) return false;
      if (!query) return true;
      const name = tenantName(invoice.tenancy).toLowerCase();
      const unitNumber = (
        invoice.unit?.unitNumber ??
        invoice.tenancy?.unit?.unitNumber ??
        ''
      ).toLowerCase();
      return name.includes(query) || unitNumber.includes(query);
    });
  }, [invoices, query, selectedBucket]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareInvoices(a, b, sortKey)),
    [filtered, sortKey],
  );

  const displayed = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
  const hasError = invoicesQuery.isError;
  const isLoading = invoicesQuery.isLoading;

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, sorted.length));
  }, [sorted.length]);

  const handleEndReached = useCallback(() => {
    if (!hasScrolled.current) return;
    loadMore();
  }, [loadMore]);

  const selectBucket = useCallback(
    (bucket: InvoiceBucket | null) => {
      setVisibleCount(PAGE_SIZE);
      requestBucket(bucket);
    },
    [requestBucket],
  );

  const handleSearchChange = useCallback((value: string) => {
    setVisibleCount(PAGE_SIZE);
    setSearch(value);
  }, []);

  const handleSortChange = useCallback((value: InvoiceSortKey) => {
    setVisibleCount(PAGE_SIZE);
    setSortKey(value);
  }, []);

  const handlePropertyChange = useCallback(
    (propertyId: string | null) => {
      setVisibleCount(PAGE_SIZE);
      setSelectedPropertyId(propertyId);
    },
    [setSelectedPropertyId],
  );

  const bannerTotal =
    totals.OVERDUE.total + totals.UNPAID.total + totals.PARTIAL.total;
  const bannerCount =
    totals.OVERDUE.count + totals.UNPAID.count + totals.PARTIAL.count;
  const bannerSecondaryLabel = useMemo(() => {
    if (properties.data?.length === 1) {
      return properties.data[0]?.name ?? 'Across all properties';
    }
    if (selectedPropertyId) {
      return (
        properties.data?.find((property) => property.id === selectedPropertyId)?.name ??
        'Selected property'
      );
    }
    return 'Across all properties';
  }, [properties.data, selectedPropertyId]);

  return (
    <FlatList
      data={isLoading || hasError ? EMPTY_INVOICES : displayed}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <InvoiceRow invoice={item} />}
      ItemSeparatorComponent={InvoiceSeparator}
      contentContainerClassName="px-4 pb-8"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={(event) => {
        hasScrolled.current = event.nativeEvent.contentOffset.y > 0;
      }}
      scrollEventThrottle={16}
      onEndReached={hasMore ? handleEndReached : undefined}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View className="gap-3 pb-3 pt-3">
          <MoneyHeader onAdd={onAdd} />
          <MoneyTabs onShowPayments={onShowPayments} />

          <SummaryBanner
            totalOutstanding={bannerTotal}
            invoiceCount={bannerCount}
            secondaryLabel={bannerSecondaryLabel}
          />

          <View className="flex-row flex-wrap gap-3">
            {STAT_CARD_BUCKETS.map((bucket) => {
              const entry = totals[bucket];
              const isSelected = selectedBucket === bucket;
              return (
                <StatCard
                  key={bucket}
                  bucket={bucket}
                  count={entry.count}
                  amount={entry.total}
                  selected={isSelected}
                  onPress={() => selectBucket(isSelected ? null : bucket)}
                />
              );
            })}
          </View>

          {showPropertySelector ? (
            <PropertySelectorField
              properties={properties.data ?? []}
              value={selectedPropertyId}
              onChange={handlePropertyChange}
            />
          ) : null}

          <SearchRow
            value={search}
            onChange={handleSearchChange}
            sortKey={sortKey}
            onSortChange={handleSortChange}
          />

          <ListHeaderRow
            bucket={selectedBucket}
            shown={displayed.length}
            total={sorted.length}
            sortKey={sortKey}
            onSortChange={handleSortChange}
          />
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ListSkeleton count={3} />
        ) : hasError ? (
          <ListMessage
            title="Couldn't load invoices"
            subtitle={(invoicesQuery.error as Error).message}
          />
        ) : (
          <EmptyInvoices />
        )
      }
      ListFooterComponent={
        hasMore && !isLoading && !hasError ? (
          <View className="pt-3">
            <Button
              variant="outline"
              onPress={loadMore}
              accessibilityRole="button"
              accessibilityLabel="Show more invoices"
              className="h-11 rounded-xl bg-white"
              style={styles.showMoreBorder}>
              <Text className="text-sm font-semibold" style={styles.showMoreText}>
                Show more
              </Text>
            </Button>
          </View>
        ) : null
      }
    />
  );
}
