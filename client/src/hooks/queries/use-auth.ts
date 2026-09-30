import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { authApi } from '@/api/auth';
import type { MeResponse, RegisterInput } from '@/api/types';
import { useStore } from '@/stores/use-store';

/**
 * Sign in via Better Auth, then fetch the linked UserProfile (/api/auth/me).
 *
 * The profile is fetched with an explicit bearer header and the store is
 * written once, at the end, with a complete session. Storing the token first
 * and reconciling afterwards left a window where the store held a token with no
 * profile, which `hasSession`/`isTenantSession` have to reject — and the sign-in
 * screen's redirect read that half-built state and routed to the owner app.
 */
export function useSignIn() {
  const setSession = useStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const signIn = await authApi.signIn(input);

      // The sign-in response carries the better-auth user + token, but not the
      // UserProfile id/role/phone, and the role decides which app to mount.
      let me: MeResponse;
      try {
        me = await authApi.me(signIn.token);
      } catch {
        // Surface it rather than signing into an app picked at random.
        throw new Error('Signed in, but your profile could not be loaded. Please try again.');
      }

      const session = {
        token: signIn.token,
        user: me.user ?? signIn.user,
        profile: me.profile,
      };
      setSession(session);
      return session;
    },
  });
}

/**
 * Register via the custom endpoint — the response already includes the token
 * and the profile, so the session is complete in one round trip.
 */
export function useSignUp() {
  const setSession = useStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => {
      setSession({ token: data.token, user: data.user, profile: data.profile });
    },
  });
}

/**
 * Revoke the Better Auth session server-side, then wipe local state, cache and
 * the persisted store, and land on sign-in.
 *
 * The redirect lives here so every sign-out entry point agrees: previously the
 * tenant screens called `signOut.mutate()` bare, leaving the router parked on a
 * route whose group had just been unmounted.
 */
export function useSignOut() {
  const clearSession = useStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.signOut(),
    onSettled: () => {
      clearSession();
      useStore.persist.clearStorage();
      queryClient.clear();
      router.replace('/(auth)/sign-in');
    },
  });
}
