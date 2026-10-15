import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';

/**
 * Web variant of {@link useColorScheme}. To support static rendering, the value
 * is re-calculated on the client after mount so the server-rendered markup does
 * not disagree with the browser's resolved scheme.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { colorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  return colorScheme ?? 'light';
}
