import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Banknote, Calendar, Home, Receipt } from 'lucide-react-native';

import { ListMessage } from '@/components/owner/list-state';
import { RecordManualPaymentDialog } from '@/components/owner/record-manual-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useInvoice } from '@/hooks/queries/use-invoices';
import { useToast } from '@/hooks/use-toast';
import { formatDateLong, formatKes, formatPeriod, tenantName } from '@/lib/format';
import type { InvoiceStatus } from '@/api/types';

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  UNPAID: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-warning/10', text: 'text-warning', label: 'PARTIAL' },
  PAID: { bg: 'bg-success/10', text: 'text-success', label: 'PAID' },
  OVERDUE: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'OVERDUE' },
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 py-2">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon as={Icon} size={16} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-sm font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = typeof id === 'string' ? id : id?.[0] ?? '';

  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;

  const loading = invoiceQuery.isLoading;
  const error = invoiceQuery.isError;

  const [recordOpen, setRecordOpen] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  const lineItems = invoice?.lineItems ?? [];
  const canRecordPayment = !!invoice && invoice.status !== 'PAID' && Number(invoice.balanceDue) > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Toast visible={visible} message={message} type={type} onDismiss={hideToast} />
      <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full bg-muted active:bg-border">
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-foreground">
          Invoice Details
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F766E" />
        </View>
      ) : error || !invoice ? (
        <ListMessage
          title="Couldn't load invoice"
          subtitle={
            invoiceQuery.error
              ? (invoiceQuery.error as Error).message
              : 'Invoice not found'
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-10 gap-4"
          showsVerticalScrollIndicator={false}>
          {/* General Information Card */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                General Information
              </Text>
              <Badge variant="secondary" className={STATUS_STYLES[invoice.status].bg}>
                <Text
                  className={`text-[11px] font-semibold ${STATUS_STYLES[invoice.status].text}`}>
                  {STATUS_STYLES[invoice.status].label}
                </Text>
              </Badge>
            </View>

            <View className="gap-1">
              <InfoRow
                icon={Receipt}
                label="Amount"
                value={formatKes(invoice.amount)}
              />
              <InfoRow
                icon={Receipt}
                label="Balance Due"
                value={formatKes(invoice.balanceDue)}
              />
              <InfoRow
                icon={Calendar}
                label="Due Date"
                value={formatDateLong(invoice.dueDate)}
              />
              <InfoRow
                icon={Home}
                label="Unit"
                value={`Unit ${invoice.unit?.unitNumber ?? '—'} • ${invoice.unit?.property?.name ?? 'Property'}`}
              />
            </View>
          </View>

          {/* Line Items Card */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-bold text-foreground">
              Line Items
            </Text>

            {lineItems.length === 0 ? (
              <View className="py-8">
                <Text className="text-center text-sm text-muted-foreground">
                  No line items available
                </Text>
              </View>
            ) : (
              <View className="gap-0">
                {lineItems.map((item, index) => (
                  <View key={item.id}>
                    <View className="gap-2 py-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 gap-1">
                          <Text className="text-sm font-semibold text-foreground">
                            {item.type}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {item.description}
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-foreground">
                          {formatKes(item.amount)}
                        </Text>
                      </View>
                    </View>
                    {index < lineItems.length - 1 && (
                      <View className="h-px bg-border" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Tenant Information */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-bold text-foreground">
              Tenant Information
            </Text>
            <View className="gap-1">
              <View className="flex-row items-start justify-between py-2">
                <Text className="text-sm text-muted-foreground">Tenant</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {tenantName(invoice.tenancy)}
                </Text>
              </View>
              <View className="flex-row items-start justify-between py-2">
                <Text className="text-sm text-muted-foreground">Billing Period</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {formatPeriod(invoice.periodStart)}
                </Text>
              </View>
            </View>
          </View>

          {/* Backup settlement: record a cash/bank/M-Pesa payment an owner
              received outside the provider flow. */}
          {canRecordPayment ? (
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-center gap-2">
                <Icon as={Banknote} size={18} className="text-primary" />
                <Text className="text-base font-bold text-foreground">
                  Record a payment
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                Received cash or a direct transfer? Mark this invoice fully or
                partially paid to update its balance due.
              </Text>
              <Button onPress={() => setRecordOpen(true)}>
                <Text>Record Payment</Text>
              </Button>
            </View>
          ) : null}
        </ScrollView>
      )}

      <RecordManualPaymentDialog
        invoice={invoice ?? null}
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onToast={showToast}
      />
    </SafeAreaView>
  );
}
