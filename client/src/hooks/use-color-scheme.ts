import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

/**
 * The *effective* color scheme — the user's Display preference resolved against
 * the OS setting. NativeWind owns the resolution (it already reacts to
 * `colorScheme.set` calls from `useDisplayPreferences`), so this is a thin,
 * typed wrapper for the rest of the app to consume.
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme ?? 'light';
}
