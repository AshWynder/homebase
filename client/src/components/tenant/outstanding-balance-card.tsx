import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { formatKes, shortId, daysUntil } from '@/lib/format';
import type { Invoice, Tenancy } from '@/api/types';

interface OutstandingBalanceCardProps {
  invoice?: Invoice | null;
  tenancy?: Tenancy | null;
  totalBalance?: number;
  onPay?: () => void;
}

export function TenantOutstandingCard({
  invoice,
  totalBalance,
  onPay,
}: OutstandingBalanceCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const amountToDisplay = useMemo(() => {
    if (
      invoice?.balanceDue !== undefined &&
      invoice?.balanceDue !== null &&
      Number(invoice.balanceDue) > 0
    ) {
      return Number(invoice.balanceDue);
    }
    if (totalBalance !== undefined && totalBalance !== null && totalBalance > 0) {
      return totalBalance;
    }
    return 0;
  }, [invoice?.balanceDue, totalBalance]);

  const hasOutstanding = amountToDisplay > 0;

  const daysLeft = invoice?.dueDate ? daysUntil(invoice.dueDate) : null;
  const isOverdue = daysLeft !== null && daysLeft <= 0;
  const dueDaysBadge = hasOutstanding
    ? isOverdue
      ? 'Overdue'
      : daysLeft === null
        ? 'Due in 4 Days'
        : `Due in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`
    : 'All Settled';

  const dueDateStr = useMemo(() => {
    if (!invoice?.dueDate) return 'Oct 5, 2026';
    const date = new Date(invoice.dueDate);
    if (Number.isNaN(date.getTime())) return 'Oct 5, 2026';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [invoice?.dueDate]);

  const billingCycleStr = useMemo(() => {
    if (!invoice?.periodStart) return 'Oct 2026';
    const date = new Date(invoice.periodStart);
    if (Number.isNaN(date.getTime())) return 'Oct 2026';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }, [invoice?.periodStart]);

  const formattedAmount = useMemo(() => {
    return formatKes(amountToDisplay).replace('KES ', '');
  }, [amountToDisplay]);

  // When there are no bills due, render settled card (no buttons, no accordion)
  if (!hasOutstanding) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
        <LinearGradient
          colors={['#0E7490', '#0F766E', '#115E59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            padding: 24,
            shadowColor: '#042f2e',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 18,
            elevation: 8,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                }}>
                <Icon as={Wallet} size={20} className="text-white" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                Current Outstanding
              </Text>
            </View>

            <View
              style={{
                borderRadius: 9999,
                borderWidth: 1,
                borderColor: '#d1fae5',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                All Settled
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }}>
            <View
              style={{
                marginBottom: 12,
                height: 56,
                width: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9999,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}>
              <Icon as={CheckCircle2} size={30} className="text-white" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
              No bills to pay
            </Text>
            <Text
              style={{
                marginTop: 6,
                paddingHorizontal: 16,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '500',
                color: 'rgba(204, 251, 241, 0.9)',
                lineHeight: 18,
              }}>
              You’re all caught up. Your next invoice will appear here once it’s generated.
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Active impending invoice card matching the attached design
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
      <LinearGradient
        colors={['#0E7490', '#0F766E', '#115E59']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          padding: 24,
          shadowColor: '#042f2e',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 8,
        }}>
        {/* Header: Wallet icon box + title + Due Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}>
              <Icon as={Wallet} size={20} className="text-white" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
              Current Outstanding
            </Text>
          </View>

          <View
            style={{
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: isOverdue ? '#fecdd3' : '#ffe4e6',
              backgroundColor: isOverdue ? '#fff1f2' : 'rgba(255, 255, 255, 0.95)',
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#be123c',
              }}>
              {dueDaysBadge}
            </Text>
          </View>
        </View>

        {/* Total Amount Due */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(204, 251, 241, 0.9)' }}>
          Total Amount Due
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff', marginRight: 6 }}>
            KES
          </Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 }}>
            {formattedAmount}
          </Text>
        </View>

        {/* Due Date & Billing Cycle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Icon
            as={CalendarDays}
            size={15}
            className="text-teal-50/90"
            style={{ marginRight: 6 }}
          />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: 'rgba(204, 251, 241, 0.9)' }}>
            Due date: {dueDateStr} • Billing cycle: {billingCycleStr}
          </Text>
        </View>

        {/* Pay with M-Pesa Express Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPay}
          style={{
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
          }}>
          <Icon as={Zap} size={18} className="text-[#075E54]" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#075E54' }}>
            Pay with M–Pesa Express
          </Text>
        </TouchableOpacity>

        {/* Accordion: Invoice breakdown */}
        <View
          style={{
            marginTop: 16,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: breakdownOpen }}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
            onPress={() => setBreakdownOpen((prev) => !prev)}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  height: 32,
                  width: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}>
                <Icon as={FileText} size={16} className="text-white" />
              </View>
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#ffffff' }}>
                Invoice breakdown {shortId(invoice?.id, '#INV-')}
              </Text>
            </View>
            <Icon
              as={breakdownOpen ? ChevronUp : ChevronDown}
              size={18}
              className="text-white"
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {breakdownOpen && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              layout={LinearTransition.duration(220)}
              style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                paddingTop: 4,
              }}>
              {invoice?.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((lineItem) => (
                  <View
                    key={lineItem.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                    }}>
                    <Text
                      style={{
                        marginRight: 16,
                        flex: 1,
                        fontSize: 14,
                        color: 'rgba(204, 251, 241, 0.9)',
                      }}>
                      {lineItem.description}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                      {formatKes(lineItem.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                  }}>
                  <Text style={{ fontSize: 14, color: 'rgba(204, 251, 241, 0.9)' }}>
                    Base Apartment Rent
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                    {formatKes(amountToDisplay)}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}