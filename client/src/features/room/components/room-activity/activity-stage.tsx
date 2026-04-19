"use client";

import type { RefObject } from "react";
import { ChessActivityStage } from "@/features/room/components/room-activity/chess-activity-stage";
import { GenericActivityStage } from "@/features/room/components/room-activity/generic-activity-stage";
import type { RoomActivityMeta } from "@/features/room/types/room-activity.types";

export type ActivityStageProps = {
  activity: RoomActivityMeta;
  onExit: () => void;
  peerLabel: string;
  myName: string;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
};

export function ActivityStage({
  activity,
  onExit,
  peerLabel,
  myName,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteVideoRef,
  localVideoRef,
}: ActivityStageProps) {
  if (activity.id === "chess") {
    return (
      <ChessActivityStage
        peerLabel={peerLabel}
        myName={myName}
        peerInitials={peerInitials}
        remoteVideoLive={remoteVideoLive}
        localVideoLive={localVideoLive}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
      />
    );
  }

  return <GenericActivityStage label={activity.label} onExit={onExit} />;
}
