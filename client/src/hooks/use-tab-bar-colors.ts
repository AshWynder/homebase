import { darkColors } from '@/theme/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Tab-bar palette for the current scheme. React Navigation needs concrete color
 * values rather than the semantic class tokens used elsewhere, so the two
 * palettes are mirrored here from `global.css`.
 */
export function useTabBarColors() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    active: isDark ? darkColors.emeraldLight : '#0F766E',
    inactive: isDark ? darkColors.textDim : '#A1A1AA',
    border: isDark ? darkColors.border : '#E4E4E7',
    background: isDark ? darkColors.background : '#FFFFFF',
  };
}
