import { useMemo } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useCreateTenancy, useTenancies } from '@/hooks/queries/use-tenancies';
import { tenantName } from '@/lib/format';
import { assignTenantFormSchema, type AssignTenantFormData } from '@/lib/schemas';

interface AssignTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
}

/** Serialize a local calendar day as ISO midnight UTC to avoid TZ off-by-one. */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

export function AssignTenantModal({
  open,
  onOpenChange,
  unitId,
}: AssignTenantModalProps) {
  const createTenancy = useCreateTenancy();
  const tenanciesQuery = useTenancies({ limit: 100 });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AssignTenantFormData>({
    resolver: zodResolver(assignTenantFormSchema),
    defaultValues: {
      tenantId: '',
      rentAmount: '',
      startDate: '',
      endDate: '',
    },
  });

  const startDateValue = watch('startDate');
  const startDate = startDateValue ? new Date(startDateValue) : undefined;

  // Distinct tenants derived from existing tenancies
  const tenantOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tenanciesQuery.data?.items ?? []) {
      if (!seen.has(t.tenantId)) seen.set(t.tenantId, tenantName(t));
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [tenanciesQuery.data]);

  const onSubmit = (data: AssignTenantFormData) => {
    if (!startDate) {
      onToast('Start date is required', 'error');
      return;
    }

    const payload = {
      tenantId: data.tenantId,
      unitId,
      rentAmount: typeof data.rentAmount === 'string' ? Number(data.rentAmount) : data.rentAmount,
      startDate: toIsoDate(startDate),
      endDate: data.endDate ? toIsoDate(new Date(data.endDate)) : undefined,
    };

    createTenancy.mutate(payload, {
      onSuccess: () => {
        toast.success('Tenant assigned successfully');
        reset();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error((error as Error).message);
      },
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Tenant</DialogTitle>
          <DialogDescription>Assign a tenant to this vacant unit.</DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          {/* Tenant Selection */}
          <View className="gap-2">
            <Label>Tenant</Label>
            <Controller
              control={control}
              name="tenantId"
              render={({ field: { value, onChange } }) => (
                <Select
                  value={
                    value ? { value, label: tenantOptions.find((o) => o.value === value)?.label || value } : undefined
                  }
                  onValueChange={(opt?: Option) => onChange(opt?.value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tenantId && (
              <Text className="text-xs text-red-600">{errors.tenantId.message}</Text>
            )}
          </View>

          {/* Rent Amount */}
          <View className="gap-2">
            <Label>Rent (KES)</Label>
            <Controller
              control={control}
              name="rentAmount"
              render={({ field: { value, onChange } }) => (
                <Input
                  value={String(value)}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="25000"
                />
              )}
            />
            {errors.rentAmount && (
              <Text className="text-xs text-red-600">{errors.rentAmount.message}</Text>
            )}
          </View>

          {/* Dates */}
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Start date</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    value={value ? new Date(value) : undefined}
                    onChange={(date) => {
                      if (date) {
                        onChange(toIsoDate(date));
                      } else {
                        onChange('');
                      }
                    }}
                    placeholder="Start date"
                  />
                )}
              />
              {errors.startDate && (
                <Text className="text-xs text-red-600">{errors.startDate.message}</Text>
              )}
            </View>

            <View className="flex-1 gap-2">
              <Label>End date (optional)</Label>
              <Controller
                control={control}
                name="endDate"
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    value={value ? new Date(value) : undefined}
                    onChange={(date) => {
                      if (date) {
                        onChange(toIsoDate(date));
                      } else {
                        onChange('');
                      }
                    }}
                    placeholder="End date"
                    minimumDate={startDate}
                    clearable
                  />
                )}
              />
              {errors.endDate && (
                <Text className="text-xs text-red-600">{errors.endDate.message}</Text>
              )}
            </View>
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={handleClose}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit(onSubmit)} disabled={createTenancy.isPending}>
            <Text>{createTenancy.isPending ? 'Assigning…' : 'Assign Tenant'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
