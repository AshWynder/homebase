import type { StateCreator } from 'zustand';

import type { Role } from '@/api/types';

export type AppRole = 'owner' | 'tenant';

export interface UiSlice {
  /** Which role's experience is currently active (MVP: owner first). */
  activeRole: AppRole;
  serverRole: Role | null;
  setActiveRole: (role: AppRole) => void;
  setServerRole: (role: Role | null) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  activeRole: 'owner',
  serverRole: null,
  setActiveRole: (role) => set({ activeRole: role }),
  setServerRole: (role) => set({ serverRole: role }),
});