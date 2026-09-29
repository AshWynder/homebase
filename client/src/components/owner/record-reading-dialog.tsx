import { View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useRecordReading } from '@/hooks/queries/use-meters';
import { formatKes, formatPeriod } from '@/lib/format';
import {
  recordReadingFormSchema,
  type RecordReadingFormData,
} from '@/lib/schemas';
import type { UtilityMeter } from '@/api/types';

interface RecordReadingDialogProps {
  meter: UtilityMeter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toInputDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Captures a meter's current reading. The reading is billed straight onto the
 * invoice covering the reading date — the server rejects it with an explanation
 * when that month has not been invoiced yet, or when the invoice is settled.
 */
export function RecordReadingDialog({
  meter,
  open,
  onOpenChange,
}: RecordReadingDialogProps) {
  const record = useRecordReading();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RecordReadingFormData>({
    resolver: zodResolver(recordReadingFormSchema),
    defaultValues: { currentReading: '', readingDate: toInputDate(new Date()) },
  });
  const currentReadingValue = useWatch({ control, name: 'currentReading' });

  const meterLabel = meter?.meterType === 'ELECTRICITY' ? 'Electricity' : 'Water';
  const lastReading = meter?.lastReading ?? 0;
  const pricePerUnit = Number(meter?.pricePerUnit ?? 0);

  // Live estimate of what this reading will add to the invoice.
  const parsed = Number(currentReadingValue);
  const preview =
    Number.isInteger(parsed) && parsed > lastReading
      ? { units: parsed - lastReading, cost: (parsed - lastReading) * pricePerUnit }
      : null;

  const closeDialog = () => {
    reset({ currentReading: '', readingDate: toInputDate(new Date()) });
    onOpenChange(false);
  };

  const onSubmit = async (data: RecordReadingFormData) => {
    if (!meter) return;

    const currentReading = Number(data.currentReading);
    if (currentReading < meter.lastReading) {
      setError('currentReading', {
        message: `Must be at least the last reading (${meter.lastReading})`,
      });
      return;
    }

    try {
      const result = await record.mutateAsync({
        id: meter.id,
        input: {
          currentReading,
          readingDate: new Date(data.readingDate).toISOString(),
        },
      });
      const period = formatPeriod(result.invoice.periodStart);
      toast.success(`Reading recorded and added to the ${period} invoice`);
      closeDialog();
    } catch (error) {
      // Server guards speak for themselves ("No invoice has been generated for
      // Unit … for September 2026 …"), so show the message as-is.
      toast.error((error as Error).message || 'Failed to record reading');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {meterLabel} Reading</DialogTitle>
          <DialogDescription>
            {meter
              ? `Last reading: ${meter.lastReading} · ${formatKes(meter.pricePerUnit)}/unit`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Current reading</Label>
            <Controller
              control={control}
              name="currentReading"
              render={({ field: { value, onChange } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder={String(lastReading)}
                />
              )}
            />
            {errors.currentReading && (
              <Text className="text-xs text-red-600">
                {errors.currentReading.message}
              </Text>
            )}
          </View>

          <View className="gap-2">
            <Label>Reading date</Label>
            <Controller
              control={control}
              name="readingDate"
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  value={value ? new Date(value) : undefined}
                  onChange={(date) => onChange(date ? toInputDate(date) : '')}
                />
              )}
            />
            {errors.readingDate && (
              <Text className="text-xs text-red-600">
                {errors.readingDate.message}
              </Text>
            )}
          </View>

          {preview && (
            <View className="gap-1 rounded-lg bg-slate-50 p-3">
              <Text className="text-xs text-slate-500">
                Estimated charge for this invoice
              </Text>
              <Text className="text-sm font-semibold text-slate-900">
                {preview.units} unit{preview.units === 1 ? '' : 's'} ×{' '}
                {formatKes(meter?.pricePerUnit)} = {formatKes(preview.cost)}
              </Text>
            </View>
          )}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={closeDialog}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit(onSubmit)} disabled={record.isPending}>
            <Text>{record.isPending ? 'Saving…' : 'Save Reading'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
