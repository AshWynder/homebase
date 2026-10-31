import { useMemo } from 'react';
import { Building2 } from 'lucide-react-native';
import { View } from 'react-native';

import type { Property } from '@/api/types';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { FINANCE, FINANCE_DARK } from '@/constants/finance-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ALL_PROPERTIES = 'all';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const FD = FINANCE_DARK;

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

  const triggerStyle = useMemo(
    () => ({
      backgroundColor: isDark ? FD.surface : '#ffffff',
      borderColor: isDark ? FD.border : FINANCE.border,
    }),
    [isDark, FD, FINANCE],
  );
  const iconContainerStyle = useMemo(
    () => ({ backgroundColor: isDark ? FD.emeraldTintBg : '#d1fae5' }),
    [isDark, FD],
  );
  const iconColor = useMemo(() => (isDark ? FD.primary : FINANCE.primary), [isDark, FD, FINANCE]);
  const labelStyle = useMemo(
    () => ({ color: isDark ? FD.muted : FINANCE.muted }),
    [isDark, FD, FINANCE],
  );
  const valueStyle = useMemo(
    () => ({ color: isDark ? FD.text : FINANCE.text }),
    [isDark, FD, FINANCE],
  );

  return (
    <Select
      value={selectedOption}
      onValueChange={(option) =>
        onChange(!option || option.value === ALL_PROPERTIES ? null : option.value)
      }>
      <SelectTrigger
        className="h-auto w-full flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-none"
        style={triggerStyle}>
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={iconContainerStyle}>
          <Icon as={Building2} size={18} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[11px]"
            style={labelStyle}>
            Property
          </Text>
          <Text
            className="text-[15px] font-semibold"
            style={valueStyle}
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
