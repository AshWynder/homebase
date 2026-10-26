import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional count badge next to the label. */
  count?: number;
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
 *
 * Built on the rnr Tabs primitive: a muted track with a raised pill on the
 * active segment and an optional count badge.
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
    <Tabs
      value={value}
      onValueChange={(next) => scheduleChange(next as T)}
      className={cn('gap-0', className)}>
      <TabsList className="h-auto w-full rounded-2xl bg-muted p-1">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(
                'h-9 flex-1 gap-2 rounded-xl px-2',
                isActive && 'bg-card shadow-sm dark:bg-input',
              )}>
              <Text
                className={cn(
                  'text-sm font-bold',
                  isActive
                    ? 'text-primary dark:text-primary'
                    : 'text-muted-foreground',
                )}>
                {option.label}
              </Text>
              {option.count === undefined ? null : (
                <Badge
                  variant="secondary"
                  className={cn(
                    'rounded-md border-transparent px-1.5 py-0.5',
                    isActive ? 'bg-primary/15' : 'bg-muted-foreground/10',
                  )}>
                  <Text
                    className={cn(
                      'text-[10px] font-bold',
                      isActive
                        ? 'text-primary dark:text-primary'
                        : 'text-muted-foreground',
                    )}>
                    {option.count}
                  </Text>
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
