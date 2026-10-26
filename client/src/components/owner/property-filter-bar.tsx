import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Building2, Search, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProperties } from '@/hooks/queries/use-properties';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/use-store';

/** Sentinel for the "no property selected" option in the filter Select. */
export const ALL_PROPERTIES = 'all';

interface PropertyFilterBarProps {
  /** Omit both fields to render the property Select on its own. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

/**
 * The property Select (plus optional tenant search) that every owner list
 * needs. Selection lives in the store so it survives segment switches and is
 * shared across the Portfolio and Money tabs — pick "Riverwood" once and both
 * tabs stay scoped to it.
 *
 * `GET /properties` is already scoped to the properties the signed-in owner or
 * caretaker manages, so a single-property account has nothing to filter and the
 * Select is dropped entirely.
 */
export function PropertyFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search tenants by name',
}: PropertyFilterBarProps) {
  const properties = useProperties();
  const selectedPropertyId = useStore((s) => s.selectedPropertyId);
  const setSelectedPropertyId = useStore((s) => s.setSelectedPropertyId);

  const propertyOptions = useMemo(
    () => [
      { value: ALL_PROPERTIES, label: 'All properties' },
      ...(properties.data ?? []).map((property) => ({
        value: property.id,
        label: property.name,
      })),
    ],
    [properties.data],
  );

  const selectedOption =
    propertyOptions.find((option) => option.value === selectedPropertyId) ??
    propertyOptions[0];

  const showSearch = onSearchChange !== undefined;
  const showPropertySelect = (properties.data?.length ?? 0) > 1;

  return (
    <View className="gap-3 px-4 py-3">
      {showPropertySelect ? (
        <Select
          value={selectedOption}
          onValueChange={(option) =>
            setSelectedPropertyId(
              !option || option.value === ALL_PROPERTIES ? null : option.value,
            )
          }>
          <SelectTrigger className="h-11 w-full rounded-xl border border-border bg-card dark:bg-card">
            <Icon as={Building2} size={16} className="text-muted-foreground" />
            <SelectValue
              placeholder="All properties"
              className="flex-1 font-semibold text-foreground"
            />
          </SelectTrigger>
          <SelectContent>
            {propertyOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                label={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {showSearch ? (
        <View>
          <Icon
            as={Search}
            size={16}
            className="absolute left-3 top-3.5 text-muted-foreground"
          />
          <Input
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className={cn(
              'h-11 rounded-xl border border-border bg-card pl-9 dark:bg-card',
              !!search && 'pr-9',
            )}
          />
          {search ? (
            <Pressable
              hitSlop={10}
              onPress={() => onSearchChange('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              className="absolute right-2 top-2.5 p-1">
              <Icon as={X} size={16} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
