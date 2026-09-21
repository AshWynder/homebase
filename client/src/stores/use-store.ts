import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createOwnerSlice, type OwnerSlice } from './slices/owner-slice';
import { createUiSlice, type UiSlice } from './slices/ui-slice';

export type AppStore = UiSlice & OwnerSlice;

/**
 * Global client state. Server data lives in TanStack Query; this store only
 * holds UI/session state. Slices are composed here.
 */
export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createUiSlice(...args),
      ...createOwnerSlice(...args),
    }),
    {
      name: 'homebase-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activeRole: state.activeRole }),
    },
  ),
);