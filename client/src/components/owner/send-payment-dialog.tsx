import { useState } from 'react';
import { View } from 'react-native';

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
import { useInitiateStkPayment } from '@/hooks/queries/use-payments';
import { formatKes, tenantName } from '@/lib/format';
import type { Invoice } from '@/api/types';

interface SendPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sends an M-Pesa STK push ("payment link") to a tenant's phone. */
export function SendPaymentDialog({ invoice, open, onOpenChange }: SendPaymentDialogProps) {
  const [phone, setPhone] = useState('');
  const stk = useInitiateStkPayment();

  const onSubmit = () => {
    if (!invoice || !phone.trim()) return;
    stk.mutate(
      { invoiceId: invoice.id, phoneNumber: phone.trim() },
      {
        onSuccess: () => {
          setPhone('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Payment Link</DialogTitle>
          <DialogDescription>
            {invoice ? `Charge ${tenantName(invoice.tenancy)} ${formatKes(invoice.balanceDue)} via M-Pesa.` : ''}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Phone number</Label>
            <Input
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0712345678"
            />
          </View>
          {stk.isError ? (
            <Text className="text-sm text-red-600">{(stk.error as Error).message}</Text>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={onSubmit} disabled={stk.isPending || !phone.trim()}>
            <Text>{stk.isPending ? 'Sending…' : 'Send STK Push'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}