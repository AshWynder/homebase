import { LinearGradient as LinearGradientImpl } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import type { LinearGradientProps } from 'expo-linear-gradient';

// `expo-linear-gradient`'s LinearGradient does not accept `className`, so any
// Nativewind utilities passed to it are silently dropped. Registering the
// interop here makes padding/flex/shadow classes resolve against its style.
cssInterop(LinearGradientImpl, {
  className: 'style',
});

/**
 * A Nativewind-compatible wrapper around `expo-linear-gradient`'s LinearGradient.
 *
 * @component
 * @example
 * ```tsx
 * <LinearGradient colors={['#0F766E', '#115E59']} className="rounded-2xl px-6 py-4">
 *   <Text className="text-white">Done</Text>
 * </LinearGradient>
 * ```
 */
function LinearGradient(props: LinearGradientProps) {
  return <LinearGradientImpl {...props} />;
}

export { LinearGradient };