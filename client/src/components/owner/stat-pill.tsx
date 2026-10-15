import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface StatPillProps {
  label: string;
  value: string;
  tone?: 'teal' | 'blue' | 'amber';
  /** Optional status pill shown top-right (e.g. "Fully Leased"). */
  badge?: string;
  badgeTone?: 'neutral' | 'success' | 'info' | 'warning';
  /** Optional trailing icon in a tinted square (empty-state cards). */
  icon?: LucideIcon;
}

const TONES: Record<
  NonNullable<StatPillProps['tone']>,
  { bg: string; value: string; iconBg: string; icon: string }
> = {
  teal: {
    bg: 'bg-primary/10',
    value: 'text-foreground',
    iconBg: 'bg-primary',
    icon: 'text-primary-foreground',
  },
  blue: {
    bg: 'bg-info/10',
    value: 'text-foreground',
    iconBg: 'bg-info',
    icon: 'text-info-foreground',
  },
  amber: {
    bg: 'bg-warning/10',
    value: 'text-foreground',
    iconBg: 'bg-warning',
    icon: 'text-warning-foreground',
  },
};

const BADGE_TONES: Record<
  NonNullable<StatPillProps['badgeTone']>,
  string
> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'text-success',
  info: 'text-info',
  warning: 'bg-muted text-warning',
};

/** A compact colored stat tile used inside property cards. */
export function StatPill({
  label,
  value,
  tone = 'teal',
  badge,
  badgeTone = 'neutral',
  icon,
}: StatPillProps) {
  const t = TONES[tone];
  return (
    <View className={cn('flex-row items-center gap-3 rounded-xl px-3 py-3', t.bg)}>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[11px] font-medium text-muted-foreground">{label}</Text>
          {badge && !icon ? (
            <Text className={cn('text-[11px] font-semibold', BADGE_TONES[badgeTone])}>
              {badge}
            </Text>
          ) : null}
        </View>
        <Text className={cn('text-xl font-bold', t.value)} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {icon ? (
        <View className={cn('h-9 w-9 items-center justify-center rounded-lg', t.iconBg)}>
          <Icon as={icon} size={18} className={t.icon} />
        </View>
      ) : null}
    </View>
  );
}
