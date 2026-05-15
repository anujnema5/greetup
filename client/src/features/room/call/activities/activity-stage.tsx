"use client";

import {
  CALL_ACTIVITY_STAGE_BY_ID,
  GenericWrappedStage,
} from "@/features/room/call/activities/registry";
import type { RoomActivityMeta } from "@/features/room/types/call/room-activity.types";
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
  remoteMicOff?: boolean;
  remoteCameraOff?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  peerAvatarUrl?: string | null;
  myAvatarUrl?: string | null;
  activeRealtimeActivity: RoomActiveActivity | null;
  onEndActiveGame?: () => void;
  onOfferDrawGame?: () => void;
};

export function ActivityStage(props: ActivityStageProps) {
  const Stage = CALL_ACTIVITY_STAGE_BY_ID[props.activity.id] ?? GenericWrappedStage;
  return <Stage {...props} />;
}
