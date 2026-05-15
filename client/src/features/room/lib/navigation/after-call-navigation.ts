type MatchmakingCancel = { handleCancel: () => Promise<unknown> };
type AppRouter = { replace: (path: string) => void };

/**
 * Clears matchmaking state, then navigates. Used whenever a call ends and we leave the RTC surface.
 * Errors from `handleCancel` are ignored so navigation still runs.
 */
export function cancelMatchmakingThenNavigate(
  matchmaking: MatchmakingCancel,
  router: AppRouter,
  path: string,
): void {
  void matchmaking
    .handleCancel()
    .catch(() => {})
    .finally(() => {
      router.replace(path);
    });
}
