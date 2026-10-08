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
  Megaphone,
  FileText,
  ShieldCheck,
  ChevronRight,
  FileMinus,
} from 'lucide-react-native';

import { StartGroupChatButton } from '@/components/chat/start-chat-button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/stores/use-store';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePayments } from '@/hooks/queries/use-payments';
import { useUnreadNoticeCount, useRecentNotices } from '@/hooks/queries/use-notices';
import {
  flattenMaintenancePages,
  useMaintenanceTickets,
} from '@/hooks/queries/use-maintenance';
import { formatDateLong, formatKes, formatMonthYear } from '@/lib/format';
import type { LucideIcon } from 'lucide-react-native';

type ActivityKind = 'payment' | 'invoice' | 'maintenance' | 'notice' | 'tenancy';

type ActivityTone = 'positive' | 'danger' | 'warning' | 'muted';

/** One merged row of the recent-activity feed, in whatever source it came from. */
interface ActivityRow {
  id: string;
  kind: ActivityKind;
  category: string;
  title: string;
  subtitle: string;
  trailing: string;
  trailingTone: ActivityTone;
  /** ISO timestamp the feed is sorted by. */
  date: string;
  onPress: () => void;
}

const ACTIVITY_VISUALS: Record<
  ActivityKind,
  { icon: LucideIcon; tile: string; iconColor: string }
> = {
  payment: {
    icon: CreditCard,
    tile: 'bg-emerald-50 border-emerald-100',
    iconColor: 'text-emerald-600',
  },
  invoice: {
    icon: FileText,
    tile: 'bg-indigo-50 border-indigo-100',
    iconColor: 'text-indigo-600',
  },
  maintenance: {
    icon: Wrench,
    tile: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-600',
  },
  notice: {
    icon: Megaphone,
    tile: 'bg-teal-50 border-teal-100',
    iconColor: 'text-teal-600',
  },
  tenancy: {
    icon: FileMinus,
    tile: 'bg-rose-50 border-rose-100',
    iconColor: 'text-rose-600',
  },
};

const TONE_TEXT: Record<ActivityTone, string> = {
  positive: 'text-emerald-600',
  danger: 'text-rose-600',
  warning: 'text-amber-600',
  muted: 'text-slate-600',
};

