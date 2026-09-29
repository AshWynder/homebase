import { useEffect, useState, type ReactNode } from 'react';
import { router, useSegments } from 'expo-router';

import { homeRouteFor } from '@/lib/auth-routing';
import { useStore } from '@/stores/use-store';

/**
 * Navigation safety net around the root navigator.
 *
 * The root layout already mounts only the group matching the current session
 * (`Stack.Protected`), so this component mostly covers the brief transition
 * where the router still points at a group that just became unavailable. It
 * reacts to:
 *  - sign-out (session cleared by `useSignOut`)
 *  - invalid/expired JWT (the axios interceptor clears the session on 401)
 *  - cold start (waits for the persisted session to rehydrate first)
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);
  const activeRole = useStore((s) => s.activeRole);
  const segments = useSegments();
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  const inAuthGroup = segments[0] === '(auth)';

  useEffect(() => {
    if (!hydrated) return;

    if (!token && !inAuthGroup) {
      // Signed out or session invalidated (401) → back to login.
      router.replace('/(auth)/sign-in');
    } else if (token && inAuthGroup) {
      // Authenticated but still on an auth screen → into the right role's home.
      router.replace(homeRouteFor(profile, activeRole));
    }
  }, [token, hydrated, inAuthGroup, profile, activeRole]);

  // Hold the UI (splash covers the blank) until the session has rehydrated,
  // so a persisted token is never mistaken for "signed out".
  if (!hydrated) return null;

  return <>{children}</>;
}