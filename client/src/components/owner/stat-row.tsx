import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type StatRowTone = 'units' | 'tenants' | 'rent';

interface StatRowToneClasses {
  /** Panel background and border. */
  panel: string;
  /** Icon tile background and icon colour. */
  tile: string;
  icon: string;
}

/**
 * Tint per row so the three stats on a card are told apart at a glance without
 * pulling the app palette apart: slate for units, sky for people, amber for
 * money.
 */
const TONES: Record<StatRowTone, StatRowToneClasses> = {
  units: {
    panel: 'border-slate-100 bg-slate-50 dark:border-slate-500/20 dark:bg-slate-500/10',
    tile: 'bg-emerald-100 dark:bg-emerald-500/20',
    icon: 'text-emerald-700 dark:text-emerald-300',
  },
  tenants: {
    panel: 'border-sky-100 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10',
    tile: 'bg-sky-500',
    icon: 'text-white',
  },
  rent: {
    panel: 'border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10',
    tile: 'bg-amber-600',
    icon: 'text-white',
  },
};

interface StatRowProps {
  label: string;
  value: string;
  /** Optional prefix rendered before the value, e.g. "KES". */
  prefix?: string;
  icon: LucideIcon;
  tone?: StatRowTone;
}

/**
 * A labelled statistic row: a tinted panel with the value on the left and a
 * coloured icon tile on the right.
 */
export function StatRow({
  label,
  value,
  prefix,
  icon,
  tone = 'units',
}: StatRowProps) {
  const t = TONES[tone];
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border px-3 py-2.5',
        t.panel,
      )}>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {label}
        </Text>
        <View className="flex-row items-baseline gap-1">
          {prefix ? (
            <Text className="text-xs font-semibold text-muted-foreground">
              {prefix}
            </Text>
          ) : null}
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-xl',
          t.tile,
        )}>
        <Icon as={icon} size={18} className={t.icon} />
      </View>
    </View>
  );
}
