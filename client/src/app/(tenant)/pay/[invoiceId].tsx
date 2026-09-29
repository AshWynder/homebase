import { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useStore } from '@/stores/use-store';
import { useInvoice } from '@/hooks/queries/use-invoices';
import { useInitiateStkPayment } from '@/hooks/queries/use-payments';
import { formatKes, shortId } from '@/lib/format';

export default function TenantPayInvoiceModal() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;

  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);

  const [paymentMethod, setPaymentMethod] = useState<'stk' | 'c2b'>('stk');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone ?? '');
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const initiateStk = useInitiateStkPayment();

  // Itemized breakdown lines
  const lineItems = invoice?.lineItems ?? [];
  const baseRentItem = lineItems.find((li) => li.type === 'RENT');
  const serviceChargeItem = lineItems.find((li) => li.type === 'SERVICE_CHARGE');
  const lateFeeItem = lineItems.find((li) => li.description?.toLowerCase().includes('late'));
  const otherItems = lineItems.filter(
    (li) => li !== baseRentItem && li !== serviceChargeItem && li !== lateFeeItem,
  );

  const handleProceed = async () => {
    if (!invoice) return;

    if (paymentMethod === 'stk') {
      const cleanPhone = phoneNumber.trim();
      if (!cleanPhone) {
        Alert.alert('Phone Required', 'Please enter your M-Pesa phone number.');
        return;
      }

      initiateStk.mutate(
        { invoiceId: invoice.id, phoneNumber: cleanPhone },
        {
          onSuccess: () => {
            setPaymentSubmitted(true);
          },
          onError: (err: any) => {
            Alert.alert(
              'Payment Initiation Failed',
              err?.response?.data?.message ??
                'Could not trigger M-Pesa prompt. Please try again.',
            );
          },
        },
      );
    } else {
      Alert.alert(
        'Pay via PayBill',
        `Business No: 522522 (or property paybill)\nAccount No: ${invoice.id}\nAmount: ${formatKes(
          invoice.balanceDue,
        )}`,
      );
    }
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
        <TouchableOpacity
          className="rounded-xl bg-teal-800 px-5 py-2.5"
          onPress={() => router.back()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Gradient Header */}
        <LinearGradient
          colors={['#065F46', '#0F766E', '#115E59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-3 pb-8 rounded-b-[32px] shadow-lg shadow-teal-900/20">
          {/* Back button */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-1 mb-5"
            onPress={() => router.back()}>
            <Icon as={ChevronLeft} size={20} className="text-white" />
            <Text className="text-base font-semibold text-white">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs font-medium text-teal-200">
                Invoice details
              </Text>
              <View className="flex-row items-baseline mt-1 mb-1">
                <Text className="text-lg font-bold text-white/90 mr-1.5">
                  KES
                </Text>
                <Text className="text-4xl font-extrabold tracking-tight text-white">
                  {formatKes(invoice.balanceDue).replace('KES ', '')}
                </Text>
                <Text className="text-base font-bold text-teal-200">.00</Text>
              </View>
              <Text className="text-xs text-teal-100/80">Total due</Text>
            </View>

            <View className="rounded-2xl bg-white/15 px-3 py-2 items-center border border-white/10">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-teal-200">
                INVOICE
              </Text>
              <Text className="text-xs font-extrabold text-white">
                {shortId(invoice.id, 'INV-')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {paymentSubmitted ? (
          <View className="mx-6 mt-6 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200 border border-slate-200 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 mb-3">
              <Icon as={CheckCircle2} size={32} className="text-emerald-600" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-1">
              Prompt Sent to Phone!
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-5">
              Please enter your M-Pesa PIN on {phoneNumber} to complete payment of{' '}
              {formatKes(invoice.balanceDue)}.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              className="w-full rounded-2xl bg-teal-800 py-3.5 items-center"
              onPress={() => router.replace('/(tenant)/(tabs)/payments')}>
              <Text className="text-base font-bold text-white">
                Done & View Status
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-6 pt-5">
            {/* Payment Summary */}
            <Text className="text-lg font-extrabold text-slate-900 mb-3">
              Payment summary
            </Text>

            <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 mb-6 divide-y divide-slate-100">
              {/* Monthly rent */}
              <View className="flex-row items-center justify-between pb-3">
                <Text className="text-sm text-slate-600">Monthly rent</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {formatKes(baseRentItem?.amount ?? invoice.amount)}
                </Text>
              </View>

              {/* Service charge if any or other items */}
              {serviceChargeItem ? (
                <View className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">Service charge</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {formatKes(serviceChargeItem.amount)}
                  </Text>
                </View>
              ) : null}

              {/* Late fee if any */}
              {lateFeeItem ? (
                <View className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">Late fee</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {formatKes(lateFeeItem.amount)}
                  </Text>
                </View>
              ) : null}

              {/* Other utility lines */}
              {otherItems.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between py-3">
                  <Text className="text-sm text-slate-600">
                    {item.description}
                  </Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {formatKes(item.amount)}
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              <View className="flex-row items-center justify-between pt-3">
                <Text className="text-base font-extrabold text-slate-900">
                  Total
                </Text>
                <Text className="text-base font-extrabold text-teal-800">
                  {formatKes(invoice.balanceDue)}
                </Text>
              </View>
            </View>

            {/* Select Payment Method */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-extrabold text-slate-900">
                Select payment method
              </Text>
              <Text className="text-xs font-semibold text-slate-400">
                Secure payment
              </Text>
            </View>

            {/* Method 1: STK Push */}
            <TouchableOpacity
              activeOpacity={0.85}
              className={`rounded-2xl border p-4 mb-3 bg-white ${
                paymentMethod === 'stk'
                  ? 'border-teal-600 ring-2 ring-teal-500/20'
                  : 'border-slate-200'
              }`}
              onPress={() => setPaymentMethod('stk')}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                    <Icon as={Smartphone} size={22} className="text-emerald-600" />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-slate-900">
                        STK Push
                      </Text>
                      <View className="rounded-md bg-emerald-100 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-emerald-800">
                          M-Pesa
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Send a prompt to your M-Pesa number
                    </Text>
                  </View>
                </View>

                {/* Radio button */}
                <View
                  className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    paymentMethod === 'stk'
                      ? 'border-teal-700 bg-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                  {paymentMethod === 'stk' && (
                    <View className="h-2.5 w-2.5 rounded-full bg-teal-700" />
                  )}
                </View>
              </View>

              {/* Phone input when STK is selected */}
              {paymentMethod === 'stk' && (
                <View className="mt-3.5 pt-3 border-t border-slate-100">
                  <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                    M-Pesa Phone Number
                  </Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="e.g. 0712345678 or +254..."
                    keyboardType="phone-pad"
                    className="h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 bg-slate-50/50"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Method 2: C2B / PayBill */}
            <TouchableOpacity
              activeOpacity={0.85}
              className={`rounded-2xl border p-4 mb-6 bg-white ${
                paymentMethod === 'c2b'
                  ? 'border-teal-600 ring-2 ring-teal-500/20'
                  : 'border-slate-200'
              }`}
              onPress={() => setPaymentMethod('c2b')}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50 border border-teal-100">
                    <Icon as={CreditCard} size={22} className="text-teal-700" />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-slate-900">
                        C2B / PayBill
                      </Text>
                      <View className="rounded-md bg-teal-100 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-teal-800">
                          M-Pesa
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Pay via PayBill or account number
                    </Text>
                  </View>
                </View>

                {/* Radio button */}
                <View
                  className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    paymentMethod === 'c2b'
                      ? 'border-teal-700 bg-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                  {paymentMethod === 'c2b' && (
                    <View className="h-2.5 w-2.5 rounded-full bg-teal-700" />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Proceed to payment action button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={initiateStk.isPending}
              onPress={handleProceed}
              className="rounded-2xl overflow-hidden shadow-lg shadow-teal-900/20">
              <LinearGradient
                colors={['#0F766E', '#115E59', '#134E4A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-4 px-6 flex-row items-center justify-center gap-2">
                {initiateStk.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="text-base font-bold text-white">
                      Proceed to payment
                    </Text>
                    <Icon as={ArrowRight} size={18} className="text-white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
