import { resolveTryPostCallPath } from "@/features/guest-try/lib/try-navigation";

import { consumeRoomReturnPath } from "../session/room-return-path";

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

/** Leave the call and return to the route the user was on before entering the room. */
export function navigateAfterCallEnd(
  matchmaking: MatchmakingCancel,
  router: AppRouter,
  fallback = "/home",
): void {
  const path = resolveTryPostCallPath(consumeRoomReturnPath(fallback), fallback);
  cancelMatchmakingThenNavigate(matchmaking, router, path);
}
