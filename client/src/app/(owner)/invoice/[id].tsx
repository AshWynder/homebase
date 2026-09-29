import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Home, Receipt } from 'lucide-react-native';

import { ListMessage } from '@/components/owner/list-state';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInvoice } from '@/hooks/queries/use-invoices';
import { formatDate, formatDateLong, formatKes, formatPeriod, tenantName } from '@/lib/format';
import type { Invoice, InvoiceStatus } from '@/api/types';

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  UNPAID: { bg: 'bg-red-100', text: 'text-red-700', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PARTIAL' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PAID' },
  OVERDUE: { bg: 'bg-red-200', text: 'text-red-800', label: 'OVERDUE' },
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
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon as={Icon} size={16} className="text-slate-600" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs text-slate-500">{label}</Text>
        <Text className="text-sm font-semibold text-slate-900">{value}</Text>
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

  const lineItems = invoice?.lineItems ?? [];

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
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          {/* General Information Card */}
          <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-900">
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
          <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">
              Line Items
            </Text>

            {lineItems.length === 0 ? (
              <View className="py-8">
                <Text className="text-center text-sm text-slate-500">
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
                          <Text className="text-sm font-semibold text-slate-900">
                            {item.type}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            {item.description}
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-slate-900">
                          {formatKes(item.amount)}
                        </Text>
                      </View>
                    </View>
                    {index < lineItems.length - 1 && (
                      <View className="h-px bg-slate-200" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Tenant Information */}
          <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">
              Tenant Information
            </Text>
            <View className="gap-1">
              <View className="flex-row items-start justify-between py-2">
                <Text className="text-sm text-slate-500">Tenant</Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {tenantName(invoice.tenancy)}
                </Text>
              </View>
              <View className="flex-row items-start justify-between py-2">
                <Text className="text-sm text-slate-500">Billing Period</Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {formatPeriod(invoice.periodStart)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
