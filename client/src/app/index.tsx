import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { homeRouteFor } from '@/lib/auth-routing';
import { useStore } from '@/stores/use-store';

/**
 * Entry route: gate on the persisted auth session.
 *
 * The zustand store rehydrates from AsyncStorage asynchronously, so wait for
 * hydration before redirecting — otherwise a signed-in user would briefly be
 * flashed to the sign-in screen.
 */
export default function Index() {
  // All hooks are declared before any early return to keep hook order stable.
  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);
  const activeRole = useStore((s) => s.activeRole);
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  if (!hydrated) return null;

  return (
    <Redirect href={token ? homeRouteFor(profile, activeRole) : '/(auth)/sign-in'} />
  );
}