export default function TenantHomeScreen() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);

  // Fetch active tenancy for tenant
  const tenancyQuery = useTenancies({
    tenantId: profile?.id,
    isActive: true,
    limit: 1,
  });
  const activeTenancy = tenancyQuery.data?.items?.[0];
  const homeProperty = activeTenancy?.unit?.property;
  const homePropertyId = homeProperty?.id;
  const homePropertyName = homeProperty?.name;

  // Drives the bell badge, so it is refetched with everything else on refresh.
  const unreadNotices = useUnreadNoticeCount();

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

  // Repair tickets and notices for the recent-activity feed
  const maintenanceQuery = useMaintenanceTickets();
  const recentNoticesQuery = useRecentNotices(5);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      tenancyQuery.refetch(),
      invoicesQuery.refetch(),
      paymentsQuery.refetch(),
      maintenanceQuery.refetch(),
      recentNoticesQuery.refetch(),
      unreadNotices.refetch(),
    ]);
    setRefreshing(false);
  };

  /**
   * Real activity from every source the tenant can act on — payments, invoices,
   * repairs and notices — categorized and merged into one list, newest first.
   */
  const recentActivity = useMemo<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [
      ...(paymentsQuery.data?.items ?? []).map<ActivityRow>((payment) => {
        const date = payment.paidAt ?? payment.createdAt;
        const succeeded = payment.status === 'SUCCESS';
        const pending = payment.status === 'PENDING';
        const method =
          payment.method === 'MPESA_STK'
            ? 'M-Pesa STK'
            : payment.method === 'MPESA_C2B'
              ? 'M-Pesa PayBill'
              : 'Card';
        return {
          id: `payment-${payment.id}`,
          kind: 'payment',
          category: 'Payment',
          title: succeeded
            ? 'Payment received'
            : pending
              ? 'Payment pending'
              : 'Payment failed',
          subtitle: `${method} • ${formatDateLong(date)}`,
          trailing: `${succeeded ? '+' : ''}${formatKes(payment.amount)}`,
          trailingTone: succeeded ? 'positive' : pending ? 'warning' : 'danger',
          date,
          onPress: () => router.push('/(tenant)/(tabs)/payments'),
        };
      }),
      ...(invoicesQuery.data?.items ?? []).map<ActivityRow>((invoice) => ({
        id: `invoice-${invoice.id}` as const,
        kind: 'invoice',
        category: 'Invoice',
        title: 'Invoice issued',
        subtitle: `${formatMonthYear(invoice.periodStart)} statement • ${formatDateLong(invoice.createdAt)}`,
        trailing:
          invoice.status === 'PAID'
            ? 'Paid'
            : invoice.status === 'OVERDUE'
              ? 'Overdue'
              : invoice.status === 'PARTIALLY_PAID'
                ? 'Part paid'
                : 'Unpaid',
        trailingTone:
          invoice.status === 'PAID'
            ? 'positive'
            : invoice.status === 'OVERDUE'
              ? 'danger'
              : 'warning',
        date: invoice.createdAt,
        onPress: () => router.push('/(tenant)/(tabs)/payments'),
      })),
      ...flattenMaintenancePages(maintenanceQuery.data?.pages).map<ActivityRow>(
        (ticket) => ({
          id: `ticket-${ticket.id}`,
          kind: 'maintenance',
          category: 'Maintenance',
          title: ticket.description,
          subtitle: `Maintenance • ${formatDateLong(ticket.updatedAt)}`,
          trailing:
            ticket.status === 'RESOLVED'
              ? 'Resolved'
              : ticket.status === 'IN_PROGRESS'
                ? 'In progress'
                : 'Open',
          trailingTone:
            ticket.status === 'RESOLVED'
              ? 'positive'
              : ticket.status === 'IN_PROGRESS'
                ? 'warning'
                : 'muted',
          date: ticket.updatedAt,
          onPress: () => router.push(`/(tenant)/maintenance/${ticket.id}`),
        }),
      ),
      ...(recentNoticesQuery.data?.items ?? []).map<ActivityRow>((notice) => ({
        id: `notice-${notice.id}`,
        kind: 'notice',
        category: 'Notice',
        title: notice.title,
        subtitle: `Notice • ${formatDateLong(notice.createdAt)}`,
        trailing: notice.isRead ? '' : 'New',
        trailingTone: 'warning' as const,
        date: notice.createdAt,
        onPress: () => router.push('/(tenant)/(tabs)/notices'),
      })),
    ];

    return rows
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 5);
  }, [
    paymentsQuery.data,
    invoicesQuery.data,
    maintenanceQuery.data,
    recentNoticesQuery.data,
  ]);

  const isFeedLoading =
    paymentsQuery.isPending ||
    invoicesQuery.isPending ||
    maintenanceQuery.isPending ||
    recentNoticesQuery.isPending;

  const unread = unreadNotices.data ?? 0;

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
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tenant)/account')}
            className="flex-row items-center gap-3">
            <Avatar size="md" className="border-2 border-teal-100 shadow-sm">
              {user?.image ? (
                <AvatarImage source={{ uri: user.image }} />
              ) : (
                <AvatarFallback className="bg-teal-700">
                  <Text className="text-sm font-bold text-white">{initials}</Text>
                </AvatarFallback>
              )}
            </Avatar>
            <View>
              <Text className="text-xs font-medium text-slate-500">Good day,</Text>
              <Text className="text-xl font-bold tracking-tight text-slate-900">
                {displayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            {homePropertyId ? (
              <StartGroupChatButton
                propertyId={homePropertyId}
                label="Group"
                className="h-10"
                accessibilityLabel={`Open the group chat for ${homePropertyName ?? 'your property'}`}
              />
            ) : null}

            <TouchableOpacity
              activeOpacity={0.7}
              className="relative h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              accessibilityRole="button"
              accessibilityLabel={
                unread > 0
                  ? `Notices, ${unread} unread`
                  : 'Notices'
              }
              onPress={() => router.push('/(tenant)/(tabs)/notices')}>
              <Icon as={Bell} size={20} className="text-slate-700" />
              {unread > 0 ? (
                <View className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-500" />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              accessibilityRole="button"
              accessibilityLabel="Account settings"
              onPress={() => router.push('/(tenant)/account')}>
              <Avatar size="sm">
                {user?.image ? (
                  <AvatarImage source={{ uri: user.image }} />
                ) : (
                  <AvatarFallback className="bg-slate-200">
                    <Text className="text-xs font-bold text-slate-700">{initials}</Text>
                  </AvatarFallback>
                )}
              </Avatar>
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
              shadowColor: '#0F766E',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 4,
            }}>
            {/* Header / Subtitle */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon as={Sparkles} size={16} className="text-teal-200" />
                <Text className="text-xs font-semibold tracking-wider text-teal-100 uppercase">
                  {homePropertyName || 'Current Balance'}
                </Text>
              </View>
              {activeTenancy?.unit?.unitNumber && (
                <View className="rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur-md">
                  <Text className="text-xs font-medium text-white">
                    Unit {activeTenancy.unit.unitNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Total Balance Amount */}
            <View className="mt-4">
              <Text className="text-3xl font-extrabold tracking-tight text-white">
                {formatKes(totalBalanceDue)}
              </Text>
              <Text className="mt-1 text-xs text-teal-100">
                Due date: <Text className="font-semibold text-white">{dueDateStr}</Text>
              </Text>
            </View>

            {/* Action Bar */}
            <View className="mt-6 flex-row items-center gap-3">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePayPress}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white py-3.5 shadow-sm">
                <Text className="text-sm font-bold text-teal-900">
                  {dueInvoice ? 'Pay Current Rent' : 'View Invoices'}
                </Text>
                <Icon as={ArrowUpRight} size={16} className="text-teal-900" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions Grid */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tenant)/(tabs)/payments')}
              className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 items-start">
              <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <Icon as={CreditCard} size={18} className="text-emerald-700" />
              </View>
              <Text className="text-xs font-bold text-slate-800">Pay Rent</Text>
              <Text className="text-[10px] text-slate-500">M-Pesa / Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tenant)/maintenance/new')}
              className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 items-start">
              <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Icon as={Wrench} size={18} className="text-amber-700" />
              </View>
              <Text className="text-xs font-bold text-slate-800">Fix Issue</Text>
              <Text className="text-[10px] text-slate-500">Report repair</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tenant)/(tabs)/notices')}
              className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 items-start">
              <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
                <Icon as={Megaphone} size={18} className="text-teal-700" />
              </View>
              <Text className="text-xs font-bold text-slate-800">Notices</Text>
              <Text className="text-[10px] text-slate-500">Updates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tenant)/account')}
              className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 items-start">
              <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                <Icon as={ShieldCheck} size={18} className="text-indigo-700" />
              </View>
              <Text className="text-xs font-bold text-slate-800">Account</Text>
              <Text className="text-[10px] text-slate-500">Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categorized Recent Activity Feed */}
        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tenant)/(tabs)/payments')}>
              <Text className="text-xs font-semibold text-teal-700">View all</Text>
            </TouchableOpacity>
          </View>

          {isFeedLoading ? (
            <View className="gap-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </View>
          ) : recentActivity.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-slate-200 p-6 items-center justify-center">
              <Text className="text-xs text-slate-400">No recent transactions or activities.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {recentActivity.map((item) => {
                const visual = ACTIVITY_VISUALS[item.kind];
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={item.onPress}
                    className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-100">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-xl border ${visual.tile}`}>
                        <Icon as={visual.icon} size={18} className={visual.iconColor} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            numberOfLines={1}
                            className="text-xs font-bold text-slate-900 flex-1">
                            {item.title}
                          </Text>
                          <View className="rounded-md bg-slate-100 px-1.5 py-0.5">
                            <Text className="text-[9px] font-semibold text-slate-600">
                              {item.category}
                            </Text>
                          </View>
                        </View>
                        <Text numberOfLines={1} className="text-[11px] text-slate-500 mt-0.5">
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      {item.trailing ? (
                        <Text className={`text-xs font-bold ${TONE_TEXT[item.trailingTone]}`}>
                          {item.trailing}
                        </Text>
                      ) : (
                        <Icon as={ChevronRight} size={16} className="text-slate-300" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
