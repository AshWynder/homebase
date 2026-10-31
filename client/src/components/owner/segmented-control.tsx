import { useEffect, useRef } from 'react';
import { InteractionManager, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/utils';
import { darkColors, darkTints } from '@/theme/colors';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      <TabsList
        className="h-auto w-full rounded-2xl p-1"
        style={
          isDark
            ? {
                backgroundColor: darkColors.surface,
                borderColor: darkColors.border,
                borderWidth: 1,
              }
            : {
                backgroundColor: '#EAF1FF',
                borderWidth: 0,
              }
        }>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(
                'h-9 flex-1 gap-2 rounded-xl px-2',
              )}
              style={
                isDark
                  ? isActive
                    ? {
                        backgroundColor: darkColors.surfaceElevated,
                        borderColor: darkColors.borderStrong,
                        borderWidth: 1,
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        borderWidth: 1,
                      }
                  : isActive
                    ? {
                        backgroundColor: '#FFFFFF',
                        shadowColor: 'rgba(15,23,42,0.06)',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 1,
                        shadowRadius: 4,
                        elevation: 1,
                      }
                    : {
                        backgroundColor: 'transparent',
                      }
              }>
              <Text
                className="text-sm font-bold"
                style={
                  isDark
                    ? {
                        color: isActive ? darkColors.emeraldLight : darkColors.textMuted,
                      }
                    : {
                        color: isActive ? '#006241' : '#64748B',
                      }
                }>
                {option.label}
              </Text>
              {option.count === undefined ? null : (
                <Badge
                  variant="secondary"
                  className="rounded-md border-transparent px-1.5 py-0.5"
                  style={
                    isDark
                      ? isActive
                        ? {
                            backgroundColor: darkColors.emeraldTintBg,
                            borderColor: darkColors.emeraldTintBorder,
                            borderWidth: 1,
                          }
                        : {
                            backgroundColor: darkColors.surface,
                            borderColor: darkColors.border,
                            borderWidth: 1,
                          }
                      : isActive
                        ? {
                            backgroundColor: '#D1FAE5',
                            borderWidth: 0,
                          }
                        : {
                            backgroundColor: '#D9E5FB',
                            borderWidth: 0,
                          }
                  }>
                  <Text
                    className="text-[10px] font-bold"
                    style={
                      isDark
                        ? {
                            color: isActive ? darkColors.emeraldLight : darkColors.textMuted,
                          }
                        : {
                            color: isActive ? '#006241' : '#475569',
                          }
                    }>
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
