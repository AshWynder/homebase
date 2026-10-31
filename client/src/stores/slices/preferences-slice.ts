import type { StateCreator } from 'zustand';

/** How the app decides between the light and dark palette. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Preset text sizes exposed on the Display settings screen. */
export type FontSize = 'small' | 'default' | 'large' | 'largest';

export interface PreferencesSlice {
  /** Light/dark preference. `system` follows the OS setting. */
  themeMode: ThemeMode;
  /** Preset text-size preference. */
  fontSize: FontSize;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
}

/**
 * Device-local display preferences. Unlike the session in `auth-slice`, these
 * belong to the *device* rather than the account, so they deliberately survive
 * sign-out (see `clearSession` in `use-store`) — a user who prefers the light
 * palette should not be thrown back into the dark one on the next login.
 */
export const createPreferencesSlice: StateCreator<PreferencesSlice, [], [], PreferencesSlice> = (set) => ({
  themeMode: 'light',
  fontSize: 'default',
  setThemeMode: (themeMode) => set({ themeMode }),
  setFontSize: (fontSize) => set({ fontSize }),
});
