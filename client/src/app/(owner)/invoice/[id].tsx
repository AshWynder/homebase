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
  Calendar,
  Home,
  Receipt,
  Wallet,
} from "lucide-react-native";

import { ListMessage } from "@/components/owner/list-state";
import { RecordManualPaymentDialog } from "@/components/owner/record-manual-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
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
        <Badge
          className="px-2 py-0.5"
          style={[
            styles.statusPartialBadge,
            { borderColor: "hsl(var(--info))", backgroundColor: "hsl(var(--info)/0.1)" },
          ]}
        >
          <Text
            className="text-xs font-bold uppercase tracking-[0.1em]"
            style={{ color: "hsl(var(--info))" }}
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
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon as={icon} size={16} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </Text>
        <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function BalanceDueBox({ value }: { value: string }) {
  return (
    <View className="w-full rounded-xl border border-warning/40 bg-warning/10 p-3">
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-warning/20">
          <Icon as={Wallet} size={16} className="text-warning" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-[0.15em] text-warning">
            Balance Due
          </Text>
          <Text className="text-sm font-bold text-foreground">{value}</Text>
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
          <Text className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
            {meta.label}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {item.description || "Invoice line item"}
          </Text>
        </View>

        <Text className="text-sm font-bold text-foreground" style={styles.lineItemAmount}>
          {formatKes(item.amount)}
        </Text>
      </View>
      {!isLast ? <Separator className="h-0.5 bg-border/50" /> : null}
    </View>
  );
}

function PaymentButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      className="h-12 w-full rounded-xl bg-primary"
      accessibilityRole="button"
      accessibilityLabel="Record manual payment"
    >
      <Icon as={Wallet} size={18} className="text-primary-foreground" />
      <Text className="ml-2 text-sm font-bold text-primary-foreground">
        Record Manual Payment
      </Text>
    </Button>
  );
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceQuery = useInvoice(id ?? "");
  const { showToast } = useToast();
  const [recordOpen, setRecordOpen] = useState(false);

  const invoice = invoiceQuery.data;

  if (invoiceQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:bg-accent"
          >
            <Icon as={ArrowLeft} size={18} className="text-foreground" />
          </Pressable>
          <Text className="flex-1 text-sm font-bold text-foreground">Invoice Details</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F766E" />
        </View>
      </SafeAreaView>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:bg-accent"
          >
            <Icon as={ArrowLeft} size={18} className="text-foreground" />
          </Pressable>
          <Text className="flex-1 text-sm font-bold text-foreground">Invoice Details</Text>
        </View>
        <ListMessage
          title="Couldn't load invoice"
          subtitle={invoiceQuery.error ? (invoiceQuery.error as Error).message : "Invoice not found"}
        />
      </SafeAreaView>
    );
  }

  const lineItems = invoice.lineItems ?? [];
  const status = getDerivedInvoiceStatus(invoice);
  const isPaid = status === "PAID";
  const showPartialBadge = status === "PARTIAL";
  const canRecordPayment = !isPaid;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-full bg-muted active:bg-accent"
        >
          <Icon as={ArrowLeft} size={18} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-sm font-bold text-foreground">Invoice Details</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <LinearGradient
              colors={[getStatusTheme(status as any).accent, getStatusTheme(status as any).border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
            <View className="p-4">
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <Text className="text-sm font-semibold text-foreground">General Information</Text>
                <StatusBadge status={status} isSecondary={showPartialBadge} />
              </View>

              <View className="gap-3">
                <InfoRow icon={Receipt} label="Amount" value={formatKes(invoice.amount)} />
                <BalanceDueBox value={Number(invoice.balanceDue) === 0 ? formatKes(0) : formatKes(invoice.balanceDue)} />
                <InfoRow icon={Calendar} label="Due Date" value={formatDateLong(invoice.dueDate)} />
                <InfoRow
                  icon={Home}
                  label="Unit"
                  value={`Unit ${invoice.unit?.unitNumber ?? "—"} • ${invoice.unit?.property?.name ?? "Property"}`}
                />
              </View>
            </View>
          </Card>

          <Card className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Text className="text-sm font-semibold text-foreground">Line Items</Text>
              <View className="rounded-full bg-muted px-2 py-0.5">
                <Text className="text-xs font-semibold text-muted-foreground">
                  {lineItems.length} item{lineItems.length === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            {lineItems.length === 0 ? (
              <View className="py-3">
                <Text className="text-center text-sm text-muted-foreground">No line items available</Text>
              </View>
            ) : (
              <View>
                {lineItems.map((item: any, index: number) => (
                  <LineItemRow key={item.id} item={item} index={index} totalCount={lineItems.length} />
                ))}
              </View>
            )}
          </Card>

          <Card className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Text className="text-sm font-semibold text-foreground">Tenant Information</Text>
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between gap-1.5 py-1">
                <Text className="text-xs text-muted-foreground">Tenant</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {invoice.tenancy?.tenant ? tenantName(invoice.tenancy.tenant) : "Tenant 1"}
                </Text>
              </View>
              <Separator className="bg-border/50" />
              <View className="flex-row items-center justify-between gap-1.5 py-1">
                <Text className="text-xs text-muted-foreground">Billing Period</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {formatPeriod(invoice.periodStart)}
                  {invoice.periodEnd ? ` - ${formatPeriod(invoice.periodEnd)}` : ""}
                </Text>
              </View>
            </View>
          </Card>

          {canRecordPayment ? <PaymentButton onPress={() => setRecordOpen(true)} /> : null}
        </View>
      </ScrollView>

      <RecordManualPaymentDialog invoice={invoice} open={recordOpen} onOpenChange={setRecordOpen} onToast={showToast} />
    </SafeAreaView>
  );
}
