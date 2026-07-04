import { toast } from "sonner";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";

export type OtcRemoteCallEndReason = "peer_ended" | "network";

/** Only network/unexpected drops — intentional peer leave uses the activity toast ("Your partner left"). */
export function showOtcRemoteCallEndToast(reason: OtcRemoteCallEndReason): void {
  if (reason === "peer_ended") return;
  toast.warning(OPEN_TO_CONNECT.toast.callDisconnected);
}
