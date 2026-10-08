import { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Download,
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone,
  CreditCard,
  MoreVertical,
  RotateCw,
  FileText,
  Clock,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { TenantOutstandingCard } from '@/components/tenant/outstanding-balance-card';
import { useStore } from '@/stores/use-store';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePayments } from '@/hooks/queries/use-payments';
import { formatDateLong, formatKes, shortId } from '@/lib/format';

type BillingFilter = 'all' | 'unpaid' | 'paid';

export default function TenantPaymentsScreen() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);

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
  const invoices = invoicesQuery.data?.items ?? [];

  // Payments for tenancy
  const paymentsQuery = usePayments({ limit: 50 });
  const payments = paymentsQuery.data?.items ?? [];

  const [activeTab, setActiveTab] = useState<BillingFilter>('all');
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      tenancyQuery.refetch(),
      invoicesQuery.refetch(),
      paymentsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  // Outstanding invoice
  const outstandingInvoice = useMemo(() => {
    return (
      invoices.find(
        (inv) =>
          (inv.status === 'UNPAID' ||
            inv.status === 'PARTIALLY_PAID' ||
            inv.status === 'OVERDUE') &&
          Number(inv.balanceDue) > 0,
      ) ?? null
    );
  }, [invoices]);

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
        contentContainerStyle={{ paddingBottom: 100 }}
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
          invoice={outstandingInvoice}
          tenancy={activeTenancy}
          totalBalance={totalOutstanding}
          onPay={() => {
            if (outstandingInvoice) {
              router.push(`/(tenant)/pay/${outstandingInvoice.id}`);
            }
          }}
        />

        {/* Billing Stream Section */}
        <View className="px-6 pt-7">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            Billing Stream
          </Text>

          {/* Filter Pills */}
          <View className="flex-row items-center rounded-2xl bg-slate-200/70 p-1 mb-5">
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 rounded-xl py-2 items-center ${
                activeTab === 'all' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('all')}>
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'all' ? 'text-teal-900' : 'text-slate-700'
                }`}>
                All ({invoices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 rounded-xl py-2 items-center ${
                activeTab === 'unpaid' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('unpaid')}>
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'unpaid' ? 'text-teal-900' : 'text-slate-700'
                }`}>
                Unpaid ({unpaidCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 rounded-xl py-2 items-center ${
                activeTab === 'paid' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('paid')}>
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'paid' ? 'text-teal-900' : 'text-slate-700'
                }`}>
                Paid ({paidCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Settlement Card (shown in 'all' or 'unpaid' tabs when pending invoice exists) */}
          {(activeTab === 'all' || activeTab === 'unpaid') && outstandingInvoice && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
                  PENDING SETTLEMENT
                </Text>
                <Text className="text-xs font-bold text-rose-600">
                  ⚠️ Action Required
                </Text>
              </View>

              <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100">
                      <Icon as={FileText} size={20} className="text-cyan-600" />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-900">
                        {shortId(outstandingInvoice.id)}
                      </Text>
                      <Text className="text-xs text-slate-600">
                        {new Date(
                          outstandingInvoice.periodStart,
                        ).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        Resident Statement
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-full bg-slate-100 px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-slate-700">
                      ● Pending
                    </Text>
                  </View>
                </View>

                {/* Itemized surcharges preview */}
                <View className="rounded-xl bg-slate-50 p-3 mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[11px] font-bold text-slate-700">
                      Itemized Surcharges:
                    </Text>
                    <Text className="text-[11px] font-bold text-teal-700">
                      {outstandingInvoice.lineItems?.length || 1} Elements
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    <View className="rounded-lg bg-white px-2.5 py-1 border border-slate-200">
                      <Text className="text-[11px] text-slate-700">
                        Base Rent:{' '}
                        <Text className="font-bold text-slate-900">
                          {formatKes(outstandingInvoice.amount)}
                        </Text>
                      </Text>
                    </View>
                    {outstandingInvoice.lineItems
                      ?.filter((i) => i.type !== 'RENT')
                      .map((item) => (
                        <View
                          key={item.id}
                          className="rounded-lg bg-white px-2.5 py-1 border border-slate-200">
                          <Text className="text-[11px] text-slate-700">
                            {item.description.split(' ')[0]}:{' '}
                            <Text className="font-bold text-slate-900">
                              {formatKes(item.amount)}
                            </Text>
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                  <View>
                    <Text className="text-xs text-slate-600 font-medium">
                      Amount Payable
                    </Text>
                    <Text className="text-lg font-extrabold text-slate-900">
                      {formatKes(outstandingInvoice.balanceDue)}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Icon as={Download} size={18} className="text-slate-700" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="flex-row items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 shadow-sm"
                      onPress={() =>
                        router.push(`/(tenant)/pay/${outstandingInvoice.id}`)
                      }>
                      <Text className="text-xs font-bold text-white">
                        Pay Now
                      </Text>
                      <Icon as={ArrowRight} size={14} className="text-white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Empty state when filtering unpaid invoices and there are none */}
          {activeTab === 'unpaid' && !outstandingInvoice && (
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

          {/* Payment History List (shown in 'all' or 'paid' tabs) */}
          {(activeTab === 'all' || activeTab === 'paid') && (
            <View>
              <Text className="text-[11px] font-bold tracking-wider uppercase text-slate-700 mb-2">
                PAYMENT HISTORY
              </Text>

              <View className="gap-3">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <View
                      key={payment.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-3">
                          <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100">
                            <Icon
                              as={CheckCircle2}
                              size={20}
                              className="text-teal-700"
                            />
                          </View>
                          <View>
                            <Text className="text-base font-bold text-slate-900">
                              {formatDateLong(
                                payment.paidAt ?? payment.createdAt,
                              )}{' '}
                              Rent
                            </Text>
                            <Text className="text-xs text-slate-600">
                              Paid{' '}
                              {formatDateLong(
                                payment.paidAt ?? payment.createdAt,
                              )}{' '}
                              •{' '}
                              {payment.method === 'MPESA_STK'
                                ? 'M-Pesa STK'
                                : payment.method === 'MPESA_C2B'
                                ? 'M-Pesa PayBill'
                                : 'Card'}
                            </Text>
                          </View>
                        </View>
                        <View className="rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100">
                          <Text className="text-[11px] font-bold text-emerald-700">
                            Paid
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                        <View>
                          <Text className="text-[11px] font-medium text-slate-600">
                            Receipt #
                            {payment.mpesaReceiptNumber ??
                              shortId(payment.transactionRef)}
                          </Text>
                          <Text className="text-base font-extrabold text-slate-900">
                            {formatKes(payment.amount)}
                          </Text>
                        </View>

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
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 items-center justify-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-2.5">
                      <Icon as={Clock} size={22} className="text-slate-500" />
                    </View>
                    <Text className="text-sm font-bold text-slate-800 text-center">
                      No payment history
                    </Text>
                    <Text className="text-xs text-slate-600 text-center mt-1">
                      Settled payments will appear here.
                    </Text>
                  </View>
                )}

                {/* Security deposit escrow item */}
                <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
                        <Icon as={Lock} size={20} className="text-indigo-600" />
                      </View>
                      <View>
                        <Text className="text-base font-bold text-slate-900">
                          Initial Security Deposit
                        </Text>
                        <Text className="text-xs text-slate-600">
                          Move-in Escrow • Protected by Haven
                        </Text>
                      </View>
                    </View>
                    <View className="rounded-full bg-indigo-50 px-2.5 py-1 border border-indigo-100">
                      <Text className="text-[11px] font-bold text-indigo-700">
                        Held In Escrow
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                    <View>
                      <Text className="text-[11px] font-medium text-slate-600">
                        Vault #DEP-10029
                      </Text>
                      <Text className="text-base font-extrabold text-slate-900">
                        {activeTenancy
                          ? formatKes(activeTenancy.rentAmount)
                          : 'KES 40,000'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="flex-row items-center gap-1 rounded-xl bg-slate-100 px-3 py-2">
                      <Icon
                        as={CheckCircle2}
                        size={14}
                        className="text-slate-700"
                      />
                      <Text className="text-xs font-semibold text-slate-700">
                        View Terms
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

            <View className="gap-3">
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

              {/* Method 2: Card */}
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
                    <Icon as={CreditCard} size={20} className="text-indigo-600" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900">
                      NCBA Loop Visa
                    </Text>
                    <Text className="text-xs font-medium text-slate-600">
                      •••• •••• •••• 8821
                    </Text>
                  </View>
                </View>
                <Icon as={MoreVertical} size={18} className="text-slate-400" />
              </View>

              {/* Auto-pay card */}
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center gap-3 flex-1 pr-3">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                    <Icon as={RotateCw} size={16} className="text-teal-700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      Auto-Pay on 1st of month
                    </Text>
                    <Text className="text-xs text-slate-600">
                      Triggers automated M-Pesa push prompt
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoPayEnabled}
                  onValueChange={setAutoPayEnabled}
                  trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
