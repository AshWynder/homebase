import { colorScheme, rem } from 'nativewind';
import { useEffect } from 'react';

import { BaseRem, FontSizeScale } from '@/constants/theme';
import { useStore } from '@/stores/use-store';

/**
 * Applies the persisted Display preferences to NativeWind.
 *
 * Both NativeWind APIs are global side-effects rather than React state, so this
 * hook is mounted once at the app root. The effects are the bridge between the
 * per-device preferences in the store and the styling runtime:
 *
 * - `colorScheme.set` flips the `dark` variant that every `dark:` class and the
 *   `global.css` variable set relies on.
 * - `rem.set` rescales every rem-based utility (text and spacing), which is how
 *   the text-size presets work now that Metro is configured with
 *   `inlineRem: false`.
 */
export function useDisplayPreferences() {
  const themeMode = useStore((s) => s.themeMode);
  const fontSize = useStore((s) => s.fontSize);

  useEffect(() => {
    colorScheme.set(themeMode);
  }, [themeMode]);

  useEffect(() => {
    rem.set(BaseRem * FontSizeScale[fontSize]);
  }, [fontSize]);
}
