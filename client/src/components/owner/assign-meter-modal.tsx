import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useCreateMeter } from '@/hooks/queries/use-meters';
import { assignMeterFormSchema, type AssignMeterFormData } from '@/lib/schemas';
import type { CreateMeterInput, MeterType } from '@/api/types';

interface AssignMeterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
}

const METER_TYPES = [
  { value: 'WATER', label: 'Water' },
  { value: 'ELECTRICITY', label: 'Electricity' },
];

export function AssignMeterModal({
  open,
  onOpenChange,
  unitId,
}: AssignMeterModalProps) {
  const createMeter = useCreateMeter();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignMeterFormData>({
    resolver: zodResolver(assignMeterFormSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
      lastReading: '',
      pricePerUnit: '',
    },
  });

  const onSubmit = async (data: AssignMeterFormData) => {
    try {
      const payload: CreateMeterInput = {
        unitId,
      };

      if (data.meterType && data.meterType !== '') {
        payload.meterType = data.meterType as MeterType;
      }
      if (data.meterNumber) {
        payload.meterNumber = data.meterNumber;
      }
      if (data.lastReading !== undefined && data.lastReading !== '') {
        payload.lastReading = Number(data.lastReading);
      }
      if (data.pricePerUnit !== undefined && data.pricePerUnit !== '') {
        payload.pricePerUnit = Number(data.pricePerUnit);
      }

      await createMeter.mutateAsync(payload);
      toast.success('Meter added successfully');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to add meter');
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Utility Meter</DialogTitle>
          <DialogDescription>Assign a utility meter to this unit.</DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          {/* Meter Type */}
          <View className="gap-2">
            <Label>Meter Type</Label>
            <Controller
              control={control}
              name="meterType"
              render={({ field: { value, onChange } }) => (
                <Select
                  value={
                    value && value !== ''
                      ? { value, label: METER_TYPES.find((m) => m.value === value)?.label || value }
                      : undefined
                  }
                  onValueChange={(opt?: Option) => onChange(opt?.value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meter type" />
                  </SelectTrigger>
                  <SelectContent>
                    {METER_TYPES.map((meter) => (
                      <SelectItem key={meter.value} value={meter.value} label={meter.label}>
                        {meter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.meterType && (
              <Text className="text-xs text-red-600">{errors.meterType.message}</Text>
            )}
          </View>

          {/* Meter Number */}
          <View className="gap-2">
            <Label>Meter Number (optional)</Label>
            <Controller
              control={control}
              name="meterNumber"
              render={({ field: { value, onChange } }) => (
                <Input
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="e.g., MN-12345"
                />
              )}
            />
            {errors.meterNumber && (
              <Text className="text-xs text-red-600">{errors.meterNumber.message}</Text>
            )}
          </View>

          {/* Last Reading */}
          <View className="gap-2">
            <Label>Initial Reading (optional)</Label>
            <Controller
              control={control}
              name="lastReading"
              render={({ field: { value, onChange } }) => (
                <Input
                  value={String(value || '')}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="0"
                />
              )}
            />
            {errors.lastReading && (
              <Text className="text-xs text-red-600">{errors.lastReading.message}</Text>
            )}
          </View>

          {/* Price Per Unit */}
          <View className="gap-2">
            <Label>Price per Unit (optional)</Label>
            <Controller
              control={control}
              name="pricePerUnit"
              render={({ field: { value, onChange } }) => (
                <Input
                  value={String(value || '')}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              )}
            />
            {errors.pricePerUnit && (
              <Text className="text-xs text-red-600">{errors.pricePerUnit.message}</Text>
            )}
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={handleClose}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={handleSubmit(onSubmit)}
            disabled={createMeter.isPending}>
            <Text>{createMeter.isPending ? 'Adding...' : 'Add Meter'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
