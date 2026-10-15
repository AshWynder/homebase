import type { LucideIcon } from 'lucide-react-native';
import { InteractionManager, Pressable, StyleSheet, View } from 'react-native';
import React, { useEffect, useRef } from 'react';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
}

/**
 * A compact, radio-style selector. The active segment lifts onto the card
 * surface (`bg-background`) against the muted track, so it reads correctly in
 * both palettes without hard-coded colors.
 *
 * Two details keep a tap from freezing the app (same as the portfolio filter):
 * the change is deferred past the interaction via `InteractionManager`, and the
 * active styling is hoisted into `StyleSheet.create` + the `style` prop. NativeWind
 * identity-checks `style` on every render, so a conditional `className` (or an
 * inline literal) re-dispatches styles from inside the render phase and hangs
 * the app whenever state changes.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
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
      onValueChange(nextValue);
      pendingChange.current = null;
    });
  };

  return (
    <View className="flex-row gap-1 rounded-2xl bg-muted p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => scheduleChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2.5"
            style={active ? styles.activeSegment : undefined}>
            {option.icon ? (
              <Icon
                as={option.icon}
                size={15}
                className={active ? 'text-primary-foreground' : 'text-muted-foreground'}
              />
            ) : null}
            <Text
              className={cn(
                'text-xs',
                active ? 'font-bold text-primary-foreground' : 'font-medium text-muted-foreground'
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
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
});
