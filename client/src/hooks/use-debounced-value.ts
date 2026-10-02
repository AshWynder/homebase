import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` ms, resetting the timer on every change.
 *
 * Used to keep a search box off the network on every keystroke. Also collapses
 * runs of intermediate states: because the query key is the debounced value,
 * typing "jeff" issues one request rather than one per character.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
