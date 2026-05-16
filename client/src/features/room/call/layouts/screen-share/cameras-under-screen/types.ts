import type { RefObject } from "react";
import type { RemoteParticipant } from "@/features/rtc";
import type { LiveSpeakerCallProps } from "@/features/room/types/call/active-speaker-props.types";
import type { CircleParticipantKickProps } from "@/features/room/types/call/in-call-screen.types";

export type CamerasUnderScreenShareProps = {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoLive: boolean;
  localStream: MediaStream | null;
  myName: string;
  myInitial: string;
  myAvatarUrl?: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteParticipants: RemoteParticipant[];
  className?: string;
  currentUserId?: string | null;
} & LiveSpeakerCallProps &
  CircleParticipantKickProps;
