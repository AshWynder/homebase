import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { authApi, type QueryUsersInput } from '@/api/auth';
import type { ChangePasswordInput, MeResponse, RegisterInput, UpdateProfileInput } from '@/api/types';
import { useStore } from '@/stores/use-store';

import { queryKeys } from './keys';

/**
 * Sign in via Better Auth, then fetch the linked UserProfile (/api/auth/me).
 */
export function useSignIn() {
  const setSession = useStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const signIn = await authApi.signIn(input);

      let me: MeResponse;
      try {
        me = await authApi.me(signIn.token);
      } catch {
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
 * User profiles for the owner-side pickers.
 */
export function useUsers(params: QueryUsersInput = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => authApi.listUsers(params),
  });
}

/**
 * Register via the custom endpoint.
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
 * Update user details (name, email, phone, nationalId).
 */
export function useUpdateProfile() {
  const updateUser = useStore((s) => s.updateUser);
  const updateProfile = useStore((s) => s.updateProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => authApi.updateProfile(input),
    onSuccess: (data) => {
      updateUser(data.user);
      updateProfile(data.profile);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Upload profile photo avatar.
 */
export function useUploadAvatar() {
  const updateUser = useStore((s) => s.updateUser);
  const updateProfile = useStore((s) => s.updateProfile);

  return useMutation({
    mutationFn: (formData: FormData) => authApi.uploadAvatar(formData),
    onSuccess: (data) => {
      updateUser(data.user);
      updateProfile(data.profile);
    },
  });
}

/**
 * Change account password.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authApi.changePassword(input),
  });
}

/**
 * Revoke the Better Auth session server-side, then wipe local state, cache and
 * the persisted store, and land on sign-in.
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
