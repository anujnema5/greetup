"use client";

import type { ComponentType } from "react";
import { ChessActivityStage } from "@/features/activity";
import { GenericActivityStage } from "@/features/room/call/activities/stages/generic-activity-stage";
import type { ActivityStageProps } from "@/features/room/call/activities/activity-stage";
import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import type { EmbeddedCallPolicyPartial } from "@/features/room/embedded-activities";

export type CallActivityModule = {
  id: RoomActivityId;
  Stage: ComponentType<ActivityStageProps>;
  defaultPolicy?: EmbeddedCallPolicyPartial;
};

const CHESS_DEFAULT_POLICY: EmbeddedCallPolicyPartial = {
  hidePeopleTab: true,
  blockParticipantInvites: true,
  suppressPeoplePanelCameras: true,
  inviteBlockedMessage:
    "You can't invite someone while a chess game is in progress. End the game first.",
};

function ChessStage(props: ActivityStageProps) {
  return (
    <ChessActivityStage
      peerLabel={props.peerLabel}
      myName={props.myName}
      currentUserId={props.currentUserId}
      peerInitials={props.peerInitials}
      remoteVideoLive={props.remoteVideoLive}
      localVideoLive={props.localVideoLive}
      remoteStream={props.remoteStream}
      localStream={props.localStream}
      remoteMicOff={props.remoteMicOff}
      remoteCameraOff={props.remoteCameraOff}
      micEnabled={props.micEnabled}
      cameraEnabled={props.cameraEnabled}
      peerAvatarUrl={props.peerAvatarUrl}
      myAvatarUrl={props.myAvatarUrl}
      chessActivity={props.activeRealtimeActivity?.kind === "chess" ? props.activeRealtimeActivity : null}
      onEndGame={props.onEndActiveGame}
      onOfferDraw={props.onOfferDrawGame}
    />
  );
}

export function GenericWrappedStage(props: ActivityStageProps) {
  return (
    <GenericActivityStage
      label={props.activity.label}
      onExit={props.onExit}
      peerLabel={props.peerLabel}
      myName={props.myName}
      peerInitials={props.peerInitials}
      remoteVideoLive={props.remoteVideoLive}
      localVideoLive={props.localVideoLive}
      remoteStream={props.remoteStream}
      localStream={props.localStream}
      remoteMicOff={props.remoteMicOff}
      remoteCameraOff={props.remoteCameraOff}
      micEnabled={props.micEnabled}
      cameraEnabled={props.cameraEnabled}
      peerAvatarUrl={props.peerAvatarUrl}
      myAvatarUrl={props.myAvatarUrl}
    />
  );
}

export const CALL_ACTIVITY_REGISTRY: Partial<Record<RoomActivityId, CallActivityModule>> = {
  chess: { id: "chess", Stage: ChessStage, defaultPolicy: CHESS_DEFAULT_POLICY },
  watch: { id: "watch", Stage: GenericWrappedStage },
  draw: { id: "draw", Stage: GenericWrappedStage },
  quiz: { id: "quiz", Stage: GenericWrappedStage },
  music: { id: "music", Stage: GenericWrappedStage },
  dare: { id: "dare", Stage: GenericWrappedStage },
};

/** Module-level map — safe to index during render (no dynamic component creation). */
export const CALL_ACTIVITY_STAGE_BY_ID: Record<RoomActivityId, ComponentType<ActivityStageProps>> = {
  chess: ChessStage,
  watch: GenericWrappedStage,
  draw: GenericWrappedStage,
  quiz: GenericWrappedStage,
  music: GenericWrappedStage,
  dare: GenericWrappedStage,
};

export function resolveActivityStageComponent(
  activityId: RoomActivityId,
): ComponentType<ActivityStageProps> {
  return CALL_ACTIVITY_STAGE_BY_ID[activityId] ?? GenericWrappedStage;
}
