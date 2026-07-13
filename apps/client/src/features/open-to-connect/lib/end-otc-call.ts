import { toast } from "sonner";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { navigateAfterCallEnd } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import type { OtcCallEndReason } from "@/features/open-to-connect/types/otc-call.types";

type MatchmakingCancel = { handleCancel: () => Promise<unknown> };
type AppRouter = { replace: (path: string) => void };

export type EndOtcCallForPeerOptions = {
  reason: OtcCallEndReason;
  roomIdToLeave: string | null;
  endVideoSession: () => void;
  leaveRoom: (arg: { roomId: string }) => Promise<unknown>;
  matchmaking: MatchmakingCancel;
  router: AppRouter;
  /** Prevents duplicate teardown when socket + RTC paths race. */
  handledRef?: { current: boolean };
  /** e.g. clear partner-left debounce timers before ending the session */
  beforeTeardown?: () => void;
};

function showNetworkDropToast(reason: OtcCallEndReason): void {
  // Intentional leave already shows "Your partner left" via in-call activity toasts.
  if (reason === "peer_ended") return;
  toast.warning(OPEN_TO_CONNECT.toast.callDisconnected);
}

/** Remaining peer: leave the OTC call and go home (no rematch). */
export function endOtcCallForPeer({
  reason,
  roomIdToLeave,
  endVideoSession,
  leaveRoom,
  matchmaking,
  router,
  handledRef,
  beforeTeardown,
}: EndOtcCallForPeerOptions): void {
  if (handledRef?.current) return;
  if (handledRef) handledRef.current = true;

  beforeTeardown?.();
  showNetworkDropToast(reason);
  clearRoomStorage();
  endVideoSession();

  void matchmaking.handleCancel().catch(() => {});
  const leavePromise = roomIdToLeave
    ? leaveRoom({ roomId: roomIdToLeave })
    : Promise.resolve();
  void leavePromise.catch(() => {}).finally(() => {
    navigateAfterCallEnd(matchmaking, router);
  });
}
