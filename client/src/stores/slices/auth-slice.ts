import type { StateCreator } from 'zustand';

import type { AuthUser, UserProfile } from '@/api/types';

export interface AuthSession {
  token: string;
  user: AuthUser;
  profile: UserProfile | null;
}

export interface AuthSlice {
  /** Better Auth JWT (bearer token) — null when signed out. */
  token: string | null;
  user: AuthUser | null;
  /** Linked UserProfile — carries the `id` used as `ownerId` and the `role`. */
  profile: UserProfile | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (
  set,
) => ({
  token: null,
  user: null,
  profile: null,
  setSession: ({ token, user, profile }) => set({ token, user, profile }),
  clearSession: () => set({ token: null, user: null, profile: null }),
});