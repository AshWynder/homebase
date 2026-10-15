import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import {
  Wallet,
  Zap,
  CalendarDays,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { formatKes, formatMonthYear, daysUntil } from '@/lib/format';
import type { Invoice } from '@/api/types';

interface OutstandingBalanceCardProps {
  invoices?: Invoice[] | null;
  totalBalance?: number;
  onPayTotal?: () => void;
  onPayInvoice?: (invoice: Invoice) => void;
}

// Styles are hoisted out of render on purpose. NativeWind's native interop
// compares `props.style` by identity on every render, so an inline object
// literal (or array) here never compares equal to the previously captured one
// and re-dispatches from inside the render phase — hanging the app on any
// state change. See react-native-css-interop native-interop.js declarationTracking.
const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  gradient: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#042f2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenterGap10: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox40: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconBox32: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircle56: {
    marginBottom: 12,
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  titleBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  badgeBase: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settledBadge: {
    borderColor: '#d1fae5',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  settledBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#be123c',
  },
  centeredPad28: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  bodyCentered: {
    marginTop: 6,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(204, 251, 241, 0.9)',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(204, 251, 241, 0.9)',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  kesLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 6,
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  calendarIcon: {
    marginRight: 6,
  },
  dueText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(204, 251, 241, 0.9)',
  },
  payButton: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075E54',
  },
  accordion: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionHeaderInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  invoiceList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  invoiceRow: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  invoiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  invoicePeriod: {
    flex: 1,
    paddingRight: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  invoiceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  expanded: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 12,
  },
  detailGroup: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: 'rgba(204, 251, 241, 0.9)',
  },
  detailLabelTruncated: {
    flex: 1,
    marginRight: 16,
    fontSize: 13,
    color: 'rgba(204, 251, 241, 0.9)',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  payThisButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  payThisText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
});

