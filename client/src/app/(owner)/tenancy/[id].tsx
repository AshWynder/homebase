import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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
  Plus,
  Smartphone,
  User,
} from 'lucide-react-native';

import { GenerateTenancyInvoiceDialog } from '@/components/owner/generate-tenancy-invoice-dialog';
import { ListMessage } from '@/components/owner/list-state';
import { TenantContactActions } from '@/components/owner/tenant-contact-actions';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useDeferredChange } from '@/hooks/use-deferred-change';
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
  UNPAID: { bg: 'bg-warning/10', text: 'text-warning', label: 'PENDING' },
  PARTIALLY_PAID: { bg: 'bg-warning/10', text: 'text-warning', label: 'PARTIAL' },
  PAID: { bg: 'bg-success/10', text: 'text-success', label: 'PAID' },
  OVERDUE: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'OVERDUE' },
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  MPESA_STK: 'M-Pesa STK Push',
  MPESA_C2B: 'M-Pesa C2B',
  CARD: 'Card Payment',
  CASH: 'Cash',
  BANK: 'Bank Transfer',
  MPESA: 'M-Pesa',
};

const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; text: string }
> = {
  SUCCESS: { label: 'Completed', text: 'text-success' },
  PENDING: { label: 'Pending', text: 'text-warning' },
  FAILED: { label: 'Failed', text: 'text-destructive' },
};

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  tabActive: { backgroundColor: '#0F172A' },
  tabInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
});

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
  const onTabChange = useDeferredChange(tab, setTab);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { visible, message, type, showToast, hideToast } = useToast();

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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-muted active:bg-border">
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-foreground">
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
          contentContainerClassName="p-4 pb-10 gap-4"
          showsVerticalScrollIndicator={false}>
          {/* Profile summary */}
          <View className="gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm shadow-black/5">
            <View className="flex-row items-start gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-lg font-bold text-primary">
                  {initials(name)}
                </Text>
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-lg font-bold text-foreground">{name}</Text>
                  <Badge
                    variant="secondary"
                    className={
                      tenancy.isActive ? 'bg-success/10' : 'bg-muted'
                    }>
                    <Text
                      className={cn(
                        'text-[10px] font-semibold',
                        tenancy.isActive
                          ? 'text-success'
                          : 'text-muted-foreground',
                      )}>
                      {tenancy.isActive ? 'ACTIVE' : 'ENDED'}
                    </Text>
                  </Badge>
                </View>
                <Text className="text-sm text-muted-foreground">
                  {propertyName} • Unit {unitNumber}
                </Text>
                {address ? (
                  <Text className="text-xs text-muted-foreground">{address}</Text>
                ) : null}
              </View>
            </View>

            <TenantContactActions
              phone={phone}
              email={email}
              name={name}
              profileId={tenancy.tenant?.id}
            />

            <View className="gap-1 rounded-2xl bg-primary/10 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-primary">
                Monthly Rent
              </Text>
              <Text className="text-xl font-bold text-foreground">
                {formatKes(tenancy.rentAmount)}
                <Text className="text-xs font-medium text-muted-foreground">/mo</Text>
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Icon as={Calendar} size={12} className="text-primary" />
                <Text className="text-[11px] text-primary">
                  Started {formatDateLong(tenancy.startDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2">
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onTabChange(item.key)}
                  className="rounded-full px-4 py-2"
                  style={active ? styles.tabActive : styles.tabInactive}>
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      active ? 'text-white' : 'text-muted-foreground',
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
              onGenerate={() => setGenerateOpen(true)}
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

      <GenerateTenancyInvoiceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onToast={showToast}
        tenancyId={tenancyId}
        tenantName={name}
        monthlyRent={tenancy?.rentAmount ?? ''}
      />

      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
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
        <View className="h-2 w-2 rounded-full bg-primary" />
        <Text className="text-base font-bold text-foreground">{title}</Text>
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
    <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-muted">
        <Icon as={icon} size={16} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="text-sm font-semibold text-foreground">{value}</Text>
        {hint ? (
          <Text className="text-xs text-muted-foreground">{hint}</Text>
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
  onGenerate,
}: {
  invoices: Invoice[];
  pendingCount: number;
  loading: boolean;
  error: boolean;
  errorMessage?: string;
  onGenerate?: () => void;
}) {
  return (
    <View>
      <SectionHeader
        title="Invoices & Status"
        trailing={
          <View className="flex-row items-center gap-2">
            {pendingCount > 0 ? (
              <Badge variant="secondary" className="bg-destructive/10">
                <Text className="text-[10px] font-semibold text-destructive">
                  {pendingCount} Pending
                </Text>
              </Badge>
            ) : null}
            <Pressable
              onPress={onGenerate}
              className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5 active:bg-primary/90"
              accessibilityLabel="Generate invoice for this tenant">
              <Icon as={Plus} size={12} className="text-primary-foreground" />
              <Text className="text-[10px] font-semibold text-primary-foreground">
                Generate
              </Text>
            </Pressable>
          </View>
        }
      />

      {loading ? (
        <ActivityIndicator color="#0F766E" className="py-8" />
      ) : error ? (
        <ListMessage title="Couldn't load invoices" subtitle={errorMessage} />
      ) : invoices.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-border bg-card px-4 py-8">
          <Text className="text-center text-sm text-muted-foreground">
            No invoices for this tenancy yet.
          </Text>
          {onGenerate ? (
            <Pressable
              onPress={onGenerate}
              className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 active:bg-primary/90">
              <Icon as={Plus} size={14} className="text-primary-foreground" />
              <Text className="text-xs font-semibold text-primary-foreground">
                Create first invoice
              </Text>
            </Pressable>
          ) : null}
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
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-success/10">
          <Icon as={CheckCircle2} size={18} className="text-success" />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-foreground">
              {shortId(invoice.id, '#INV-')}
            </Text>
            <Badge variant="secondary" className={style.bg}>
              <Text className={cn('text-[10px] font-semibold', style.text)}>{style.label}</Text>
            </Badge>
          </View>
          <Text className="text-xs text-muted-foreground">
            {formatPeriod(invoice.periodStart)} • Due{' '}
            {formatDateLong(invoice.dueDate)}
          </Text>
        </View>
        <Text className="text-sm font-bold text-foreground">
          {formatKes(invoice.amount)}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-foreground">
              {shortId(invoice.id, '#INV-')}
            </Text>
            <Badge variant="secondary" className={style.bg}>
              <Text className={cn('text-[10px] font-semibold', style.text)}>{style.label}</Text>
            </Badge>
          </View>
          <Text className="text-xs text-muted-foreground">
            {formatPeriod(invoice.periodStart)} rent & utilities
          </Text>
        </View>
        <Text className="text-base font-bold text-foreground">
          {formatKes(invoice.amount)}
        </Text>
      </View>

      <View
        className={cn(
          'flex-row items-start gap-2 rounded-xl px-3 py-2.5',
          invoice.status === 'OVERDUE' ? 'bg-destructive/10' : 'bg-warning/10',
        )}>
        <Icon
          as={Clock}
          size={14}
          className={
            invoice.status === 'OVERDUE' ? 'text-destructive' : 'text-warning'
          }
        />
        <View className="flex-1">
          <Text
            className={cn(
              'text-xs font-medium',
              invoice.status === 'OVERDUE' ? 'text-destructive' : 'text-warning',
            )}>
            {dueLabel(invoice.dueDate, invoice.status)}
          </Text>
          {Number(invoice.balanceDue) > 0 ? (
            <Text className="mt-0.5 text-[11px] text-muted-foreground">
              Balance due {formatKes(invoice.balanceDue)}
            </Text>
          ) : null}
        </View>
      </View>

      {(invoice.lineItems?.length ?? 0) > 0 ? (
        <View className="gap-2 border-t border-border pt-3">
          {invoice.lineItems!.map((item) => (
            <View
              key={item.id}
              className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-xs text-muted-foreground">
                {item.description}
              </Text>
              <Text className="text-xs font-semibold text-foreground">
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
        <View className="rounded-2xl border border-dashed border-border bg-card px-4 py-8">
          <Text className="text-center text-sm text-muted-foreground">
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
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon as={MethodIcon} size={18} className="text-primary" />
                </View>
                <View className="flex-1 gap-0.5">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      {PAYMENT_METHOD_LABEL[payment.method]}
                    </Text>
                    <View className="rounded-md bg-muted px-1.5 py-0.5">
                      <Text className="text-[10px] font-medium text-muted-foreground">
                        {shortId(
                          payment.mpesaReceiptNumber ?? payment.transactionRef,
                          '#',
                        )}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    {payment.invoicePeriod
                      ? ` • ${payment.invoicePeriod}`
                      : ''}
                  </Text>
                </View>
                <View className="items-end gap-0.5">
                  <Text className="text-sm font-bold text-success">
                    +{formatKes(payment.amount)}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    {payment.status === 'SUCCESS' ? (
                      <Icon
                        as={CheckCircle2}
                        size={12}
                        className="text-success"
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
