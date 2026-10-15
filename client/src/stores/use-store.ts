import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAuthSlice, type AuthSlice } from './slices/auth-slice';
import { createOwnerSlice, type OwnerSlice } from './slices/owner-slice';
import { createPreferencesSlice, type PreferencesSlice } from './slices/preferences-slice';

export type AppStore = AuthSlice & OwnerSlice & PreferencesSlice;

/**
 * Global client state. Server data lives in TanStack Query; this store only
 * holds session + owner UI state + device preferences. Slices are composed here.
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
      ...createPreferencesSlice(set, get, store),

      /**
       * Full session teardown.
       *
       * Overrides the auth-slice default (which only nulled token/user/profile)
       * so a sign-out also wipes owner UI state. Both `useSignOut` and the axios
       * 401 interceptor call this, so every teardown path is covered.
       *
       * Display preferences are intentionally *not* cleared: they are a device
       * setting, not part of the session.
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
        themeMode: state.themeMode,
        fontSize: state.fontSize,
      }),
      // v0 also persisted a client-side `activeRole`, which is gone. v1 added no
      // display preferences. Rebuild from the fields that exist so a stale key
      // is never rehydrated and preferences default sensibly.
      version: 2,
      migrate: (persisted) => {
        const { token, user, profile, themeMode, fontSize } = persisted as Partial<AppStore>;
        return {
          token: token ?? null,
          user: user ?? null,
          profile: profile ?? null,
          themeMode: themeMode ?? 'system',
          fontSize: fontSize ?? 'default',
        };
      },
    },
  ),
);
