import { useMemo } from 'react';
import { View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Building2, CheckCheck, Globe2, User } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Notice, NoticeAudience } from '@/api/types';

/**
 * Who a notice was addressed to, as a compact pill.
 *
 * The three audiences are not equally specific, and showing that difference is
 * most of the point for an owner scanning their sent list — "All tenants" means
 * something different from "1 tenant", so the labels say the recipient count's
 * shape rather than just repeating the enum.
 */
const AUDIENCE_PRESENTATION: Record<
  NoticeAudience,
  { label: string; icon: typeof Globe2; className: string }
> = {
  ALL_PROPERTIES: {
    label: 'All tenants',
    icon: Globe2,
    className: 'bg-muted text-muted-foreground',
  },
  PROPERTY: {
    label: 'One property',
    icon: Building2,
    className: 'bg-primary/10 text-primary',
  },
  TENANT: {
    label: 'One tenant',
    icon: User,
    className: 'bg-warning/10 text-warning',
  },
};

export function AudienceBadge({
  audience,
  className,
}: {
  audience: NoticeAudience;
  className?: string;
}) {
  const presentation = AUDIENCE_PRESENTATION[audience];

  return (
    <View
      className={cn(
        'flex-row items-center gap-1 self-start rounded-full px-2 py-1',
        presentation.className,
        className,
      )}>
      <Icon as={presentation.icon} size={11} />
      <Text className="text-[10px] font-bold uppercase tracking-wide">
        {presentation.label}
      </Text>
    </View>
  );
}

/** Human phrasing for the audience, used above a notice body. */
export function audienceLabel(audience: NoticeAudience): string {
  return AUDIENCE_PRESENTATION[audience].label;
}

/**
 * Where a notice applies, in one line.
 *
 * Keyed off the audience rather than `notice.property`, because only a PROPERTY
 * notice carries a property: a notice sent to a single tenant has `property`
 * null too, and labelling that "All properties" would tell the owner they
 * reached an entire building when they reached one person. The two audiences that
 * share a null property therefore get their own wording.
 */
export function noticeScopeLabel(
  notice: Pick<Notice, 'audience' | 'property'>,
  viewer: 'owner' | 'tenant' | 'caretaker',
): string {
  if (notice.audience === 'ALL_PROPERTIES') return 'All properties';
  if (notice.audience === 'PROPERTY') return notice.property?.name ?? 'One property';

  // Owner and caretaker are both on the sending side of the notice; only the
  // tenant reads it as addressed to them.
  return viewer === 'tenant' ? 'Sent directly to you' : 'One tenant';
}

/**
 * How much of the audience has opened a notice.
 *
 * A bar plus a count rather than a bare "3 / 5": for an announcement the owner's
 * real question is whether it landed, and a fraction of a bar answers that at a
 * glance where a number pair does not. Renders nothing at all when the notice
 * went to nobody — which happens for a property whose tenancies all ended
 * before anyone opened it.
 */
export function ReadProgress({
  readCount,
  recipientCount,
}: {
  readCount: number;
  recipientCount: number;
}) {
  // Declared above the early return below, which the rules-of-hooks lint
  // requires. Percentages are cheaper than branching the component in two.
  const percent =
    recipientCount === 0
      ? 0
      : Math.round(Math.min(readCount / recipientCount, 1) * 100);

  // Memoized: NativeWind's native interop identity-checks `style` on every
  // render, so an inline literal never compares equal to the previously
  // captured one and re-dispatches from inside the render phase — which hangs
  // the app on any state change.
  const barWidthStyle = useMemo(
    () => ({ width: `${percent}%` as DimensionValue }),
    [percent],
  );

  if (recipientCount === 0) {
    return (
      <Text className="text-[11px] font-medium text-muted-foreground">
        No active tenants to receive this
      </Text>
    );
  }

  const allRead = readCount === recipientCount;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon
            as={CheckCheck}
            size={12}
            className={allRead ? 'text-success' : 'text-muted-foreground'}
          />
          <Text
            className={cn(
              'text-[11px] font-bold',
              allRead ? 'text-success' : 'text-muted-foreground',
            )}>
            {allRead ? 'Everyone has read this' : 'Read so far'}
          </Text>
        </View>
        <Text className="text-[11px] font-semibold text-muted-foreground">
          {readCount}/{recipientCount}
        </Text>
      </View>

      {/* 2px track keeps the bar legible next to 12px type without shouting. */}
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <View
          className={cn('h-full rounded-full', allRead ? 'bg-success' : 'bg-primary')}
          style={barWidthStyle}
        />
      </View>
    </View>
  );
}

/**
 * The unread marker on a tenant row.
 *
 * Drawn as a solid teal dot rather than a count badge: the tenant list is a
 * single chronological feed, and a numeral would compete with the date for
 * attention while only ever meaning "0 or 1" per row.
 */
export function UnreadDot() {
  return (
    <View className="h-2.5 w-2.5 rounded-full bg-primary" accessibilityLabel="Unread" />
  );
}