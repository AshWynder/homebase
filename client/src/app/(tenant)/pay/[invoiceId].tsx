import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useInvoice } from '@/hooks/queries/use-invoices';
import {
  useInitiateStkPayment,
  usePayment,
  useVerifyPayment,
} from '@/hooks/queries/use-payments';
import { useStore } from '@/stores/use-store';
import { formatKes, shortId } from '@/lib/format';
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
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;

  const profile = useStore((s) => s.profile);
  const queryClient = useQueryClient();

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
    if (!invoice || !phoneNumber.trim()) {
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

    initiateStk.mutate(
      { invoiceId: invoice.id, phoneNumber: phoneNumber.trim() },
      {
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

  if (invoiceQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView className="flex-1 bg-white p-6 justify-center items-center">
        <Text className="text-base text-slate-600 mb-4">Invoice not found.</Text>
        <TouchableOpacity className="rounded-xl bg-teal-800 px-5 py-2.5" onPress={() => router.back()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const amountDue = Number(invoice.balanceDue);
  const showCheckStatus = elapsed >= 45;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onDismiss={hideToast} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <LinearGradient
          colors={['#065F46', '#0F766E', '#115E59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-3 pb-7 rounded-b-[32px] shadow-lg shadow-teal-900/20">
          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center gap-1 mb-5" onPress={() => router.back()}>
            <Icon as={ChevronLeft} size={20} className="text-white" />
            <Text className="text-base font-semibold text-white">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-medium text-teal-200">Pay invoice</Text>
              <Text className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
                {formatKes(amountDue)}
              </Text>
              <Text className="text-xs text-teal-100/80 mt-0.5">M-Pesa STK Push</Text>
            </View>
            <View className="rounded-2xl bg-white/15 px-3 py-2 items-center border border-white/10">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Invoice</Text>
              <Text className="text-xs font-extrabold text-white">{shortId(invoice.id, 'INV-')}</Text>
            </View>
          </View>

          {/* Step indicator */}
          <View className="flex-row items-center justify-center gap-1.5 mt-6">
            {(['confirm', 'processing', 'result'] as Step[]).map((s, i) => {
              const active = displayStep === s;
              return (
                <View key={s} className="flex-row items-center gap-1.5">
                  {i === 0 ? null : <View className="h-[2px] w-6 bg-white/25" />}
                  <View
                    className={`h-6 min-w-6 px-2 rounded-full items-center justify-center ${
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
            <Text className="text-lg font-extrabold text-slate-900 mb-3">Payment summary</Text>

            <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 mb-6 divide-y divide-slate-100">
              <View className="flex-row items-center justify-between pb-3">
                <Text className="text-sm text-slate-600">Monthly rent</Text>
                <Text className="text-sm font-bold text-slate-900">{formatKes(baseRentItem?.amount ?? invoice.amount)}</Text>
              </View>
              {serviceChargeItem ? (
                <View className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">Service charge</Text>
                  <Text className="text-sm font-bold text-slate-900">{formatKes(serviceChargeItem.amount)}</Text>
                </View>
              ) : null}
              {lateFeeItem ? (
                <View className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">Late fee</Text>
                  <Text className="text-sm font-bold text-slate-900">{formatKes(lateFeeItem.amount)}</Text>
                </View>
              ) : null}
              {otherItems.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">{item.description}</Text>
                  <Text className="text-sm font-bold text-slate-900">{formatKes(item.amount)}</Text>
                </View>
              ))}
              <View className="flex-row items-center justify-between pt-3">
                <Text className="text-base font-extrabold text-slate-900">Total</Text>
                <Text className="text-base font-extrabold text-teal-800">{formatKes(invoice.balanceDue)}</Text>
              </View>
            </View>

            {/* Phone confirmation */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-extrabold text-slate-900">Confirm your number</Text>
                <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1">
                  <Icon as={Smartphone} size={12} className="text-emerald-600" />
                  <Text className="text-[10px] font-bold text-emerald-700">M-PESA</Text>
                </View>
              </View>

              <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                {editingPhone ? (
                  <>
                    <Text className="text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`h-11 rounded-xl border px-3.5 text-sm text-slate-900 bg-slate-50/50 ${
                        phoneError ? 'border-rose-300' : 'border-slate-200'
                      }`}
                    />
                    {phoneError ? <Text className="text-xs text-rose-600 mt-1.5">{phoneError}</Text> : null}
                    <Text className="text-[11px] text-slate-500 mt-1.5">
                      A one-time prompt is sent to this number only; it won&apos;t update your profile.
                    </Text>
                    <View className="flex-row items-center gap-2 mt-4">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="flex-1 h-11 rounded-xl items-center justify-center bg-slate-100"
                        onPress={() => {
                          setEditingPhone(false);
                          setPhoneError(null);
                          setPhoneNumber(profile?.phone?.trim() ?? '');
                        }}>
                        <Text className="text-sm font-bold text-slate-700">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        className="flex-1 h-11 rounded-xl items-center justify-center bg-teal-800"
                        onPress={handleConfirmPhone}>
                        <Text className="text-sm font-bold text-white">Confirm number</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50 border border-teal-100">
                        <Icon as={Smartphone} size={22} className="text-teal-700" />
                      </View>
                      <View>
                        <Text className="text-xs text-slate-500">Prompt will be sent to</Text>
                        <Text className="text-base font-bold text-slate-900">{displayPhone}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="h-10 px-3 rounded-xl items-center justify-center bg-slate-100"
                      onPress={() => {
                        setEditingPhone(true);
                        setPhoneError(null);
                      }}>
                      <Icon as={Pencil} size={16} className="text-slate-700" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View className="flex-row items-start gap-2.5 mt-3 px-1">
                <Icon as={ShieldCheck} size={16} className="text-teal-700 mt-0.5" />
                <Text className="flex-1 text-xs text-slate-500 leading-5">
                  When you continue, a prompt will be pushed to your M-Pesa number. You&apos;ll need to
                  enter your PIN on your phone to authorize the payment of{' '}
                  <Text className="font-bold text-slate-700">{formatKes(invoice.balanceDue)}</Text>.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={initiateStk.isPending}
              onPress={handleSendPrompt}
              className="rounded-2xl overflow-hidden shadow-lg shadow-teal-900/20">
              <LinearGradient
                colors={['#0F766E', '#115E59', '#134E4A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-4 px-6 flex-row items-center justify-center gap-2">
                {initiateStk.isPending ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text className="text-base font-bold text-white">Sending prompt…</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-base font-bold text-white">
                      Confirm & send prompt
                    </Text>
                    <Icon as={ArrowRight} size={18} className="text-white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {displayStep === 'processing' && (
          <View className="mx-6 mt-8 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200 border border-slate-200 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-teal-50 border border-teal-100 mb-4">
              <ActivityIndicator size="large" color="#0F766E" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-1 text-center">
              Enter your M-Pesa PIN
            </Text>
            <Text className="text-sm text-slate-500 text-center leading-6 mb-5">
              A payment prompt has been sent to{' '}
              <Text className="font-bold text-slate-700">{displayPhone}</Text>. Enter your PIN on
              your phone when prompted to complete this payment of{' '}
              <Text className="font-bold text-slate-900">{formatKes(amountDue)}</Text>.
            </Text>

            <View className="w-full rounded-xl bg-slate-50 p-3.5 mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-600">Reference</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {payment?.transactionRef ? shortId(payment.transactionRef, 'REF-') : '…'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-600">Waiting for confirmation</Text>
                <Text className="text-xs font-bold text-teal-800">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2 px-1 mb-5">
              <Icon as={Lock} size={14} className="text-slate-400 mt-0.5" />
              <Text className="flex-1 text-xs text-slate-500 leading-5">
                Keep this screen open. Your payment status updates automatically.
              </Text>
            </View>

            {showCheckStatus ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={verifyPayment.isPending}
                onPress={handleCheckStatus}
                className="w-full flex-row items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 py-3.5">
                {verifyPayment.isPending ? (
                  <ActivityIndicator size="small" color="#0F766E" />
                ) : (
                  <>
                    <Icon as={RefreshCw} size={16} className="text-teal-700" />
                    <Text className="text-sm font-bold text-teal-800">
                      Taking long? Check status
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {displayStep === 'result' && (
          <View className="mx-6 mt-8 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200 border border-slate-200 items-center">
            {paymentStatus === 'SUCCESS' ? (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                  <Icon as={CheckCircle2} size={32} className="text-emerald-600" />
                </View>
                <Text className="text-xl font-bold text-slate-900 mb-1">
                  Payment received
                </Text>
                <Text className="text-sm text-slate-500 text-center mb-5">
                  Your rent payment of{' '}
                  <Text className="font-bold text-slate-900">{formatKes(paymentData?.amount ?? amountDue)}</Text>{' '}
                  was completed successfully.
                </Text>

                <View className="w-full rounded-xl bg-slate-50 p-4 mb-6 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-slate-600">Amount paid</Text>
                    <Text className="text-sm font-bold text-slate-900">
                      {formatKes(paymentData?.amount ?? amountDue)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-slate-600">M-Pesa receipt</Text>
                    <Text className="text-sm font-bold text-slate-900">
                      {paymentData?.mpesaReceiptNumber ?? shortId(paymentData?.transactionRef ?? '', 'REF-')}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-slate-600">Date & time</Text>
                    <Text className="text-sm font-bold text-slate-900">
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
                  className="w-full rounded-2xl bg-teal-800 py-3.5 items-center shadow-lg shadow-teal-900/20">
                  <Text className="text-base font-bold text-white">Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-rose-50 border border-rose-200 mb-4">
                  <Icon as={XCircle} size={32} className="text-rose-600" />
                </View>
                <Text className="text-xl font-bold text-slate-900 mb-1">
                  Payment not completed
                </Text>
                <Text className="text-sm text-slate-500 text-center leading-6 mb-5">
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
                    className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-teal-800 py-3.5 shadow-lg shadow-teal-900/20">
                    <Icon as={RefreshCw} size={16} className="text-white" />
                    <Text className="text-base font-bold text-white">Try again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleDone}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 items-center">
                    <Text className="text-base font-bold text-slate-700">Close</Text>
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