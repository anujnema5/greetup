import type { MutableRefObject } from 'react';

/**
 * Runs async work strictly one-after-another (e.g. skip → immediate re-find)
 * so overlapping HTTP starts do not clobber `requestId` refs.
 */
export function runSerialized<T>(
  tailRef: MutableRefObject<Promise<void>>,
  job: () => Promise<T>,
): Promise<T> {
  const next = tailRef.current.then(job);
  tailRef.current = next.then(
    () => {},
    () => {},
  );
  return next;
}
