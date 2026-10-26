import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  Droplet,
  Home,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  Wrench,
} from "lucide-react-native";

import { ListMessage } from "@/components/owner/list-state";
import { RecordManualPaymentDialog } from "@/components/owner/record-manual-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { Toast } from "@/components/ui/toast";
import { useInvoice } from "@/hooks/queries/use-invoices";
import { useToast } from "@/hooks/use-toast";
import {
  formatDateLong,
  formatKes,
  formatPeriod,
  tenantName,
} from "@/lib/format";
import {
  getDerivedInvoiceStatus,
  getStatusTheme,
  normalizeInvoiceStatus,
} from "@/lib/invoice-status-theme";
import { getLineItemMeta } from "@/lib/line-item-meta";

const styles = StyleSheet.create({
  statusBadge: {
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusPartialBadge: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  lineItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  lineItemAmount: {
    textAlign: "right",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
});

function StatusBadge({
  status,
  isSecondary = false,
}: {
  status: string;
  isSecondary?: boolean;
}) {
  const theme = getStatusTheme(status as any);
  const isPartial = status === "PARTIAL";
  const badgeStyle = { backgroundColor: theme.tint, borderColor: theme.border };
  const dotStyle = { backgroundColor: theme.accent };
  const statusTextStyle = { color: theme.text };
  const partialTextStyle = { color: "#1d4ed8" };

  return (
    <View className="flex-row items-center gap-2">
      <Badge
        className="flex-row items-center gap-1.5 px-2.5 py-1"
        style={[badgeStyle, styles.statusBadge]}
      >
        <View className="rounded-full" style={[dotStyle, styles.statusDot]} />
        <Text
          className="text-xs font-bold uppercase tracking-[0.1em]"
          style={statusTextStyle}
        >
          {theme.label}
        </Text>
      </Badge>

      {isSecondary && isPartial ? (
        <Badge className="px-2 py-0.5" style={styles.statusPartialBadge}>
          <Text
            className="text-xs font-bold uppercase tracking-[0.1em]"
            style={partialTextStyle}
          >
            PARTIAL
          </Text>
        </Badge>
      ) : null}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: any;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View className="flex-row items-start gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon
          as={icon}
          size={16}
          className={muted ? "text-slate-500" : "text-slate-600"}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
          {label}
        </Text>
        <Text
          className="text-sm font-semibold text-slate-900"
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function BalanceDueBox({ value }: { value: string }) {
  return (
    <View className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3">
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <Icon as={Wallet} size={16} className="text-amber-700" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-[0.15em] text-amber-700">
            Balance Due
          </Text>
          <Text className="text-sm font-bold text-slate-900">{value}</Text>
        </View>
      </View>
    </View>
  );
}

function LineItemRow({
  item,
  index,
  totalCount,
}: {
  item: any;
  index: number;
  totalCount: number;
}) {
  const meta = getLineItemMeta(item.type);
  const isLast = index === totalCount - 1;

  return (
    <View>
      <View className="flex-row items-start gap-2.5 py-2">
        <View
          className="items-center justify-center rounded-lg"
          style={[{ backgroundColor: meta.tile }, styles.lineItemIcon]}
        >
          <Icon as={meta.icon} size={16} color={meta.accent} />
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-semibold uppercase tracking-[0.1em]">
            {meta.label}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={2}>
            {item.description || "Invoice line item"}
          </Text>
        </View>

        <Text
          className="text-sm font-bold text-slate-900"
          style={styles.lineItemAmount}
        >
          {formatKes(item.amount)}
        </Text>
      </View>
      {!isLast ? <Separator className="h-0.5 bg-slate-100/50" /> : null}
    </View>
  );
}

function PaymentButton({ onPress }: { onPress: () => void }) {
  return (
    <Card className="rounded-2xl border border-slate-100/50 bg-white p-4 shadow-sm">
      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
            <Icon as={Banknote} size={18} className="text-emerald-800" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              Record a payment
            </Text>
            <Text className="text-xs text-slate-500">
              Log a payment received for this invoice and adjust the balance.
            </Text>
          </View>
        </View>

        <Button
          className="w-full rounded-xl bg-emerald-800 shadow-sm shadow-emerald-800/15 py-2.5 text-white flex items-center justify-center gap-2"
          onPress={onPress}
        >
          <Icon as={Plus} size={16} className="text-white" />
          <Text className="text-sm font-semibold">Record Payment</Text>
        </Button>
      </View>
    </Card>
  );
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = typeof id === "string" ? id : (id?.[0] ?? "");

  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;
  const [recordOpen, setRecordOpen] = useState(false);
  const { visible, message, type, showToast, hideToast } = useToast();

  const status = useMemo(() => {
    if (!invoice) return "UNPAID";

    const derived = getDerivedInvoiceStatus(invoice);
    const rawStatus = normalizeInvoiceStatus(invoice.status);

    if (invoice.status === "PAID" || Number(invoice.balanceDue) === 0)
      return "PAID";
    if (derived === "OVERDUE" || rawStatus === "OVERDUE") return "OVERDUE";
    if (derived === "PARTIAL" || rawStatus === "PARTIAL") return "PARTIAL";
    return "UNPAID";
  }, [invoice]);

  const lineItems = invoice?.lineItems ?? [];
  const amountPaid = invoice
    ? Math.max(0, Number(invoice.amount) - Number(invoice.balanceDue))
    : 0;
  const totalItems = lineItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const canRecordPayment =
    !!invoice && Number(invoice.balanceDue) > 0 && invoice.status !== "PAID";
  const showPartialBadge =
    status === "OVERDUE" &&
    amountPaid > 0 &&
    amountPaid < Number(invoice?.amount ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <Toast
        visible={visible}
        message={message}
        type={type}
        onDismiss={hideToast}
      />

      <View className="flex-row items-center gap-3 border-b border-slate-100/50 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
        >
          <Icon as={ArrowLeft} size={18} className="text-slate-900" />
        </Pressable>
        <Text className="flex-1 text-sm font-bold text-slate-900">
          Invoice Details
        </Text>
      </View>

      {invoiceQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F766E" />
        </View>
      ) : invoiceQuery.isError || !invoice ? (
        <ListMessage
          title="Couldn't load invoice"
          subtitle={
            invoiceQuery.error
              ? (invoiceQuery.error as Error).message
              : "Invoice not found"
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">
            <Card className="overflow-hidden rounded-2xl border border-slate-100/50 bg-white shadow-sm">
              <LinearGradient
                colors={["#f87171", "#fca5a5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentBar}
              />
              <View className="p-4">
                <View className="mb-3 flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-slate-900">
                    General Information
                  </Text>
                  <StatusBadge status={status} isSecondary={showPartialBadge} />
                </View>

                <View className="gap-3">
                  <InfoRow
                    icon={Receipt}
                    label="Amount"
                    value={formatKes(invoice.amount)}
                  />
                  <BalanceDueBox
                    value={
                      Number(invoice.balanceDue) === 0
                        ? formatKes(0)
                        : formatKes(invoice.balanceDue)
                    }
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Due Date"
                    value={formatDateLong(invoice.dueDate)}
                  />
                  <InfoRow
                    icon={Home}
                    label="Unit"
                    value={`Unit ${invoice.unit?.unitNumber ?? "—"} • ${invoice.unit?.property?.name ?? "Property"}`}
                  />
                </View>
              </View>
            </Card>

            <Card className="rounded-2xl border border-slate-100/50 bg-white p-4 shadow-sm">
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <Text className="text-sm font-semibold text-slate-900">
                  Line Items
                </Text>
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-slate-600">
                    {lineItems.length} item{lineItems.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>

              {lineItems.length === 0 ? (
                <View className="py-3">
                  <Text className="text-center text-sm text-slate-500">
                    No line items available
                  </Text>
                </View>
              ) : (
                <View>
                  {lineItems.map((item, index) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      totalCount={lineItems.length}
                    />
                  ))}
                </View>
              )}
            </Card>

            <Card className="rounded-2xl border border-slate-100/50 bg-white p-4 shadow-sm">
              <Text className="text-sm font-semibold text-slate-900">
                Tenant Information
              </Text>
              <View className="gap-1.5">
                <View className="flex-row items-center justify-between gap-1.5 py-1">
                  <Text className="text-xs text-slate-500">Tenant</Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    Tenant 1
                  </Text>
                </View>
                <Separator className="bg-slate-100/50" />
                <View className="flex-row items-center justify-between gap-1.5 py-1">
                  <Text className="text-xs text-slate-500">Billing Period</Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {formatPeriod(invoice.periodStart)}
                  </Text>
                </View>
              </View>
            </Card>

            {canRecordPayment ? (
              <PaymentButton onPress={() => setRecordOpen(true)} />
            ) : null}
          </View>
        </ScrollView>
      )}

      {invoice ? (
        <RecordManualPaymentDialog
          invoice={invoice}
          open={recordOpen}
          onOpenChange={setRecordOpen}
          onToast={showToast}
        />
      ) : null}
    </SafeAreaView>
  );
}
