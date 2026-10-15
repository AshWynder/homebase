import { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowRight,
  CheckCircle2,
  Smartphone,
  MoreVertical,
  FileText,
  Clock,
  XCircle,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { TenantOutstandingCard } from '@/components/tenant/outstanding-balance-card';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl, type SegmentedOption } from '@/components/owner/segmented-control';
import { STATUS_STYLES } from '@/components/owner/invoice-status';
import { useStore } from '@/stores/use-store';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePayments } from '@/hooks/queries/use-payments';
import { formatDate, formatDateLong, formatKes, formatMonthYear, shortId } from '@/lib/format';
import { runRefresh } from '@/lib/refresh';
import type { PaymentStatus } from '@/api/types';

type BillingFilter = 'all' | 'unpaid' | 'paid';

const PAYMENT_STATUS_STYLES: Record<
  PaymentStatus,
  { bg: string; text: string; label: string }
> = {
  SUCCESS: { bg: 'bg-success/10', text: 'text-success', label: 'SUCCESS' },
  PENDING: { bg: 'bg-warning/10', text: 'text-warning', label: 'PENDING' },
  FAILED: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'FAILED' },
};

export default function TenantPaymentsScreen() {
  const profile = useStore((s) => s.profile);

  // Active tenancy
  const tenancyQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });
  const activeTenancy = tenancyQuery.data?.items?.[0];

  // Invoices for tenancy
  const invoicesQuery = useInvoices(
    activeTenancy ? { tenancyId: activeTenancy.id, limit: 50 } : { limit: 1 },
  );
  const invoices = useMemo(
    () => invoicesQuery.data?.items ?? [],
    [invoicesQuery.data?.items],
  );

  // Payments for tenancy
  const paymentsQuery = usePayments({ limit: 50 });
  const payments = useMemo(
    () => paymentsQuery.data?.items ?? [],
    [paymentsQuery.data?.items],
  );

  const [activeTab, setActiveTab] = useState<BillingFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    return runRefresh(
      [
        tenancyQuery.refetch(),
        invoicesQuery.refetch(),
        paymentsQuery.refetch(),
      ],
      setRefreshing,
    );
  };

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
  }, [invoices]);

  const unpaidCount = useMemo(
    () => invoices.filter((i) => i.status !== 'PAID').length,
    [invoices],
  );
  const paidCount = useMemo(
    () => invoices.filter((i) => i.status === 'PAID').length,
    [invoices],
  );
  const billingFilters = useMemo<SegmentedOption<BillingFilter>[]>(
    () => [
      { value: 'all', label: `All (${invoices.length})` },
      { value: 'unpaid', label: `Unpaid (${unpaidCount})` },
      { value: 'paid', label: `Paid (${paidCount})` },
    ],
    [invoices.length, unpaidCount, paidCount],
  );

  // Invoices that still carry a balance — what a single prompt can settle.
  const openInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status !== 'PAID' && Number(inv.balanceDue) > 0)
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
    [invoices],
  );
  const totalDue = useMemo(
    () =>
      openInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0),
    [openInvoices],
  );

  const visibleInvoices = useMemo(() => {
    if (activeTab === 'unpaid') return openInvoices;
    if (activeTab === 'paid')
      return invoices.filter((inv) => inv.status === 'PAID');
    return invoices;
  }, [activeTab, openInvoices, invoices]);

  // The "paid" tab is *settled*: only successful payments belong there.
  const visiblePayments = useMemo(
    () =>
      activeTab === 'paid'
        ? payments.filter((payment) => payment.status === 'SUCCESS')
        : payments,
    [activeTab, payments],
  );

  // Masked phone identifier for M-Pesa
  const maskedMpesaPhone = useMemo(() => {
    const raw = profile?.phone?.trim();
    if (!raw) return '+254 712 345 678';
    const clean = raw.replace(/\s+/g, '');
    if (clean.startsWith('+254') && clean.length >= 12) {
      return `+254 ${clean.slice(4, 5)}XX XXX ${clean.slice(-3)}`;
    }
    if (clean.startsWith('0') && clean.length >= 10) {
      return `+254 ${clean.slice(1, 2)}XX XXX ${clean.slice(-3)}`;
    }
    return '+254 712 345 678';
  }, [profile?.phone]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-[100px]"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {/* Title Header with functional status badge */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <Text className="text-2xl font-extrabold text-foreground tracking-tight">
            Payments & Invoices
          </Text>
          {totalOutstanding > 0 ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-destructive" />
              <Text className="text-xs font-bold text-destructive">Due</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-success" />
              <Text className="text-xs font-bold text-success">Up to date</Text>
            </View>
          )}
        </View>

        {/* Outstanding Balance / Invoice Card */}
        <TenantOutstandingCard
          invoices={openInvoices}
          totalBalance={totalDue}
          onPayTotal={() => {
            if (openInvoices.length > 0) {
              router.push(`/(tenant)/pay/${openInvoices[0].id}?bulk=1`);
            }
          }}
          onPayInvoice={(inv) => router.push(`/(tenant)/pay/${inv.id}`)}
        />

        {/* Billing Stream Section */}
        <View className="px-6 pt-7">
          <Text className="text-lg font-bold text-foreground mb-3">
            Billing Stream
          </Text>

          {/* Filter Pills */}
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={billingFilters}
            className="mb-5"
          />

          {/* Empty state when filtering unpaid invoices and there are none */}
          {activeTab === 'unpaid' && openInvoices.length === 0 && (
            <View className="rounded-2xl border border-dashed border-border bg-card p-6 items-center justify-center mb-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-success/10 mb-2.5">
                <Icon as={CheckCircle2} size={24} className="text-success" />
              </View>
              <Text className="text-sm font-bold text-foreground text-center">
                All Invoices Settled
              </Text>
              <Text className="text-xs text-muted-foreground text-center mt-1">
                You have no outstanding or overdue payments.
              </Text>
            </View>
          )}

          {/* Invoice list, each with its status badge (individual Pay Now for open ones) */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold tracking-wider uppercase text-foreground mb-2">
              INVOICES
            </Text>
            <View className="gap-3">
              {visibleInvoices.length > 0 ? (
                visibleInvoices.map((inv) => {
                  const style = STATUS_STYLES[inv.status];
                  const isOpen =
                    inv.status !== 'PAID' && Number(inv.balanceDue) > 0;
                  return (
                    <View
                      key={inv.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-base font-bold text-foreground">
                          {formatMonthYear(inv.periodStart)}
                        </Text>
                        <Badge variant="secondary" className={style.bg}>
                          <Text
                            className={`text-[11px] font-semibold ${style.text}`}>
                            {style.label}
                          </Text>
                        </Badge>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-xs text-muted-foreground">
                            {isOpen ? 'Amount payable' : 'Settled amount'}
                          </Text>
                          <Text className="text-base font-extrabold text-foreground">
                            {formatKes(isOpen ? inv.balanceDue : inv.amount)}
                          </Text>
                        </View>
                        {isOpen ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            className="flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 shadow-sm"
                            onPress={() => router.push(`/(tenant)/pay/${inv.id}`)}>
                            <Text className="text-xs font-bold text-primary-foreground">
                              Pay Now
                            </Text>
                            <Icon as={ArrowRight} size={14} className="text-primary-foreground" />
                          </TouchableOpacity>
                        ) : (
                          <Text className="text-xs text-muted-foreground">
                            Due {formatDate(inv.dueDate)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-dashed border-border bg-card p-6 items-center justify-center">
                  <Text className="text-sm font-bold text-foreground text-center">
                    {activeTab === 'paid'
                      ? 'No paid invoices yet'
                      : 'No invoices to show'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Payment History List (shown in 'all' or 'paid' tabs) */}
          {(activeTab === 'all' || activeTab === 'paid') && (
            <View>
              <Text className="text-[11px] font-bold tracking-wider uppercase text-foreground mb-2">
                PAYMENT HISTORY
              </Text>

              <View className="gap-3">
                {visiblePayments.length > 0 ? (
                  visiblePayments.map((payment) => {
                    const pStyle = PAYMENT_STATUS_STYLES[payment.status];
                    const methodLabel =
                      payment.method === 'MPESA_STK'
                        ? 'M-Pesa STK'
                        : payment.method === 'MPESA_C2B'
                          ? 'M-Pesa PayBill'
                          : 'Card';
                    return (
                      <View
                        key={payment.id}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-3">
                            {payment.status === 'SUCCESS' ? (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                <Icon
                                  as={CheckCircle2}
                                  size={20}
                                  className="text-primary"
                                />
                              </View>
                            ) : payment.status === 'PENDING' ? (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
                                <Icon
                                  as={Clock}
                                  size={20}
                                  className="text-warning"
                                />
                              </View>
                            ) : (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
                                <Icon
                                  as={XCircle}
                                  size={20}
                                  className="text-destructive"
                                />
                              </View>
                            )}
                            <View>
                              <Text className="text-base font-bold text-foreground">
                                {formatDateLong(
                                  payment.paidAt ?? payment.createdAt,
                                )}{' '}
                                Rent
                              </Text>
                              <Text className="text-xs text-muted-foreground">
                                {methodLabel} •{' '}
                                {formatDateLong(
                                  payment.paidAt ?? payment.createdAt,
                                )}
                              </Text>
                            </View>
                          </View>
                          <Badge variant="secondary" className={pStyle.bg}>
                            <Text
                              className={`text-[11px] font-semibold ${pStyle.text}`}>
                              {pStyle.label}
                            </Text>
                          </Badge>
                        </View>

                        <View className="flex-row items-center justify-between pt-2 border-t border-border">
                          <View>
                            {payment.status === 'SUCCESS' ? (
                              <Text className="text-[11px] font-medium text-muted-foreground">
                                Receipt #{' '}
                                {payment.mpesaReceiptNumber ??
                                  shortId(payment.transactionRef)}
                              </Text>
                            ) : null}
                            <Text className="text-base font-extrabold text-foreground">
                              {formatKes(payment.amount)}
                            </Text>
                          </View>

                          {payment.status === 'SUCCESS' ? (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              className="flex-row items-center gap-1 rounded-xl bg-muted px-3 py-2">
                              <Icon
                                as={FileText}
                                size={14}
                                className="text-foreground"
                              />
                              <Text className="text-xs font-semibold text-foreground">
                                Download Receipt
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="rounded-2xl border border-dashed border-border bg-card p-6 items-center justify-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-muted mb-2.5">
                      <Icon as={Clock} size={22} className="text-muted-foreground" />
                    </View>
                    <Text className="text-sm font-bold text-foreground text-center">
                      {activeTab === 'paid'
                        ? 'No settled payments yet'
                        : 'No payment history'}
                    </Text>
                    <Text className="text-xs text-muted-foreground text-center mt-1">
                      {activeTab === 'paid'
                        ? 'Successful payments will appear here.'
                        : 'Settled payments will appear here.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Payment Methods Section */}
          <View className="pt-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-foreground">
                Payment Methods
              </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-xs font-bold text-primary">
                  Manage All
                </Text>
              </TouchableOpacity>
            </View>

            {/* Method 1: M-Pesa Express */}
            <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-success/10 border border-success/20">
                  <Icon as={Smartphone} size={20} className="text-success" />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-foreground">
                      M-Pesa Express
                    </Text>
                    <View className="rounded-md bg-primary/10 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-primary">
                        Default
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-medium text-muted-foreground">
                    {maskedMpesaPhone}
                  </Text>
                </View>
              </View>
              <Icon as={MoreVertical} size={18} className="text-muted-foreground" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
