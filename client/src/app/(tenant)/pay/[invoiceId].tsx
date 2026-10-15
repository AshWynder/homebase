import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from '@/components/ui/linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Smartphone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Pencil,
  RefreshCw,
  Lock,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useInvoice, useInvoices } from '@/hooks/queries/use-invoices';
import {
  useInitiateStkPayment,
  usePayment,
  useVerifyPayment,
} from '@/hooks/queries/use-payments';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useStore } from '@/stores/use-store';
import { formatKes, formatMonthYear, shortId } from '@/lib/format';
import { mpesaPhoneSchema } from '@/lib/schemas';
import { queryKeys } from '@/hooks/queries/keys';
import type { Payment } from '@/api/types';

type Step = 'confirm' | 'processing' | 'result';

/** Format a Kenyan number for display: 0712 345 678 / +254 712 345 678. */
function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/[\s-]/g, '');
  if (/^\+?254\d{9}$/.test(digits)) {
    const rest = digits.replace(/^\+?254/, '');
    return `+254 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  if (/^0\d{9}$/.test(digits)) {
    return `${digits.slice(0, 1)}${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export default function TenantPayInvoiceModal() {
  const insets = useSafeAreaInsets();
  const { invoiceId, bulk } = useLocalSearchParams<{
    invoiceId: string;
    bulk?: string;
  }>();
  const isBulk = bulk === '1';
  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;

  const profile = useStore((s) => s.profile);
  const queryClient = useQueryClient();

  // Bulk mode: the "total owed" Pay Now from the payments tab. The same
  // prompt/processing/result machine runs, but the amount is the sum of every
  // outstanding invoice on the tenant's active tenancy instead of one invoice.
  const tenancyQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });
  const activeTenancy = tenancyQuery.data?.items?.[0];
  const bulkInvoicesQuery = useInvoices(
    activeTenancy ? { tenancyId: activeTenancy.id, limit: 50 } : { limit: 1 },
  );
  const openInvoices = useMemo(() => {
    if (!isBulk) return [];
    return (bulkInvoicesQuery.data?.items ?? [])
      .filter((inv) => inv.status !== 'PAID' && Number(inv.balanceDue) > 0)
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  }, [isBulk, bulkInvoicesQuery.data]);
  const totalDue = useMemo(
    () => openInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0),
    [openInvoices],
  );

  const { visible: toastVisible, message: toastMessage, type: toastType, showToast, hideToast } = useToast();

  const [step, setStep] = useState<Step>('confirm');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone?.trim() ?? '');
  const [editingPhone, setEditingPhone] = useState(!profile?.phone?.trim());
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const initiateStk = useInitiateStkPayment();
  const verifyPayment = useVerifyPayment();

  // The payment status is polled while the prompt is on the phone. The initiate
  // mutation seeds the cache, so this reads data immediately.
  const paymentQuery = usePayment(payment?.id, {
    pollUntilSettled: step === 'processing' && Boolean(payment?.id),
  });
  const paymentData = paymentQuery.data ?? payment;
  const paymentStatus = paymentData?.status;

  // A settled status (webhook/verify result seen by the poll) ends the
  // processing step. Derived rather than written in an effect so the transition
  // is a computed value while rendering.
  const settled = paymentStatus === 'SUCCESS' || paymentStatus === 'FAILED';
  const displayStep: Step = step === 'processing' && settled ? 'result' : step;

  // Count up while we wait for the user's PIN confirmation.
  useEffect(() => {
    if (displayStep !== 'processing') return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [displayStep]);

  // Refresh the tenant's invoices/payments once a payment settles so the tabs
  // behind this modal are already up to date when they come back.
  useEffect(() => {
    if (paymentStatus === 'SUCCESS') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    }
  }, [paymentStatus, queryClient]);

  const lineItems = invoice?.lineItems ?? [];
  const baseRentItem = lineItems.find((li) => li.type === 'RENT');
  const serviceChargeItem = lineItems.find((li) => li.type === 'SERVICE_CHARGE');
  const lateFeeItem = lineItems.find((li) => li.description?.toLowerCase().includes('late'));
  const otherItems = lineItems.filter(
    (li) => li !== baseRentItem && li !== serviceChargeItem && li !== lateFeeItem,
  );

  const displayPhone = useMemo(() => formatPhoneForDisplay(phoneNumber), [phoneNumber]);

  const handleConfirmPhone = () => {
    const result = mpesaPhoneSchema.safeParse(phoneNumber);
    if (!result.success) {
      setPhoneError(result.error.issues[0]?.message ?? 'Enter a valid phone number');
      return;
    }
    setPhoneError(null);
    setEditingPhone(false);
  };

  const handleSendPrompt = () => {
    if (!isBulk && !invoice) {
      setPhoneError('Invoice not found.');
      setEditingPhone(true);
      return;
    }
    if (!phoneNumber.trim()) {
      setPhoneError('Enter the M-Pesa number you want the prompt sent to.');
      setEditingPhone(true);
      return;
    }
    const result = mpesaPhoneSchema.safeParse(phoneNumber);
    if (!result.success) {
      setPhoneError(result.error.issues[0]?.message ?? 'Enter a valid phone number');
      setEditingPhone(true);
      return;
    }

    const stkInput = isBulk
      ? {
          invoiceIds: openInvoices.map((inv) => inv.id),
          phoneNumber: phoneNumber.trim(),
        }
      : { invoiceId: invoice?.id ?? '', phoneNumber: phoneNumber.trim() };

    initiateStk.mutate(stkInput, {
        onSuccess: (created) => {
          setPayment(created);
          setStep('processing');
          setElapsed(0);
        },
        onError: (err) => {
          showToast((err as Error).message || 'Could not trigger the M-Pesa prompt. Please try again.', 'error');
        },
      },
    );
  };

  const handleCheckStatus = () => {
    if (!payment?.transactionRef) return;
    verifyPayment.mutate(payment.transactionRef, {
      onError: () =>
        showToast('Could not reach M-Pesa right now. Please try again.', 'error'),
      onSuccess: (updated) => {
        if (updated.status === 'PENDING') {
          showToast(`Still waiting for your confirmation on ${displayPhone}.`, 'success');
        }
      },
    });
  };

  const handleDone = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    router.replace('/(tenant)/(tabs)/payments');
  };

  const handleTryAgain = () => {
    setStep('confirm');
    setPayment(null);
    setElapsed(0);
    setPhoneError(null);
  };

  // Declared above every early return below, which the rules-of-hooks lint
  // requires.
  //
  // Memoized: NativeWind's native interop identity-checks these style props on
  // every render, so an inline literal never compares equal to the previously
  // captured one and re-dispatches from inside the render phase — which hangs
  // the app on any state change.
  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: insets.bottom + 32 }),
    [insets.bottom],
  );
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: insets.top + 16 }),
    [insets.top],
  );

  if (isBulk) {
    if (tenancyQuery.isLoading || bulkInvoicesQuery.isLoading) {
      return (
        <SafeAreaView className="flex-1 bg-background items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </SafeAreaView>
      );
    }

    if (!activeTenancy || openInvoices.length === 0) {
      return (
        <SafeAreaView className="flex-1 bg-background p-6 justify-center items-center">
          <Text className="text-base text-muted-foreground mb-4 text-center">
            You don&apos;t have any outstanding invoices to pay.
          </Text>
          <TouchableOpacity
            className="rounded-xl bg-primary px-5 py-2.5"
            onPress={() => router.replace('/(tenant)/(tabs)/payments')}>
            <Text className="text-primary-foreground font-bold">Go to payments</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
  } else if (invoiceQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!isBulk && !invoice) {
    return (
      <SafeAreaView className="flex-1 bg-background p-6 justify-center items-center">
        <Text className="text-base text-muted-foreground mb-4">Invoice not found.</Text>
        <TouchableOpacity className="rounded-xl bg-primary px-5 py-2.5" onPress={() => router.back()}>
          <Text className="text-primary-foreground font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const amountDue = isBulk ? totalDue : Number(invoice?.balanceDue ?? 0);
  const showCheckStatus = elapsed >= 45;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onDismiss={hideToast} />
      <ScrollView className="flex-1" contentContainerStyle={scrollContentStyle}>
        {/* Header */}
        <LinearGradient
          colors={['#065F46', '#0F766E', '#115E59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={headerInsetStyle}
          className="px-6 pb-7 rounded-b-[32px] shadow-lg shadow-black/5">
          <TouchableOpacity activeOpacity={0.7} className="-ml-1 self-start flex-row items-center gap-1 rounded-full py-1 pr-3 mb-5" onPress={() => router.back()}>
            <Icon as={ChevronLeft} size={20} className="text-white" />
            <Text className="text-base font-semibold leading-5 text-white">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-teal-50/90">
                {isBulk ? 'Pay open invoices' : 'Pay invoice'}
              </Text>
              <Text className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
                {formatKes(amountDue)}
              </Text>
              <Text className="text-xs font-medium text-teal-50/85 mt-1">M-Pesa STK Push</Text>
            </View>
            <View className="max-w-[132px] min-w-[104px] rounded-2xl bg-white/15 px-3 py-2.5 items-center border border-white/15">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-teal-50/80 leading-3">
                {isBulk ? 'Invoices' : 'Invoice'}
              </Text>
              <Text className="mt-1 text-center text-xs font-extrabold text-white leading-4" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                {isBulk ? `${openInvoices.length} to pay` : invoice ? shortId(invoice.id, 'INV-') : '—'}
              </Text>
            </View>
          </View>

          {/* Step indicator */}
          <View className="flex-row items-center justify-center mt-6">
            {(['confirm', 'processing', 'result'] as Step[]).map((s, i) => {
              const active = displayStep === s;
              return (
                <View key={s} className="flex-row items-center">
                  {i === 0 ? null : <View className="mx-2 h-[2px] w-8 rounded-full bg-white/25" />}
                  <View
                    className={`h-7 w-7 rounded-full items-center justify-center ${
                      active ? 'bg-white' : 'bg-white/20'
                    }`}>
                    {displayStep === 'result' && i === 2 ? (
                      <Icon as={CheckCircle2} size={14} className="text-emerald-600" />
                    ) : displayStep === 'processing' && i === 1 ? (
                      <ActivityIndicator size="small" color="#0F766E" />
                    ) : (
                      <Text className={`text-[10px] font-bold ${active ? 'text-teal-800' : 'text-white'}`}>{i + 1}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        {displayStep === 'confirm' && (
          <View className="px-6 pt-5">
            <Text className="text-lg font-extrabold text-foreground mb-3 leading-6">Payment summary</Text>

            <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 mb-6 divide-y divide-border">
              {isBulk ? (
                <>
                  {openInvoices.map((inv) => (
                    <View key={inv.id} className="flex-row items-center justify-between py-3">
                      <Text className="text-sm text-muted-foreground leading-5">
                        {formatMonthYear(inv.periodStart)}
                      </Text>
                      <Text className="text-sm font-bold text-foreground leading-5">
                        {formatKes(inv.balanceDue)}
                      </Text>
                    </View>
                  ))}
                  <View className="flex-row items-center justify-between pt-3">
                    <Text className="text-base font-extrabold text-foreground leading-6">Total</Text>
                    <Text className="text-base font-extrabold text-primary leading-6">
                      {formatKes(totalDue)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center justify-between pb-3">
                    <Text className="text-sm text-muted-foreground leading-5">Monthly rent</Text>
                    <Text className="text-sm font-bold text-foreground leading-5">{formatKes(baseRentItem?.amount ?? invoice?.amount ?? 0)}</Text>
                  </View>
                  {serviceChargeItem ? (
                    <View className="flex-row items-center justify-between py-3">
                      <Text className="text-sm text-muted-foreground leading-5">Service charge</Text>
                      <Text className="text-sm font-bold text-foreground leading-5">{formatKes(serviceChargeItem.amount)}</Text>
                    </View>
                  ) : null}
                  {lateFeeItem ? (
                    <View className="flex-row items-center justify-between py-3">
                      <Text className="text-sm text-muted-foreground leading-5">Late fee</Text>
                      <Text className="text-sm font-bold text-foreground leading-5">{formatKes(lateFeeItem.amount)}</Text>
                    </View>
                  ) : null}
                  {otherItems.map((item) => (
                    <View key={item.id} className="flex-row items-center justify-between py-3">
                      <Text className="flex-1 pr-3 text-sm text-muted-foreground leading-5">{item.description}</Text>
                      <Text className="text-sm font-bold text-foreground leading-5">{formatKes(item.amount)}</Text>
                    </View>
                  ))}
                  <View className="flex-row items-center justify-between pt-3">
                    <Text className="text-base font-extrabold text-foreground leading-6">Total</Text>
                    <Text className="text-base font-extrabold text-primary leading-6">{formatKes(invoice?.balanceDue ?? 0)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Phone confirmation */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-extrabold text-foreground leading-6">Confirm your number</Text>
                <View className="flex-row items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2.5 py-1">
                  <Icon as={Smartphone} size={12} className="text-success" />
                  <Text className="text-[10px] font-bold text-success leading-3">M-PESA</Text>
                </View>
              </View>

              <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
                {editingPhone ? (
                  <>
                    <Text className="text-xs font-semibold text-foreground mb-1.5 leading-4">
                      M-Pesa phone number
                    </Text>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={(v) => {
                        setPhoneNumber(v);
                        setPhoneError(null);
                      }}
                      placeholder="e.g. 0712345678 or +254..."
                      keyboardType="phone-pad"
                      autoFocus
                      className={`h-11 rounded-xl border px-3.5 text-sm text-foreground bg-muted ${
                        phoneError ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {phoneError ? <Text className="text-xs text-destructive mt-1.5 leading-4">{phoneError}</Text> : null}
                    <Text className="text-[11px] text-muted-foreground mt-1.5 leading-4">
                      A one-time prompt is sent to this number only; it won&apos;t update your profile.
                    </Text>
                    <View className="flex-row items-center gap-2 mt-4">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="flex-1 h-11 rounded-xl items-center justify-center bg-muted"
                        onPress={() => {
                          setEditingPhone(false);
                          setPhoneError(null);
                          setPhoneNumber(profile?.phone?.trim() ?? '');
                        }}>
                        <Text className="text-sm font-bold text-foreground leading-5">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        className="flex-1 h-11 rounded-xl items-center justify-center bg-primary"
                        onPress={handleConfirmPhone}>
                        <Text className="text-sm font-bold text-primary-foreground leading-5">Confirm number</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 flex-row items-center gap-3">
                      <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Icon as={Smartphone} size={22} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-muted-foreground leading-4">Prompt will be sent to</Text>
                        <Text className="text-base font-bold text-foreground leading-6" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                          {displayPhone}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="h-10 w-10 rounded-xl items-center justify-center bg-muted"
                      onPress={() => {
                        setEditingPhone(true);
                        setPhoneError(null);
                      }}>
                      <Icon as={Pencil} size={16} className="text-foreground" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View className="flex-row items-start gap-2.5 mt-3 px-1">
                <Icon as={ShieldCheck} size={16} className="text-primary mt-0.5" />
                <Text className="flex-1 text-xs text-muted-foreground leading-5">
                  When you continue, a prompt will be pushed to your M-Pesa number. You&apos;ll need to
                  enter your PIN on your phone to authorize the payment of{' '}
                  <Text className="font-bold text-foreground">{formatKes(amountDue)}</Text>.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={initiateStk.isPending}
              onPress={handleSendPrompt}
className="mb-2 w-full rounded-2xl overflow-hidden shadow-lg shadow-black/5 disabled:opacity-70">
              <LinearGradient
                colors={['#0F766E', '#115E59', '#134E4A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full px-6 py-4 flex-row items-center justify-center gap-x-2">
                {initiateStk.isPending ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text className="text-base font-bold text-white leading-6">Sending prompt…</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-base font-bold text-white leading-6">
                      Confirm &amp; send prompt
                    </Text>
                    <Icon as={ArrowRight} size={20} className="text-white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {displayStep === 'processing' && (
          <View className="mx-6 mt-8 rounded-2xl bg-card p-6 shadow-sm shadow-black/5 border border-border items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mb-5">
              <ActivityIndicator size="large" color="#0F766E" />
            </View>
            <Text className="text-xl font-bold text-foreground mb-2 text-center leading-7">
              Enter your M-Pesa PIN
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-6 mb-6">
              A payment prompt has been sent to{' '}
              <Text className="font-bold text-foreground">{displayPhone}</Text>. Enter your PIN on
              your phone when prompted to complete this payment of{' '}
              <Text className="font-bold text-foreground">{formatKes(amountDue)}</Text>.
            </Text>

            <View className="w-full rounded-2xl bg-muted p-4 mb-5 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs text-muted-foreground leading-4">Reference</Text>
                <Text className="text-xs font-bold text-foreground leading-4">
                  {payment?.transactionRef ? shortId(payment.transactionRef, 'REF-') : '…'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground leading-4">Waiting for confirmation</Text>
                <Text className="text-xs font-bold text-primary leading-4">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2 px-1 mb-5">
              <Icon as={Lock} size={14} className="text-muted-foreground mt-0.5" />
              <Text className="flex-1 text-xs text-muted-foreground leading-5">
                Keep this screen open. Your payment status updates automatically.
              </Text>
            </View>

            {showCheckStatus ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={verifyPayment.isPending}
                onPress={handleCheckStatus}
                className="w-full flex-row items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 py-3.5">
                {verifyPayment.isPending ? (
                  <ActivityIndicator size="small" color="#0F766E" />
                ) : (
                  <>
                    <Icon as={RefreshCw} size={16} className="text-primary" />
                    <Text className="text-sm font-bold text-primary">
                      Taking long? Check status
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {displayStep === 'result' && (
          <View className="mx-6 mt-8 rounded-2xl bg-card p-6 shadow-sm shadow-black/5 border border-border items-center">
            {paymentStatus === 'SUCCESS' ? (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10 border border-success/20 mb-4">
                  <Icon as={CheckCircle2} size={32} className="text-success" />
                </View>
                <Text className="text-xl font-bold text-foreground mb-1">
                  Payment received
                </Text>
                <Text className="text-sm text-muted-foreground text-center mb-5">
                  Your rent payment of{' '}
                  <Text className="font-bold text-foreground">{formatKes(paymentData?.amount ?? amountDue)}</Text>{' '}
                  was completed successfully.
                </Text>

                <View className="w-full rounded-xl bg-muted p-4 mb-6 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Amount paid</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {formatKes(paymentData?.amount ?? amountDue)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">M-Pesa receipt</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {paymentData?.mpesaReceiptNumber ?? shortId(paymentData?.transactionRef ?? '', 'REF-')}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Date & time</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {paymentData?.paidAt
                        ? new Date(paymentData.paidAt).toLocaleString('en-KE', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDone}
                  className="w-full rounded-2xl bg-primary py-3.5 items-center shadow-lg shadow-black/5">
                  <Text className="text-base font-bold text-primary-foreground">Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 mb-4">
                  <Icon as={XCircle} size={32} className="text-destructive" />
                </View>
                <Text className="text-xl font-bold text-foreground mb-1">
                  Payment not completed
                </Text>
                <Text className="text-sm text-muted-foreground text-center leading-6 mb-5">
                  {paymentData?.failureReason ?? (
                    <>
                      We didn&apos;t receive confirmation from M-Pesa. You can try again or check your
                      payment history later.
                    </>
                  )}
                </Text>

                <View className="w-full gap-2.5">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleTryAgain}
                    className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 shadow-lg shadow-black/5">
                    <Icon as={RefreshCw} size={16} className="text-primary-foreground" />
                    <Text className="text-base font-bold text-primary-foreground">Try again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleDone}
                    className="w-full rounded-2xl border border-border bg-card py-3.5 items-center">
                    <Text className="text-base font-bold text-foreground">Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
