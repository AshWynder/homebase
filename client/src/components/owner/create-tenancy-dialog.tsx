import { useMemo, useState } from 'react';
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
import { useUnits } from '@/hooks/queries/use-units';
import { tenantName } from '@/lib/format';

interface CreateTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTenancyDialog({ open, onOpenChange }: CreateTenancyDialogProps) {
  const units = useUnits({ limit: 100 });
  const existing = useTenancies({ limit: 100 });
  const createTenancy = useCreateTenancy();

  const [unit, setUnit] = useState<Option | undefined>();
  const [tenant, setTenant] = useState<Option | undefined>();
  const [rent, setRent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const unitOptions = useMemo(
    () =>
      (units.data?.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.property?.name ?? 'Property'} - ${u.unitNumber}`,
      })),
    [units.data],
  );

  // Distinct tenants derived from existing tenancies (MVP: no directory endpoint yet).
  const tenantOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of existing.data?.items ?? []) {
      if (!seen.has(t.tenantId)) seen.set(t.tenantId, tenantName(t));
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [existing.data]);

  const onSubmit = () => {
    if (!unit || !tenant || !rent.trim() || !startDate.trim()) return;
    createTenancy.mutate(
      {
        unitId: unit.value,
        tenantId: tenant.value,
        rentAmount: Number(rent),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate.trim() ? new Date(endDate).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setUnit(undefined);
          setTenant(undefined);
          setRent('');
          setStartDate('');
          setEndDate('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Tenancy</DialogTitle>
          <DialogDescription>Assign a tenant to a vacant unit.</DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>

          <View className="gap-2">
            <Label>Tenant</Label>
            <Select value={tenant} onValueChange={setTenant}>
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
          </View>

          <View className="gap-2">
            <Label>Rent (KES)</Label>
            <Input value={rent} onChangeText={setRent} keyboardType="numeric" placeholder="25000" />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Start date</Label>
              <Input value={startDate} onChangeText={setStartDate} placeholder="2026-01-01" />
            </View>
            <View className="flex-1 gap-2">
              <Label>End date</Label>
              <Input value={endDate} onChangeText={setEndDate} placeholder="2027-01-01" />
            </View>
          </View>

          {createTenancy.isError ? (
            <Text className="text-sm text-red-600">{(createTenancy.error as Error).message}</Text>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={onSubmit}
            disabled={
              createTenancy.isPending || !unit || !tenant || !rent.trim() || !startDate.trim()
            }>
            <Text>{createTenancy.isPending ? 'Creating…' : 'Create'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}