export function TenantOutstandingCard({
  invoices,
  totalBalance,
  onPayTotal,
  onPayInvoice,
}: OutstandingBalanceCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openInvoices = useMemo(
    () =>
      (invoices ?? [])
        .filter((inv) => inv.status !== 'PAID' && Number(inv.balanceDue) > 0)
        .sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
    [invoices],
  );

  const amountToDisplay = useMemo(() => {
    if (totalBalance !== undefined && totalBalance !== null && totalBalance > 0) {
      return totalBalance;
    }
    return openInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
  }, [totalBalance, openInvoices]);

  const hasOutstanding = amountToDisplay > 0 && openInvoices.length > 0;

  const primaryInvoice = openInvoices[0] ?? null;

  const daysLeft = primaryInvoice?.dueDate ? daysUntil(primaryInvoice.dueDate) : null;
  const isOverdue = daysLeft !== null && daysLeft <= 0;
  const dueDaysBadge = hasOutstanding
    ? isOverdue
      ? 'Overdue'
      : daysLeft === null
        ? 'Due Soon'
        : `Due in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`
    : 'All Settled';

  // Memoized so the style array keeps a stable identity across renders.
  const dueBadgeStyle = useMemo(
    () => [
      styles.badgeBase,
      {
        borderColor: isOverdue ? '#fecdd3' : '#ffe4e6',
        backgroundColor: isOverdue ? '#fff1f2' : 'rgba(255, 255, 255, 0.95)',
      },
    ],
    [isOverdue],
  );

  const dueDateStr = useMemo(() => {
    if (!primaryInvoice?.dueDate) return '—';
    const date = new Date(primaryInvoice.dueDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [primaryInvoice]);

  const billingCycleStr = useMemo(() => {
    if (!primaryInvoice?.periodStart) return '—';
    const date = new Date(primaryInvoice.periodStart);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }, [primaryInvoice]);

  const formattedAmount = useMemo(() => {
    return formatKes(amountToDisplay).replace('KES ', '');
  }, [amountToDisplay]);

  // When there are no bills due, render settled card (no buttons, no accordion)
  if (!hasOutstanding) {
    return (
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['#0E7490', '#0F766E', '#115E59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenterGap10}>
              <View style={styles.iconBox40}>
                <Icon as={Wallet} size={20} className="text-white" />
              </View>
              <Text style={styles.title}>Current Outstanding</Text>
            </View>

            <View style={[styles.badgeBase, styles.settledBadge]}>
              <Text style={styles.settledBadgeText}>All Settled</Text>
            </View>
          </View>

          <View style={styles.centeredPad28}>
            <View style={styles.iconCircle56}>
              <Icon as={CheckCircle2} size={30} className="text-white" />
            </View>
            <Text style={styles.titleBold}>No bills to pay</Text>
            <Text style={styles.bodyCentered}>
              You’re all caught up. Your next invoice will appear here once it’s generated.
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Active outstanding card: total balance due + accordion of the invoices
  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={['#0E7490', '#0F766E', '#115E59']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        {/* Header: Wallet icon box + title + Due Badge */}
        <View style={styles.headerRow}>
          <View style={styles.rowCenterGap10}>
            <View style={styles.iconBox40}>
              <Icon as={Wallet} size={20} className="text-white" />
            </View>
            <Text style={styles.title}>Current Outstanding</Text>
          </View>

          <View style={dueBadgeStyle}>
            <Text style={styles.dueBadgeText}>{dueDaysBadge}</Text>
          </View>
        </View>

        {/* Total Amount Due */}
        <Text style={styles.label}>Total Amount Due</Text>
        <View style={styles.amountRow}>
          <Text style={styles.kesLabel}>KES</Text>
          <Text style={styles.amount}>{formattedAmount}</Text>
        </View>

        {/* Due Date & Billing Cycle */}
        <View style={styles.dueRow}>
          <Icon
            as={CalendarDays}
            size={15}
            className="text-teal-50/90"
            style={styles.calendarIcon}
          />
          <Text style={styles.dueText}>
            Due date: {dueDateStr} • Billing cycle: {billingCycleStr}
          </Text>
        </View>

        {/* Pay with M-Pesa Express Button (settles the full outstanding total) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPayTotal}
          style={styles.payButton}>
          <Icon as={Zap} size={18} className="text-[#075E54]" />
          <Text style={styles.payButtonText}>Pay with M–Pesa Express</Text>
        </TouchableOpacity>

        {/* Accordion: list of invoices making up the outstanding balance */}
        <View style={styles.accordion}>
          <View style={styles.accordionHeader}>
            <View style={styles.accordionHeaderInner}>
              <View style={styles.iconBox32}>
                <Icon as={FileText} size={16} className="text-white" />
              </View>
              <Text numberOfLines={1} style={styles.breakdownTitle}>
                Invoice breakdown ({openInvoices.length})
              </Text>
            </View>
          </View>

          <View style={styles.invoiceList}>
            {openInvoices.map((inv) => {
              const isOpen = expandedId === inv.id;
              const nonRent =
                inv.lineItems?.filter((item) => item.type !== 'RENT') ?? [];
              return (
                <View key={inv.id} style={styles.invoiceRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    activeOpacity={0.8}
                    style={styles.invoiceToggle}
                    onPress={() => setExpandedId(isOpen ? null : inv.id)}>
                    <Text numberOfLines={1} style={styles.invoicePeriod}>
                      {formatMonthYear(inv.periodStart)}
                    </Text>
                    <View style={styles.invoiceRight}>
                      <Text style={styles.invoiceAmount}>
                        {formatKes(inv.balanceDue)}
                      </Text>
                      <Icon
                        as={isOpen ? ChevronUp : ChevronDown}
                        size={14}
                        className="text-white"
                      />
                    </View>
                  </TouchableOpacity>

                  {isOpen && (
                    <Animated.View
                      entering={FadeIn.duration(180)}
                      exiting={FadeOut.duration(120)}
                      layout={LinearTransition.duration(220)}
                      style={styles.expanded}>
                      <View style={styles.detailGroup}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Base Rent</Text>
                          <Text style={styles.detailValue}>
                            {formatKes(inv.amount)}
                          </Text>
                        </View>
                        {nonRent.map((item) => (
                          <View key={item.id} style={styles.detailRow}>
                            <Text
                              numberOfLines={1}
                              style={styles.detailLabelTruncated}>
                              {item.description}
                            </Text>
                            <Text style={styles.detailValue}>
                              {formatKes(item.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => onPayInvoice?.(inv)}
                        style={styles.payThisButton}>
                        <Text style={styles.payThisText}>Pay this invoice</Text>
                        <Icon as={ArrowRight} size={12} className="text-[#075E54]" />
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}