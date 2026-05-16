import type { RefObject } from "react";
import type { RemoteParticipant } from "@/features/rtc";
import type { ActiveSpeakerProps } from "@/features/room/types/call/active-speaker-props.types";

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
} & ActiveSpeakerProps;
