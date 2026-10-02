import { View } from 'react-native';
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
    className: 'bg-slate-100 text-slate-700',
  },
  PROPERTY: {
    label: 'One property',
    icon: Building2,
    className: 'bg-teal-50 text-teal-800',
  },
  TENANT: {
    label: 'One tenant',
    icon: User,
    className: 'bg-amber-50 text-amber-800',
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
  viewer: 'owner' | 'tenant',
): string {
  if (notice.audience === 'ALL_PROPERTIES') return 'All properties';
  if (notice.audience === 'PROPERTY') return notice.property?.name ?? 'One property';

  return viewer === 'owner' ? 'One tenant' : 'Sent directly to you';
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
  if (recipientCount === 0) {
    return (
      <Text className="text-[11px] font-medium text-slate-400">
        No active tenants to receive this
      </Text>
    );
  }

  const ratio = Math.min(readCount / recipientCount, 1);
  const allRead = readCount === recipientCount;
  const percent = Math.round(ratio * 100);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon
            as={CheckCheck}
            size={12}
            className={allRead ? 'text-emerald-600' : 'text-slate-400'}
          />
          <Text
            className={cn(
              'text-[11px] font-bold',
              allRead ? 'text-emerald-700' : 'text-slate-500',
            )}>
            {allRead ? 'Everyone has read this' : 'Read so far'}
          </Text>
        </View>
        <Text className="text-[11px] font-semibold text-slate-500">
          {readCount}/{recipientCount}
        </Text>
      </View>

      {/* 2px track keeps the bar legible next to 12px type without shouting. */}
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <View
          className={cn('h-full rounded-full', allRead ? 'bg-emerald-500' : 'bg-teal-600')}
          style={{ width: `${percent}%` }}
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
    <View className="h-2.5 w-2.5 rounded-full bg-teal-600" accessibilityLabel="Unread" />
  );
}