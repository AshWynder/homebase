import { useState, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Sparkles,
  ArrowUpRight,
  CreditCard,
  Wrench,
  MessageSquare,
  FileText,
  ShieldCheck,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useStore } from '@/stores/use-store';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePayments } from '@/hooks/queries/use-payments';
import { useSignOut } from '@/hooks/queries/use-auth';
import { formatDateLong, formatKes } from '@/lib/format';

export default function TenantHomeScreen() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const signOut = useSignOut();

  // Fetch active tenancy for tenant
  const tenancyQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });
  const activeTenancy = tenancyQuery.data?.items?.[0];

  // Fetch invoices for tenancy
  const invoicesQuery = useInvoices(
    activeTenancy ? { tenancyId: activeTenancy.id, limit: 20 } : { limit: 1 },
  );
  const invoices = invoicesQuery.data?.items ?? [];

  // Find the latest pending/unpaid invoice with balance due > 0
  const pendingInvoice = useMemo(() => {
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

  // Overall balance due across all active/pending invoices
  const totalBalanceDue = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
  }, [invoices]);

  // Fetch recent payments
  const paymentsQuery = usePayments({ limit: 5 });
  const recentPayments = paymentsQuery.data?.items ?? [];

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

  const displayName = user?.name?.trim() || 'Resident';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dueInvoice = pendingInvoice;
  const dueDateStr = dueInvoice?.dueDate
    ? formatDateLong(dueInvoice.dueDate)
    : 'No pending due';

  const handlePayPress = () => {
    if (dueInvoice) {
      router.push(`/(tenant)/pay/${dueInvoice.id}`);
    } else {
      router.push('/(tenant)/(tabs)/payments');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F766E']}
            tintColor="#0F766E"
          />
        }>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-cyan-400 shadow-sm shadow-cyan-200">
              <Text className="text-base font-bold text-white">{initials}</Text>
            </View>
            <View>
              <Text className="text-xs font-medium text-slate-500">Good morning,</Text>
              <Text className="text-xl font-bold tracking-tight text-slate-900">
                {displayName}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              className="relative h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              onPress={() => router.push('/(tenant)/(tabs)/notices')}>
              <Icon as={Bell} size={20} className="text-slate-700" />
              <View className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-500" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              onPress={() => signOut.mutate()}
              disabled={signOut.isPending}>
              <Icon as={LogOut} size={18} className="text-slate-600" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimal Balance Due Card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
          <LinearGradient
            colors={['#0E7490', '#0F766E', '#115E59']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              padding: 24,
              shadowColor: '#042f2e',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 6,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(204, 251, 241, 0.9)' }}>
                Balance due
              </Text>
              <View
                style={{
                  height: 40,
                  width: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                }}>
                <Icon as={Sparkles} size={18} className="text-white" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(255, 255, 255, 0.9)', marginRight: 6 }}>
                KSh
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 }}>
                {formatKes(totalBalanceDue).replace('KES ', '')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#99f6e4' }}>
                .00
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
              }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(153, 246, 228, 0.8)' }}>
                  Due on
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
                  {dueDateStr}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 9999,
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
                onPress={handlePayPress}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#134e4a' }}>
                  Pay now
                </Text>
                <Icon as={ArrowUpRight} size={16} className="text-teal-900" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View className="px-6 pt-7">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-lg font-bold text-slate-900">Quick actions</Text>
          </View>

          <View className="flex-row justify-between">
            {/* Pay rent */}
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center"
              style={{ width: '22%' }}
              onPress={handlePayPress}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 border border-cyan-100">
                <Icon as={CreditCard} size={22} className="text-cyan-600" />
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-slate-700">
                Pay rent
              </Text>
            </TouchableOpacity>

            {/* Request repair */}
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center"
              style={{ width: '22%' }}
              onPress={() => router.push('/(tenant)/(tabs)/maintenance')}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
                <Icon as={Wrench} size={22} className="text-amber-600" />
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-slate-700">
                Request repair
              </Text>
            </TouchableOpacity>

            {/* Message manager */}
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center"
              style={{ width: '22%' }}
              onPress={() => router.push('/(tenant)/(tabs)/chats')}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 border border-purple-100">
                <Icon as={MessageSquare} size={22} className="text-purple-600" />
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-slate-700">
                Message manager
              </Text>
            </TouchableOpacity>

            {/* View documents */}
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center"
              style={{ width: '22%' }}
              onPress={() => router.push('/(tenant)/(tabs)/payments')}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100">
                <Icon as={FileText} size={22} className="text-emerald-600" />
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-slate-700">
                View documents
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-6 pt-8">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-lg font-bold text-slate-900">Recent activity</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tenant)/(tabs)/payments')}>
              <Text className="text-xs font-semibold text-cyan-600">View all</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {recentPayments.length > 0 ? (
              recentPayments.slice(0, 3).map((payment) => (
                <View
                  key={payment.id}
                  className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-100">
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                      <Icon as={CreditCard} size={20} className="text-emerald-600" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        Rent payment received
                      </Text>
                      <Text className="text-xs text-slate-500">
                        {formatDateLong(payment.paidAt ?? payment.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold text-emerald-600">
                    +{formatKes(payment.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-100">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                    <Icon as={CreditCard} size={20} className="text-emerald-600" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900">
                      Rent payment received
                    </Text>
                    <Text className="text-xs text-slate-500">April 01, 2024</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-emerald-600">
                  +KSh 48,500
                </Text>
              </View>
            )}

            {/* Maintenance item */}
            <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-100">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                  <Icon as={Wrench} size={20} className="text-amber-600" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900">
                    Maintenance request updated
                  </Text>
                  <Text className="text-xs text-slate-500">March 29, 2024</Text>
                </View>
              </View>
              <Text className="text-xs font-semibold text-slate-600">
                In progress
              </Text>
            </View>

            {/* Lease document signed */}
            <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-100">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-purple-50 border border-purple-100">
                  <Icon as={FileText} size={20} className="text-purple-600" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900">
                    Lease document signed
                  </Text>
                  <Text className="text-xs text-slate-500">March 24, 2024</Text>
                </View>
              </View>
              <Text className="text-xs font-semibold text-slate-600">
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* Promo footer card */}
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200">
                <Icon as={ShieldCheck} size={22} className="text-cyan-600" />
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-900">
                  Your home, simplified
                </Text>
                <Text className="text-xs text-slate-500">
                  Everything you need in one place.
                </Text>
              </View>
            </View>
            <Icon as={ChevronRight} size={18} className="text-slate-400" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
