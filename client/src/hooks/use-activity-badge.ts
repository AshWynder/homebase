import { useMemo } from 'react';
import { useSentNotices } from '@/hooks/queries/use-notices';
import { useTenancies } from '@/hooks/queries/use-tenancies';

/**
 * Shared hook returning whether the Activity Hub has actionable items needing review.
 * Matches the logic in the Activity Hub screen.
 */
export function useActivityNeedsReview(): boolean {
  const noticesQuery = useSentNotices({});
  const moveOutQuery = useTenancies({ isActive: false });

  const leaseNoticesCount = useMemo(() => {
    const items = moveOutQuery.data?.items ?? [];
    if (!items.length) {
      return moveOutQuery.data?.total ?? 0;
    }
    const actionable = items.filter((item: any) => {
      return item.terminationRequestedAt || item.terminationReason || !item.isActive;
    });
    return actionable.length;
  }, [moveOutQuery.data]);

  const announcementsCount = noticesQuery.data?.pages?.[0]?.total ?? 0;
  const needsReviewCount = leaseNoticesCount + announcementsCount;

  return needsReviewCount > 0;
}
