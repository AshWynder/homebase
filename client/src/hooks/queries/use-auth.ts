import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { RegisterInput } from '@/api/types';
import { useStore } from '@/stores/use-store';

/** Sign in via Better Auth, then fetch the linked UserProfile (/api/auth/me). */
export function useSignIn() {
  const setSession = useStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const signIn = await authApi.signIn(input);
      // Store the token immediately so the axios interceptor attaches it to
      // the follow-up /me request (the sign-in response carries the
      // better-auth user + token, but not the UserProfile id/role/phone).
      setSession({ token: signIn.token, user: signIn.user, profile: null });
      const me = await authApi.me().catch(() => null);
      const session = {
        token: signIn.token,
        user: me?.user ?? signIn.user,
        profile: me?.profile ?? null,
      };
      setSession(session);
      if (session.profile?.role === 'TENANT') {
        useStore.getState().setActiveRole('tenant');
      } else if (session.profile?.role === 'OWNER') {
        useStore.getState().setActiveRole('owner');
      }
      return session;
    },
  });
}

/** Register via the custom endpoint — response already includes token + profile. */
export function useSignUp() {
  const setSession = useStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => {
      setSession({ token: data.token, user: data.user, profile: data.profile });
      if (data.profile?.role === 'TENANT') {
        useStore.getState().setActiveRole('tenant');
      } else if (data.profile?.role === 'OWNER') {
        useStore.getState().setActiveRole('owner');
      }
    },
  });
}

/** Revoke the Better Auth session server-side, then wipe local state + cache. */
export function useSignOut() {
  const clearSession = useStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.signOut(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}