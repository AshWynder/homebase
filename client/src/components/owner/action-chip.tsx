import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface ActionChipProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Spoken instead of the bare label, e.g. "Call John at +254…". */
  accessibilityLabel?: string;
}

/** Tappable action pill, e.g. Call / Email / WhatsApp on a tenant card. */
export function ActionChip({ icon, label, onPress, disabled, accessibilityLabel }: ActionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      // 44pt is the minimum comfortable touch target; the visual pill is
      // shorter than that, so the height is padded out rather than restyled.
      hitSlop={8}
      className={cn(
        'min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-teal-50 px-2 py-2.5',
        disabled && 'opacity-40',
      )}>
      <Icon as={icon} size={15} className="text-teal-800" />
      <Text className="text-xs font-semibold text-teal-900" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
