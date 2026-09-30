import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
}

/**
 * In-place switcher that groups peer lists behind one tab, so a segment costs a
 * tap instead of a bottom-navigation slot. Swapping segments replaces the list
 * below without a navigation transition — reserving route pushes for acting on a
 * single item.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      className={cn('flex-row items-center rounded-2xl bg-slate-200/70 p-1', className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            className={cn(
              'flex-1 items-center justify-center rounded-xl py-2',
              isActive && 'bg-white shadow-sm',
            )}>
            <Text
              className={cn(
                'text-xs font-bold',
                isActive ? 'text-teal-900' : 'text-slate-700',
              )}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
