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
import { formatKes } from '@/lib/format';

interface GenerateTenancyInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToast: ToastFunction;
  tenancyId: string;
  tenantName: string;
  monthlyRent: string;
}

function periodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Generates an invoice for a single tenancy — e.g. a tenant who moved in after
 * the bulk run already billed the other tenancies. Months that already have an
 * invoice for this tenancy are skipped by the server.
 */
export function GenerateTenancyInvoiceDialog({
  open,
  onOpenChange,
  onToast,
  tenancyId,
  tenantName,
  monthlyRent,
}: GenerateTenancyInvoiceDialogProps) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const generate = useGenerateInvoices();

  const m = Number(month);
  const y = Number(year);
  const valid = Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(y) && y >= 2000;

  const onSubmit = () => {
    if (!valid) return;
    generate.mutate(
      { month: m, year: y, tenancyId },
      {
        onSuccess: (data) => {
          const skippedNote = data.skipped ? `, ${data.skipped} already billed` : '';
          onToast(
            `Invoice created for ${tenantName} (${skippedNote || '1'}).`,
            'success',
          );
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
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Creates an invoice for {tenantName} only. Months with an existing
            invoice are skipped.
          </DialogDescription>
        </DialogHeader>

        <View className="rounded-2xl bg-teal-50 p-4">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-teal-700">
            {tenantName}
          </Text>
          <Text className="text-[11px] text-slate-500 mt-0.5">
            Rent {formatKes(monthlyRent)}/mo • full period, not pro-rated
          </Text>
        </View>

        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Month</Label>
              <Input
                value={month}
                onChangeText={setMonth}
                keyboardType="numeric"
                placeholder="9"
              />
            </View>
            <View className="flex-1 gap-2">
              <Label>Year</Label>
              <Input
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                placeholder="2026"
              />
            </View>
          </View>

          {valid ? (
            <Text className="text-xs text-slate-500">
              This will bill {tenantName} for{' '}
              <Text className="font-semibold text-slate-700">
                {periodLabel(m, y)}
              </Text>
              .
            </Text>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
          <Button onPress={onSubmit} disabled={!valid || generate.isPending}>
            <Text>{generate.isPending ? 'Generating…' : 'Generate invoice'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}