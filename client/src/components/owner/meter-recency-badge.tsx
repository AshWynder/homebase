import type { MeterType } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { daysUntil } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * How stale a meter's latest reading is, as a tone ladder: green means the
 * round was just done, amber/rose means it is overdue. The thresholds live
 * here so the caretaker's round and the owner's tenant list never disagree
 * about what counts as stale.
 */
const RECENCY_TONES = [
  { maxDays: 1, chip: 'bg-emerald-50', text: 'text-emerald-700' },
  { maxDays: 6, chip: 'bg-slate-100', text: 'text-slate-600' },
  { maxDays: 29, chip: 'bg-amber-50', text: 'text-amber-700' },
  { maxDays: Infinity, chip: 'bg-rose-50', text: 'text-rose-700' },
];

const NO_READINGS_TONE = { chip: 'bg-slate-100', text: 'text-slate-500' };

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  WATER: 'Water',
  ELECTRICITY: 'Electricity',
};

/** Whole days since the reading, clamped at 0 so a future-dated reading never reads "-2 days ago". */
export function meterDaysSince(date?: string | null): number | null {
  if (!date) return null;
  const remaining = daysUntil(date);
  if (remaining === null) return null;
  return Math.max(0, -remaining);
}

/** `Read today` / `Read yesterday` / `N days ago`. */
export function readingAgeLabel(days: number): string {
  if (days === 0) return 'Read today';
  if (days === 1) return 'Read yesterday';
  return `${days} days ago`;
}

/**
 * Days since a meter's most recent reading.
 *
 * `label` prefixes the meter type (`Water · 3 days ago`) for rows that show
 * more than one meter; omit it where the meter type is already on screen.
 * Renders nothing meaningful when there is no date — it shows `No readings`,
 * which is itself the signal that the round has never been done.
 */
export function MeterRecencyBadge({
  date,
  label,
  className,
}: {
  date?: string | null;
  label?: string;
  className?: string;
}) {
  const days = meterDaysSince(date);
  const tone =
    days === null
      ? NO_READINGS_TONE
      : RECENCY_TONES.find(({ maxDays }) => days <= maxDays) ??
        RECENCY_TONES[RECENCY_TONES.length - 1];
  const age = days === null ? 'No readings' : readingAgeLabel(days);

  return (
    <Badge variant="secondary" className={cn(tone.chip, className)}>
      <Text className={cn('text-[10px] font-semibold', tone.text)}>
        {label ? `${label} · ${age}` : age}
      </Text>
    </Badge>
  );
}
