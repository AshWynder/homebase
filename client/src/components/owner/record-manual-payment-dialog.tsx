import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useRecordManualPayment } from '@/hooks/queries/use-invoices';
import { useDeferredChange } from '@/hooks/use-deferred-change';
import type { ToastFunction } from '@/hooks/use-toast';
import { formatKes, tenantName } from '@/lib/format';
import type { Invoice, ManualPaymentMethod } from '@/api/types';

const METHODS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'MPESA', label: 'M-Pesa' },
];

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  methodActive: { borderColor: '#0F766E', backgroundColor: '#F0FDFA' },
  methodInactive: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
});

interface RecordManualPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToast: ToastFunction;
}

/**
 * Owner fallback for settling an invoice when a provider payment never lands.
 * Recording the full balance marks the invoice PAID; a smaller amount is
 * deducted from the balance due and leaves it PARTIALLY_PAID.
 */
export function RecordManualPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onToast,
}: RecordManualPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open so the form starts from the current balance
            every time, without a reset effect. */}
        {open && invoice ? (
          <RecordManualPaymentForm
            key={invoice.id}
            invoice={invoice}
            onCancel={() => onOpenChange(false)}
            onToast={onToast}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface RecordManualPaymentFormProps {
  invoice: Invoice;
  onCancel: () => void;
  onToast: ToastFunction;
}

function RecordManualPaymentForm({
  invoice,
  onCancel,
  onToast,
}: RecordManualPaymentFormProps) {
  const balanceDue = Number(invoice.balanceDue);
  const [amount, setAmount] = useState(() => balanceDue.toFixed(2));
  const [method, setMethod] = useState<ManualPaymentMethod>('CASH');
  const onMethodChange = useDeferredChange(method, setMethod);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const record = useRecordManualPayment();

  const parsed = Number(amount);
  const isPartial = Number.isFinite(parsed) && parsed > 0 && parsed < balanceDue;

  const onSubmit = () => {
    if (!amount.trim() || !Number.isFinite(parsed)) {
      setError('Enter the amount received.');
      return;
    }
    if (parsed <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (parsed > balanceDue) {
      setError(`Amount cannot exceed the balance due of ${formatKes(balanceDue)}.`);
      return;
    }

    record.mutate(
      {
        id: invoice.id,
        input: {
          amountPaid: Number(parsed.toFixed(2)),
          method,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      },
      {
        onSuccess: (updated) => {
          onToast(
            updated.status === 'PAID'
              ? 'Invoice marked as paid'
              : `Payment recorded — ${formatKes(updated.balanceDue)} still due`,
            'success',
          );
          onCancel();
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogDescription>
          {`${tenantName(invoice.tenancy)} owes ${formatKes(balanceDue)} on this invoice. Enter the amount received to settle it in full or in part.`}
        </DialogDescription>
      </DialogHeader>

      <View className="gap-4">
        <View className="gap-2">
          <Label>Amount received</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {isPartial
                ? `Leaves ${formatKes(Math.max(balanceDue - parsed, 0))} outstanding`
                : `Paying the full balance of ${formatKes(balanceDue)}`}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => setAmount(balanceDue.toFixed(2))}>
              <Text className="text-xs font-semibold text-primary">Pay full balance</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-2">
          <Label>Payment method</Label>
          <View className="flex-row gap-2">
            {METHODS.map((option) => {
              const active = method === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onMethodChange(option.value)}
                  className="flex-1 items-center rounded-xl border px-3 py-2.5"
                  style={active ? styles.methodActive : styles.methodInactive}>
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Label>Note (optional)</Label>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Cash received at office"
            maxLength={500}
          />
        </View>

        {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
      </View>

      <DialogFooter>
        <Button variant="outline" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button onPress={onSubmit} disabled={record.isPending}>
          <Text>
            {record.isPending
              ? 'Recording…'
              : isPartial
                ? 'Record Partial Payment'
                : 'Mark as Paid'}
          </Text>
        </Button>
      </DialogFooter>
    </>
  );
}
