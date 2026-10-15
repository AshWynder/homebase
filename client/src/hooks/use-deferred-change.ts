import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Returns a handler that applies `onChange(next)` once the current touch
 * interaction settles, skipping no-op changes.
 *
 * Tapping a filter swaps a large list in the same commit. Running that setState
 * synchronously inside `onPress` lets the swap's re-render overlap NativeWind's
 * style dispatch, which re-dispatches from inside the render phase and freezes
 * the app. Deferring past the interaction keeps the tap instant and the
 * re-render clear of the press — the same fix used by `SegmentedControl`.
 */
export function useDeferredChange<T>(value: T, onChange: (next: T) => void) {
  const pending = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      pending.current?.cancel();
    };
  }, []);

  return useCallback(
    (next: T) => {
      if (next === value) return;
      pending.current?.cancel();
      pending.current = InteractionManager.runAfterInteractions(() => {
        onChange(next);
        pending.current = null;
      });
    },
    [value, onChange],
  );
}
