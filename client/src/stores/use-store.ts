import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAuthSlice, type AuthSlice } from './slices/auth-slice';
import { createOwnerSlice, type OwnerSlice } from './slices/owner-slice';

export type AppStore = AuthSlice & OwnerSlice;

/**
 * Global client state. Server data lives in TanStack Query; this store only
 * holds session + owner UI state. Slices are composed here.
 *
 * Note there is no local role field. The role is read from the server profile
 * only (see `lib/auth-routing`) — a cached copy here was what let the previous
 * session's view survive a sign-out and win the next sign-in.
 */
export const useStore = create<AppStore>()(
  persist(
    (set, get, store) => ({
      ...createAuthSlice(set, get, store),
      ...createOwnerSlice(set, get, store),

      /**
       * Full session teardown.
       *
       * Overrides the auth-slice default (which only nulled token/user/profile)
       * so a sign-out also wipes owner UI state. Both `useSignOut` and the axios
       * 401 interceptor call this, so every teardown path is covered.
       */
      clearSession: () => {
        set({ token: null, user: null, profile: null });
        get().resetOwnerState();
      },
    }),
    {
      name: 'homebase-store',
      storage: createJSONStorage(() => AsyncStorage),
      // The session is persisted as one atom. A token is never written without
      // its profile (see `useSignIn`), so a rehydrated store is always
      // self-consistent and the persisted role can be trusted on cold start.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        profile: state.profile,
      }),
      // v0 also persisted a client-side `activeRole`, which is gone. Rebuild the
      // slice from the three session fields so no stale key is rehydrated.
      version: 1,
      migrate: (persisted) => {
        const { token, user, profile } = persisted as Partial<AppStore>;
        return { token: token ?? null, user: user ?? null, profile: profile ?? null };
      },
    },
  ),
);
