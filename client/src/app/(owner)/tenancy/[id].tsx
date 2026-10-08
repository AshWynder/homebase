import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Home,
  IdCard,
  Smartphone,
  User,
} from 'lucide-react-native';

import { ListMessage } from '@/components/owner/list-state';
import { TenantContactActions } from '@/components/owner/tenant-contact-actions';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInvoices } from '@/hooks/queries/use-invoices';
import { useTenancy } from '@/hooks/queries/use-tenancies';
import {
  daysUntil,
  formatDateLong,
  formatDateTime,
  formatKes,
  formatPeriod,
  shortId,
  tenantName,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@/api/types';

type DetailTab = 'all' | 'personal' | 'invoices' | 'payments';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'all', label: 'All Details' },
  { key: 'personal', label: 'Personal Info' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payment' },
];

const INVOICE_STATUS: Record<
  InvoiceStatus,
  { bg: string; text: string; label: string }
> = {
  UNPAID: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'PENDING' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'PARTIAL' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'PAID' },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'OVERDUE' },
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  MPESA_STK: 'M-Pesa STK Push',
  MPESA_C2B: 'M-Pesa C2B',
  CARD: 'Card Payment',
};

const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; text: string }
> = {
  SUCCESS: { label: 'Completed', text: 'text-emerald-700' },
  PENDING: { label: 'Pending', text: 'text-amber-700' },
  FAILED: { label: 'Failed', text: 'text-red-700' },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function maskNationalId(value?: string | null): string {
  if (!value) return '—';
  if (value.length <= 4) return value;
  return `•••• ${value.slice(-4)}`;
}

function dueLabel(dueDate: string, status: InvoiceStatus): string {
  const days = daysUntil(dueDate);
  if (days === null) return formatDateLong(dueDate);
  if (status === 'PAID') return `Settled • Due was ${formatDateLong(dueDate)}`;
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} (${formatDateLong(dueDate)})`;
  if (days === 0) return `Due today (${formatDateLong(dueDate)})`;
  return `Due in ${days} day${days === 1 ? '' : 's'} (${formatDateLong(dueDate)})`;
}

export default function TenancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenancyId = typeof id === 'string' ? id : id?.[0] ?? '';
  const [tab, setTab] = useState<DetailTab>('all');

  const tenancyQuery = useTenancy(tenancyId);
  const invoicesQuery = useInvoices({ tenancyId, limit: 100 });

  const tenancy = tenancyQuery.data;
  const invoices = invoicesQuery.data?.items ?? [];
  const name = tenantName(tenancy);
  const phone = tenancy?.tenant?.phone;
  const email = tenancy?.tenant?.user?.email;
  const propertyName = tenancy?.unit?.property?.name ?? 'Property';
  const unitNumber = tenancy?.unit?.unitNumber ?? '—';
  const address = tenancy?.unit?.property?.address;

  const pendingCount = useMemo(
    () =>
      invoices.filter((inv) => inv.status !== 'PAID').length,
    [invoices],
  );

  const payments = useMemo(() => {
    const rows: (Payment & { invoicePeriod?: string })[] = [];
    for (const inv of invoices) {
      for (const payment of inv.payments ?? []) {
        rows.push({
          ...payment,
          invoicePeriod: formatPeriod(inv.periodStart),
        });
      }
    }
    return rows.sort(
      (a, b) =>
        new Date(b.paidAt ?? b.createdAt).getTime() -
        new Date(a.paidAt ?? a.createdAt).getTime(),
    );
  }, [invoices]);

  const showPersonal = tab === 'all' || tab === 'personal';
  const showInvoices = tab === 'all' || tab === 'invoices';
  const showPayments = tab === 'all' || tab === 'payments';

  const loading = tenancyQuery.isLoading;
  const error = tenancyQuery.isError;

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
          <Icon as={ArrowLeft} size={18} className="text-slate-800" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-slate-900">
          Tenancy Details
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F766E" />
        </View>
      ) : error || !tenancy ? (
        <ListMessage
          title="Couldn't load tenancy"
          subtitle={
            tenancyQuery.error
              ? (tenancyQuery.error as Error).message
              : 'Tenancy not found'
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          {/* Profile summary */}
          <View className="gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5">
            <View className="flex-row items-start gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-teal-100">
                <Text className="text-lg font-bold text-teal-800">
                  {initials(name)}
                </Text>
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-lg font-bold text-slate-900">{name}</Text>
                  <Badge
                    variant="secondary"
                    className={
                      tenancy.isActive ? 'bg-emerald-100' : 'bg-slate-100'
                    }>
                    <Text
                      className={cn(
                        'text-[10px] font-semibold',
                        tenancy.isActive
                          ? 'text-emerald-800'
                          : 'text-slate-600',
                      )}>
                      {tenancy.isActive ? 'ACTIVE' : 'ENDED'}
                    </Text>
                  </Badge>
                </View>
                <Text className="text-sm text-slate-500">
                  {propertyName} • Unit {unitNumber}
                </Text>
                {address ? (
                  <Text className="text-xs text-slate-400">{address}</Text>
                ) : null}
              </View>
            </View>

            <TenantContactActions
              phone={phone}
              email={email}
              name={name}
              profileId={tenancy.tenant?.id}
            />

            <View className="gap-1 rounded-2xl bg-teal-50 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-teal-700">
                Monthly Rent
              </Text>
              <Text className="text-xl font-bold text-slate-900">
                {formatKes(tenancy.rentAmount)}
                <Text className="text-xs font-medium text-slate-500">/mo</Text>
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Icon as={Calendar} size={12} className="text-teal-600" />
                <Text className="text-[11px] text-teal-700">
                  Started {formatDateLong(tenancy.startDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  className={cn(
                    'rounded-full px-4 py-2',
                    active ? 'bg-slate-900' : 'bg-white border border-slate-200',
                  )}>
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      active ? 'text-white' : 'text-slate-600',
                    )}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {showPersonal ? (
            <PersonalSection
              name={name}
              email={email}
              phone={phone}
              nationalId={tenancy.tenant?.nationalId}
              role={tenancy.tenant?.role}
              propertyName={propertyName}
              unitNumber={unitNumber}
              address={address}
              blockName={tenancy.unit?.blockName}
            />
          ) : null}

          {showInvoices ? (
            <InvoicesSection
              invoices={invoices}
              pendingCount={pendingCount}
              loading={invoicesQuery.isLoading}
              error={invoicesQuery.isError}
              errorMessage={
                invoicesQuery.error
                  ? (invoicesQuery.error as Error).message
                  : undefined
              }
            />
          ) : null}

          {showPayments ? (
            <PaymentsSection
              payments={payments}
              loading={invoicesQuery.isLoading}
            />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-teal-600" />
        <Text className="text-base font-bold text-slate-900">{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof User;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
        <Icon as={icon} size={16} className="text-slate-600" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </Text>
        <Text className="text-sm font-semibold text-slate-900">{value}</Text>
        {hint ? (
          <Text className="text-xs text-slate-500">{hint}</Text>
        ) : null}
      </View>
    </View>
  );
}

function PersonalSection({
  name,
  email,
  phone,
  nationalId,
  role,
  propertyName,
  unitNumber,
  address,
  blockName,
}: {
  name: string;
  email?: string;
  phone?: string;
  nationalId?: string | null;
  role?: string;
  propertyName: string;
  unitNumber: string;
  address?: string | null;
  blockName?: string | null;
}) {
  return (
    <View>
      <SectionHeader title="Personal Information" />
      <View className="gap-2.5">
        <InfoRow icon={IdCard} label="Full Name" value={name} />
        <InfoRow
          icon={AtSign}
          label="Email Address"
          value={email ?? '—'}
        />
        <InfoRow
          icon={Smartphone}
          label="Mobile Phone"
          value={phone ?? '—'}
        />
        <InfoRow
          icon={User}
          label="National ID"
          value={maskNationalId(nationalId)}
          hint={nationalId ? undefined : 'Not provided'}
        />
        <InfoRow
          icon={Home}
          label="Unit"
          value={`Unit ${unitNumber}${blockName ? ` • ${blockName}` : ''}`}
          hint={[propertyName, address].filter(Boolean).join(' • ') || undefined}
        />
        {role ? (
          <InfoRow icon={FileText} label="Role" value={role} />
        ) : null}
      </View>
    </View>
  );
}

function InvoicesSection({
  invoices,
  pendingCount,
  loading,
  error,
  errorMessage,
}: {
  invoices: Invoice[];
  pendingCount: number;
  loading: boolean;
  error: boolean;
  errorMessage?: string;
}) {
  return (
    <View>
      <SectionHeader
        title="Invoices & Status"
        trailing={
          pendingCount > 0 ? (
            <Badge variant="secondary" className="bg-red-100">
              <Text className="text-[10px] font-semibold text-red-700">
                {pendingCount} Pending
              </Text>
            </Badge>
          ) : null
        }
      />

      {loading ? (
        <ActivityIndicator color="#0F766E" className="py-8" />
      ) : error ? (
        <ListMessage title="Couldn't load invoices" subtitle={errorMessage} />
      ) : invoices.length === 0 ? (
        <View className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8">
          <Text className="text-center text-sm text-slate-500">
            No invoices for this tenancy yet.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </View>
      )}
    </View>
  );
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const style = INVOICE_STATUS[invoice.status];
  const isOpen =
    invoice.status === 'UNPAID' ||
    invoice.status === 'OVERDUE' ||
    invoice.status === 'PARTIALLY_PAID';

  if (!isOpen) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
          <Icon as={CheckCircle2} size={18} className="text-emerald-600" />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-slate-900">
              {shortId(invoice.id, '#INV-')}
            </Text>
            <Badge variant="secondary" className={style.bg}>
              <Text className={cn('text-[10px] font-semibold', style.text)}>{style.label}</Text>
            </Badge>
          </View>
          <Text className="text-xs text-slate-500">
            {formatPeriod(invoice.periodStart)} • Due{' '}
            {formatDateLong(invoice.dueDate)}
          </Text>
        </View>
        <Text className="text-sm font-bold text-slate-900">
          {formatKes(invoice.amount)}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-slate-900">
              {shortId(invoice.id, '#INV-')}
            </Text>
            <Badge variant="secondary" className={style.bg}>
              <Text className={cn('text-[10px] font-semibold', style.text)}>{style.label}</Text>
            </Badge>
          </View>
          <Text className="text-xs text-slate-500">
            {formatPeriod(invoice.periodStart)} rent & utilities
          </Text>
        </View>
        <Text className="text-base font-bold text-slate-900">
          {formatKes(invoice.amount)}
        </Text>
      </View>

      <View
        className={cn(
          'flex-row items-start gap-2 rounded-xl px-3 py-2.5',
          invoice.status === 'OVERDUE' ? 'bg-red-50' : 'bg-amber-50',
        )}>
        <Icon
          as={Clock}
          size={14}
          className={
            invoice.status === 'OVERDUE' ? 'text-red-600' : 'text-amber-700'
          }
        />
        <View className="flex-1">
          <Text
            className={cn(
              'text-xs font-medium',
              invoice.status === 'OVERDUE' ? 'text-red-700' : 'text-amber-800',
            )}>
            {dueLabel(invoice.dueDate, invoice.status)}
          </Text>
          {Number(invoice.balanceDue) > 0 ? (
            <Text className="mt-0.5 text-[11px] text-slate-500">
              Balance due {formatKes(invoice.balanceDue)}
            </Text>
          ) : null}
        </View>
      </View>

      {(invoice.lineItems?.length ?? 0) > 0 ? (
        <View className="gap-2 border-t border-slate-100 pt-3">
          {invoice.lineItems!.map((item) => (
            <View
              key={item.id}
              className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-xs text-slate-600">
                {item.description}
              </Text>
              <Text className="text-xs font-semibold text-slate-800">
                {formatKes(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PaymentsSection({
  payments,
  loading,
}: {
  payments: (Payment & { invoicePeriod?: string })[];
  loading: boolean;
}) {
  return (
    <View>
      <SectionHeader title="Payment History" />

      {loading ? (
        <ActivityIndicator color="#0F766E" className="py-8" />
      ) : payments.length === 0 ? (
        <View className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8">
          <Text className="text-center text-sm text-slate-500">
            No successful payments recorded yet.
          </Text>
        </View>
      ) : (
        <View className="gap-2.5">
          {payments.map((payment) => {
            const status = PAYMENT_STATUS[payment.status];
            const MethodIcon =
              payment.method === 'CARD' ? CreditCard : Smartphone;
            return (
              <View
                key={payment.id}
                className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                  <Icon as={MethodIcon} size={18} className="text-teal-700" />
                </View>
                <View className="flex-1 gap-0.5">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-slate-900">
                      {PAYMENT_METHOD_LABEL[payment.method]}
                    </Text>
                    <View className="rounded-md bg-slate-100 px-1.5 py-0.5">
                      <Text className="text-[10px] font-medium text-slate-500">
                        {shortId(
                          payment.mpesaReceiptNumber ?? payment.transactionRef,
                          '#',
                        )}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500">
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    {payment.invoicePeriod
                      ? ` • ${payment.invoicePeriod}`
                      : ''}
                  </Text>
                </View>
                <View className="items-end gap-0.5">
                  <Text className="text-sm font-bold text-emerald-700">
                    +{formatKes(payment.amount)}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    {payment.status === 'SUCCESS' ? (
                      <Icon
                        as={CheckCircle2}
                        size={12}
                        className="text-emerald-600"
                      />
                    ) : null}
                    <Text className={cn('text-[11px] font-medium', status.text)}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
