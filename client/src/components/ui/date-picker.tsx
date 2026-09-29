import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar as CalendarIcon } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { formatDateLong } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  className?: string;
  /** Allow clearing the selected date (shows a Clear action on iOS/web). */
  clearable?: boolean;
}

function TriggerLabel({
  value,
  placeholder,
}: {
  value?: Date;
  placeholder: string;
}) {
  return (
    <Text
      className={cn(
        'flex-1 text-sm',
        value ? 'text-foreground' : 'text-muted-foreground',
      )}>
      {value ? formatDateLong(value) : placeholder}
    </Text>
  );
}

/**
 * RNR-styled date field.
 *
 * - Android: system date dialog
 * - iOS / web: popover with a spinner / calendar picker
 */
function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  minimumDate,
  maximumDate,
  disabled,
  className,
  clearable,
}: DatePickerProps) {
  const [androidOpen, setAndroidOpen] = React.useState(false);
  const pickerValue = value ?? new Date();

  const triggerClassName = cn(
    'border-input dark:bg-input/30 bg-background flex h-10 w-full flex-row items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-sm shadow-black/5 sm:h-9',
    disabled && 'opacity-50',
    className,
  );

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setAndroidOpen(false);
      if (event.type === 'dismissed') return;
    }
    if (date) onChange(date);
  };

  if (Platform.OS === 'android') {
    return (
      <View>
        <Pressable
          disabled={disabled}
          onPress={() => setAndroidOpen(true)}
          className={triggerClassName}
          accessibilityRole="button"
          accessibilityLabel={placeholder}>
          <TriggerLabel value={value} placeholder={placeholder} />
          <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
        </Pressable>
        {androidOpen ? (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="default"
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Pressable
          disabled={disabled}
          className={triggerClassName}
          accessibilityRole="button"
          accessibilityLabel={placeholder}>
          <TriggerLabel value={value} placeholder={placeholder} />
          <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
        </Pressable>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <View className="items-center px-2 pt-2">
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={Platform.OS === 'web' ? { width: '100%' } : undefined}
          />
        </View>
        <View className="flex-row justify-end gap-2 border-t border-border px-3 py-2">
          {clearable && value ? (
            <PopoverClose asChild>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => onChange(undefined)}>
                <Text>Clear</Text>
              </Button>
            </PopoverClose>
          ) : null}
          <PopoverClose asChild>
            <Button size="sm">
              <Text>Done</Text>
            </Button>
          </PopoverClose>
        </View>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
