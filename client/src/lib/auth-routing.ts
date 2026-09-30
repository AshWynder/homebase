import type { Href } from 'expo-router';

import type { UserProfile } from '@/api/types';

/**
 * Single source of truth for "which home does this session belong to".
 *
 * The role comes from the server profile and nowhere else. An earlier version
 * OR'd `profile.role` with a locally persisted `activeRole` and used the
 * profile only as a fallback; whenever the profile was missing the leftover
 * value from the previous session decided the view, so signing in as a tenant
 * after an owner sign-out landed on the owner app. There is no role cache to
 * get out of sync now, which also keeps the index route, the AuthGate and the
 * auth screens from disagreeing.
 */
export function isTenantSession(profile: UserProfile | null): boolean {
  return profile?.role === 'TENANT';
}

/**
 * A session is only routable once the token *and* the profile are known — the
 * role lives on the profile, so a token without one cannot be placed in either
 * role group and is treated as signed out.
 */
export function hasSession(token: string | null, profile: UserProfile | null): boolean {
  return !!token && !!profile;
}

/** Landing route for a given session: tenant tabs vs owner properties. */
export function homeRouteFor(profile: UserProfile | null): Href {
  return isTenantSession(profile) ? '/(tenant)/(tabs)/home' : '/(owner)/(tabs)/portfolio';
}
