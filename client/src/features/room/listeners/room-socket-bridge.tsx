"use client";

import { OnCircleOpenedForJoin } from "./on-circle-opened-for-join";
import { OnCircleTitleUpdated } from "./on-circle-title-updated";
import { OnConnectionCallEnded } from "./on-connection-call-ended";
import { OnHostEndedCircle } from "./on-host-ended-circle";
import { OnParticipantRemovedFromCircle } from "./on-participant-removed-from-circle";
import { OnPartnerDisconnected } from "./on-partner-disconnected";
import { OnRoomActivityToasts } from "./on-room-activity-toasts";

/**
 * Mounts global room/call Socket.IO bridges (null renderers).
 * Mount inside `MatchmakingProvider` — `OnPartnerDisconnected` uses matchmaking context.
 *
 * `OnDirectExpandedToCircle` stays separate: dialog UI + no matchmaking dependency.
 */
export function RoomSocketBridge() {
  return (
    <>
      <OnCircleTitleUpdated />
      <OnCircleOpenedForJoin />
      <OnHostEndedCircle />
      <OnParticipantRemovedFromCircle />
      <OnConnectionCallEnded />
      <OnPartnerDisconnected />
      <OnRoomActivityToasts />
    </>
  );
}
