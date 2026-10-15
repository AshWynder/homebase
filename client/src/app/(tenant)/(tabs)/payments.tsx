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
  SUCCESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'SUCCESS' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PENDING' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'FAILED' },
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Payments & Invoices
          </Text>
          {totalOutstanding > 0 ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-rose-500" />
              <Text className="text-xs font-bold text-rose-700">Due</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="text-xs font-bold text-emerald-700">Up to date</Text>
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
          <Text className="text-lg font-bold text-slate-900 mb-3">
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
            <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center justify-center mb-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-2.5">
                <Icon as={CheckCircle2} size={24} className="text-emerald-600" />
              </View>
              <Text className="text-sm font-bold text-slate-800 text-center">
                All Invoices Settled
              </Text>
              <Text className="text-xs text-slate-600 text-center mt-1">
                You have no outstanding or overdue payments.
              </Text>
            </View>
          )}

          {/* Invoice list, each with its status badge (individual Pay Now for open ones) */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold tracking-wider uppercase text-slate-700 mb-2">
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
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-base font-bold text-slate-900">
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
                          <Text className="text-xs text-slate-600">
                            {isOpen ? 'Amount payable' : 'Settled amount'}
                          </Text>
                          <Text className="text-base font-extrabold text-slate-900">
                            {formatKes(isOpen ? inv.balanceDue : inv.amount)}
                          </Text>
                        </View>
                        {isOpen ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            className="flex-row items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 shadow-sm"
                            onPress={() => router.push(`/(tenant)/pay/${inv.id}`)}>
                            <Text className="text-xs font-bold text-white">
                              Pay Now
                            </Text>
                            <Icon as={ArrowRight} size={14} className="text-white" />
                          </TouchableOpacity>
                        ) : (
                          <Text className="text-xs text-slate-400">
                            Due {formatDate(inv.dueDate)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center justify-center">
                  <Text className="text-sm font-bold text-slate-800 text-center">
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
              <Text className="text-[11px] font-bold tracking-wider uppercase text-slate-700 mb-2">
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
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-3">
                            {payment.status === 'SUCCESS' ? (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100">
                                <Icon
                                  as={CheckCircle2}
                                  size={20}
                                  className="text-teal-700"
                                />
                              </View>
                            ) : payment.status === 'PENDING' ? (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                                <Icon
                                  as={Clock}
                                  size={20}
                                  className="text-amber-600"
                                />
                              </View>
                            ) : (
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                                <Icon
                                  as={XCircle}
                                  size={20}
                                  className="text-rose-600"
                                />
                              </View>
                            )}
                            <View>
                              <Text className="text-base font-bold text-slate-900">
                                {formatDateLong(
                                  payment.paidAt ?? payment.createdAt,
                                )}{' '}
                                Rent
                              </Text>
                              <Text className="text-xs text-slate-600">
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

                        <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                          <View>
                            {payment.status === 'SUCCESS' ? (
                              <Text className="text-[11px] font-medium text-slate-600">
                                Receipt #{' '}
                                {payment.mpesaReceiptNumber ??
                                  shortId(payment.transactionRef)}
                              </Text>
                            ) : null}
                            <Text className="text-base font-extrabold text-slate-900">
                              {formatKes(payment.amount)}
                            </Text>
                          </View>

                          {payment.status === 'SUCCESS' ? (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              className="flex-row items-center gap-1 rounded-xl bg-slate-100 px-3 py-2">
                              <Icon
                                as={FileText}
                                size={14}
                                className="text-slate-700"
                              />
                              <Text className="text-xs font-semibold text-slate-700">
                                Download Receipt
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center justify-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-2.5">
                      <Icon as={Clock} size={22} className="text-slate-500" />
                    </View>
                    <Text className="text-sm font-bold text-slate-800 text-center">
                      {activeTab === 'paid'
                        ? 'No settled payments yet'
                        : 'No payment history'}
                    </Text>
                    <Text className="text-xs text-slate-600 text-center mt-1">
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
              <Text className="text-lg font-bold text-slate-900">
                Payment Methods
              </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-xs font-bold text-teal-700">
                  Manage All
                </Text>
              </TouchableOpacity>
            </View>

            {/* Method 1: M-Pesa Express */}
            <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                  <Icon as={Smartphone} size={20} className="text-emerald-600" />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">
                      M-Pesa Express
                    </Text>
                    <View className="rounded-md bg-teal-100 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-teal-800">
                        Default
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-medium text-slate-600">
                    {maskedMpesaPhone}
                  </Text>
                </View>
              </View>
              <Icon as={MoreVertical} size={18} className="text-slate-400" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
