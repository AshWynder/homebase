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
import { useGenerateInvoices } from '@/hooks/queries/use-invoices';
import type { ToastFunction } from '@/hooks/use-toast';

interface GenerateInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToast: ToastFunction;
}

/** Generates invoices for a billing period (defaults to the current month). */
export function GenerateInvoicesDialog({ open, onOpenChange, onToast }: GenerateInvoicesDialogProps) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const generate = useGenerateInvoices();

  const onSubmit = () => {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) return;
    generate.mutate(
      { month: m, year: y },
      {
        onSuccess: (data) => {
          const message = `Created ${data.total} invoice(s)${data.skipped ? `, skipped ${data.skipped}` : ''}.`;
          onToast(message, 'success');
          onOpenChange(false);
        },
        onError: (error) => {
          onToast((error as Error).message, 'error');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Invoices</DialogTitle>
          <DialogDescription>
            Creates invoices for all active tenancies in the selected period. Existing invoices are
            skipped.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Month</Label>
              <Input value={month} onChangeText={setMonth} keyboardType="numeric" placeholder="9" />
            </View>
            <View className="flex-1 gap-2">
              <Label>Year</Label>
              <Input value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2026" />
            </View>
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
          <Button onPress={onSubmit} disabled={generate.isPending}>
            <Text>{generate.isPending ? 'Generating…' : 'Generate'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}