import type { Href } from 'expo-router';

import type { UserProfile } from '@/api/types';
import type { AppRole } from '@/stores/slices/ui-slice';

/**
 * Single source of truth for "which home does this session belong to".
 *
 * Role can come from the server profile (authoritative) or, as a fallback, the
 * locally selected `activeRole`. Keeping this in one place stops the owner/
 * tenant routing rules from drifting between the index route, the AuthGate and
 * the auth screens.
 */
export function isTenantSession(
  profile: UserProfile | null,
  activeRole: AppRole,
): boolean {
  return profile?.role === 'TENANT' || activeRole === 'tenant';
}

/** Landing route for a given session: tenant tabs vs owner properties. */
export function homeRouteFor(
  profile: UserProfile | null,
  activeRole: AppRole,
): Href {
  return isTenantSession(profile, activeRole)
    ? '/(tenant)/(tabs)/home'
    : '/(owner)/(tabs)/properties';
}