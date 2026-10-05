import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. Use it to render values that differ
 * between the server and the browser (current time, timezone-formatted dates, random/session IDs)
 * without causing a hydration mismatch (React error #418).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
