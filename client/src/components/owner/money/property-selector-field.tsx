import { useMemo } from 'react';
import { Building2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Property } from '@/api/types';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { FINANCE } from '@/constants/finance-theme';

const ALL_PROPERTIES = 'all';

const styles = StyleSheet.create({
  trigger: { borderColor: FINANCE.border },
  label: { color: FINANCE.muted },
  value: { color: FINANCE.text },
});

interface PropertySelectorFieldProps {
  properties: Property[];
  value: string | null;
  onChange: (propertyId: string | null) => void;
}

/** Property picker shown only for owners with more than one property. */
export function PropertySelectorField({
  properties,
  value,
  onChange,
}: PropertySelectorFieldProps) {
  const options = useMemo(
    () => [
      { value: ALL_PROPERTIES, label: `All properties (${properties.length})` },
      ...properties.map((property) => ({
        value: property.id,
        label: property.name,
      })),
    ],
    [properties],
  );

  const selectedOption =
    options.find((option) => option.value === (value ?? ALL_PROPERTIES)) ?? options[0];

  return (
    <Select
      value={selectedOption}
      onValueChange={(option) =>
        onChange(!option || option.value === ALL_PROPERTIES ? null : option.value)
      }>
      <SelectTrigger
        className="h-auto w-full flex-row items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 shadow-none"
        style={styles.trigger}>
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#d1fae5]">
          <Icon as={Building2} size={18} color={FINANCE.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[11px]" style={styles.label}>
            Property
          </Text>
          <Text
            className="text-[15px] font-semibold"
            style={styles.value}
            numberOfLines={1}>
            {selectedOption?.label}
          </Text>
        </View>
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
