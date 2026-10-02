import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

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
import { useProperties } from '@/hooks/queries/use-properties';
import { useCreateTenancy } from '@/hooks/queries/use-tenancies';
import { useUnits } from '@/hooks/queries/use-units';
import type { ToastFunction } from '@/hooks/use-toast';
import type { UserProfile } from '@/api/types';

import { TenantPicker } from './tenant-picker';

interface CreateTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToast: ToastFunction;
}

type SelectOption = { value: string; label: string };

const ALL_PROPERTIES: SelectOption = { value: 'all', label: 'All properties' };

/** Serialize a local calendar day as ISO midnight UTC to avoid TZ off-by-one. */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

export function CreateTenancyDialog({ open, onOpenChange, onToast }: CreateTenancyDialogProps) {
  const properties = useProperties();
  const units = useUnits({ limit: 100 });
  const createTenancy = useCreateTenancy();

  const [property, setProperty] = useState<Option | undefined>(ALL_PROPERTIES);
  const [unit, setUnit] = useState<Option | undefined>();
  const [tenant, setTenant] = useState<UserProfile | null>(null);
  const [rent, setRent] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const hasMultipleProperties = (properties.data?.length ?? 0) > 1;

  const propertyOptions = useMemo<SelectOption[]>(
    () => [
      ALL_PROPERTIES,
      ...(properties.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties.data],
  );

  const showPropertyInLabel = !property || property.value === ALL_PROPERTIES.value;

  const unitOptions = useMemo(
    () =>
      (units.data?.items ?? [])
        .filter((u) => showPropertyInLabel || u.propertyId === property?.value)
        .map((u) => ({
          value: u.id,
          label: showPropertyInLabel
            ? `${u.property?.name ?? 'Property'} - ${u.unitNumber}`
            : u.unitNumber,
        })),
    [units.data, showPropertyInLabel, property?.value],
  );

  const onPropertyChange = (opt?: Option) => {
    setProperty(opt);
    setUnit(undefined);
  };

  const onSubmit = () => {
    if (!unit || !tenant || !rent.trim() || !startDate) return;
    createTenancy.mutate(
      {
        unitId: unit.value,
        tenantId: tenant.id,
        rentAmount: Number(rent),
        startDate: toIsoDate(startDate),
        endDate: endDate ? toIsoDate(endDate) : undefined,
      },
      {
        onSuccess: () => {
          onToast('Tenancy created successfully', 'success');
          setProperty(ALL_PROPERTIES);
          setUnit(undefined);
          setTenant(null);
          setRent('');
          setStartDate(undefined);
          setEndDate(undefined);
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
          <DialogTitle>New Tenancy</DialogTitle>
          <DialogDescription>Assign a tenant to a vacant unit.</DialogDescription>
        </DialogHeader>

        <ScrollView
          className="max-h-[420px]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View className="gap-4">
          {hasMultipleProperties ? (
            <View className="gap-2">
              <Label>Property</Label>
              <Select value={property} onValueChange={onPropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  {propertyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          ) : null}

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

          <TenantPicker selected={tenant} onChange={setTenant} />

          <View className="gap-2">
            <Label>Rent (KES)</Label>
            <Input value={rent} onChangeText={setRent} keyboardType="numeric" placeholder="25000" />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Start date</Label>
              <DatePicker
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  if (date && endDate && endDate < date) setEndDate(undefined);
                }}
                placeholder="Start date"
                maximumDate={endDate}
              />
            </View>
            <View className="flex-1 gap-2">
              <Label>End date</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End date"
                minimumDate={startDate}
                clearable
              />
            </View>
          </View>
          </View>
        </ScrollView>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={onSubmit}
            disabled={
              createTenancy.isPending || !unit || !tenant || !rent.trim() || !startDate
            }>
            <Text>{createTenancy.isPending ? 'Creating…' : 'Create'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
