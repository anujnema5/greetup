type MatchmakingCancel = { handleCancel: () => Promise<unknown> };
type AppRouter = { replace: (path: string) => void };

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
