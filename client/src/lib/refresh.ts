/**
 * Guarantees that a pull-to-refresh can never strand the `RefreshControl`.
 *
 * The awaited refetches are run with `Promise.allSettled` raced against a
 * timeout, so the handler always finishes even if an underlying request never
 * settles (a hung fetch, an aborted retry, etc.). A minimum spinner duration
 * is also enforced so the native refresh control always sees a committed
 * `true → false` transition — without it, a refresh that settles in the same
 * frame as a pull can leave the control visually stuck on the next one.
 */
const REFETCH_TIMEOUT_MS = 10_000;
const MIN_REFRESH_MS = 400;

export async function runRefresh(
  refetches: Promise<unknown>[],
  setRefreshing: (refreshing: boolean) => void,
): Promise<void> {
  setRefreshing(true);
  const startedAt = Date.now();
  try {
    await Promise.race([
      Promise.allSettled(refetches),
      new Promise<void>((resolve) => setTimeout(resolve, REFETCH_TIMEOUT_MS)),
    ]);
  } finally {
    const remaining = MIN_REFRESH_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }
    setRefreshing(false);
  }
}