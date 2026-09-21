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
import { useRecordReading } from '@/hooks/queries/use-meters';
import { formatKes } from '@/lib/format';
import type { UtilityMeter } from '@/api/types';

interface RecordReadingDialogProps {
  meter: UtilityMeter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Records a new meter reading; consumption cost is computed by the server. */
export function RecordReadingDialog({ meter, open, onOpenChange }: RecordReadingDialogProps) {
  const [reading, setReading] = useState('');
  const record = useRecordReading();

  const onSubmit = () => {
    if (!meter || !reading.trim()) return;
    record.mutate(
      { id: meter.id, input: { currentReading: Number(reading) } },
      {
        onSuccess: () => {
          setReading('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update {meter?.meterType === 'WATER' ? 'Water' : 'Electricity'} Reading</DialogTitle>
          <DialogDescription>
            {meter
              ? `Last reading: ${meter.lastReading} · ${formatKes(meter.pricePerUnit)}/unit`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Current reading</Label>
            <Input
              value={reading}
              onChangeText={setReading}
              keyboardType="numeric"
              placeholder={meter ? String(meter.lastReading + 10) : '1200'}
            />
          </View>
          {record.isError ? (
            <Text className="text-sm text-red-600">{(record.error as Error).message}</Text>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={onSubmit} disabled={record.isPending || !reading.trim()}>
            <Text>{record.isPending ? 'Saving…' : 'Save Reading'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}