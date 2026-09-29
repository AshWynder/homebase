import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAuthSlice, type AuthSlice } from './slices/auth-slice';
import { createOwnerSlice, type OwnerSlice } from './slices/owner-slice';
import { createUiSlice, type UiSlice } from './slices/ui-slice';

export type AppStore = UiSlice & AuthSlice & OwnerSlice;

/**
 * Global client state. Server data lives in TanStack Query; this store only
 * holds UI/session state. Slices are composed here.
 */
export const useStore = create<AppStore>()(
  persist(
    (set, get, store) => ({
      ...createUiSlice(set, get, store),
      ...createAuthSlice(set, get, store),
      ...createOwnerSlice(set, get, store),

      /**
       * Full session teardown.
       *
       * Overrides the auth-slice default (which only nulled token/user/profile)
       * so a sign-out also wipes role selection and owner UI state. Without this
       * the previous user's `activeRole` / selected property survived and the
       * next login inherited the former session's view. Both `useSignOut` and
       * the axios 401 interceptor call this, so every teardown path is covered.
       */
      clearSession: () =>
        set({
          // auth
          token: null,
          user: null,
          profile: null,
          // ui / role
          serverRole: null,
          activeRole: 'owner',
          // owner UI state
          selectedPropertyId: null,
          invoiceStatusFilter: 'ALL',
          activeModal: null,
        }),
    }),
    {
      name: 'homebase-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeRole: state.activeRole,
        token: state.token,
        user: state.user,
        profile: state.profile,
      }),
    },
  ),
);