"use client";

import { OnSpaceOpenedForJoin } from "./on-space-opened-for-join";
import { OnSpaceTitleUpdated } from "./on-space-title-updated";
import { OnConnectionCallEnded } from "./on-connection-call-ended";
import { OnOtcCallEnded } from "./on-otc-call-ended";
import { OnHostEndedSpace } from "./on-host-ended-space";
import { OnParticipantRemovedFromSpace } from "./on-participant-removed-from-space";
import { OnPartnerDisconnected } from "./on-partner-disconnected";
import { OnRoomActivityToasts } from "./on-room-activity-toasts";

/**
 * Mounts global room/call Socket.IO bridges (null renderers).
 * Mount inside `MatchmakingProvider` — `OnPartnerDisconnected` uses matchmaking context.
 *
 * `OnDirectExpandedToSpace` stays separate: dialog UI + no matchmaking dependency.
 */
export function RoomSocketBridge() {
  return (
    <>
      <OnSpaceTitleUpdated />
      <OnSpaceOpenedForJoin />
      <OnHostEndedSpace />
      <OnParticipantRemovedFromSpace />
      <OnConnectionCallEnded />
      <OnOtcCallEnded />
      <OnPartnerDisconnected />
      <OnRoomActivityToasts />
    </>
  );
}
