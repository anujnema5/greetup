"use client";

import { ChessActivityStage } from "@/features/activity";
import { GenericActivityStage } from "@/features/room/components/room-activity/generic-activity-stage";
import type { RoomActivityMeta } from "@/features/room/types/room-activity.types";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";

export type ActivityStageProps = {
  activity: RoomActivityMeta;
  onExit: () => void;
  peerLabel: string;
  myName: string;
  currentUserId: string | null;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  activeRealtimeActivity: RoomActiveActivity | null;
  onEndActiveGame?: () => void;
  onOfferDrawGame?: () => void;
};

export function ActivityStage({
  activity,
  onExit,
  peerLabel,
  myName,
  currentUserId,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteStream,
  localStream,
  activeRealtimeActivity,
  onEndActiveGame,
  onOfferDrawGame,
}: ActivityStageProps) {
  if (activity.id === "chess") {
    return (
      <ChessActivityStage
        peerLabel={peerLabel}
        myName={myName}
        currentUserId={currentUserId}
        peerInitials={peerInitials}
        remoteVideoLive={remoteVideoLive}
        localVideoLive={localVideoLive}
        remoteStream={remoteStream}
        localStream={localStream}
        chessActivity={activeRealtimeActivity?.kind === "chess" ? activeRealtimeActivity : null}
        onEndGame={onEndActiveGame}
        onOfferDraw={onOfferDrawGame}
      />
    );
  }

  return (
    <GenericActivityStage
      label={activity.label}
      onExit={onExit}
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
    />
  );
}
