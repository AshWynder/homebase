import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkColors, lightColors } from './colors';

export function useAppColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}
