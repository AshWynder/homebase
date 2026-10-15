import { InteractionManager, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';

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
  const pendingChange = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      pendingChange.current?.cancel();
    };
  }, []);

  const scheduleChange = (nextValue: T) => {
    if (nextValue === value) return;
    pendingChange.current?.cancel();
    pendingChange.current = InteractionManager.runAfterInteractions(() => {
      onChange(nextValue);
      pendingChange.current = null;
    });
  };

  return (
    <View
      accessibilityRole="tablist"
      className={cn('flex-row items-center rounded-2xl bg-muted p-1', className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => scheduleChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            className="flex-1 items-center justify-center rounded-xl py-2"
            style={isActive ? styles.activeSegment : undefined}>
            <Text
              className={cn(
                'text-xs font-bold',
                isActive ? 'text-primary' : 'text-foreground',
              )}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeSegment: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
  },
});
