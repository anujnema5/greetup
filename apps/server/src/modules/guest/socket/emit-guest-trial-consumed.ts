import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";

import { GUEST_TRIAL_SOCKET_EVENTS } from "../constants/events/guest-trial-socket.events";

export type GuestTrialConsumedSocketPayload = {
  roomId: string;
  trialConsumed: true;
  nextStep: "signup";
};

export function emitGuestTrialConsumed(
  guestUserId: string,
  payload: GuestTrialConsumedSocketPayload,
): void {
  logger.info("guest_trial_consumed_socket_emit", {
    guestUserId,
    roomId: payload.roomId,
  });
  emitToUser(guestUserId, GUEST_TRIAL_SOCKET_EVENTS.trialConsumed, payload);
}
