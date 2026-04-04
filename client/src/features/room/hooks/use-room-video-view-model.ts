"use client";

import { useMemo, useRef } from "react";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import {
  hasLiveEnabledVideo,
  hasLiveMedia,
  hasLiveVideo,
  mergeGroupGalleryParticipants,
  type MediasoupRoomStatus,
  type RemoteParticipant,
  type RemotePeer,
} from "@/features/rtc";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { useCallElapsedSeconds } from "@/features/room/hooks/use-call-elapsed-seconds";
import { formatCallDuration } from "@/features/room/lib/format-call-duration";

export type UseRoomVideoViewModelArgs = {
  remoteStream: MediaStream | null;
  remotePeerCameraOff: boolean;
  localStream: MediaStream | null;
  mainStageShowsScreen: boolean;
  remotePeerCameraStream: MediaStream | null;
  isGroupRoom: boolean;
  remotePeers: Record<string, RemotePeer>;
  remoteParticipants: RemoteParticipant[];
  mediaStatus: MediasoupRoomStatus;
  rtcRoomType: "direct" | "circle" | null;
  peerLabel: string;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
};

export function useRoomVideoViewModel(p: UseRoomVideoViewModelArgs) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerCameraInsetRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const elapsed = useCallElapsedSeconds(true);

  const remoteVideoLive = hasLiveVideo(p.remoteStream) && !p.remotePeerCameraOff;
  const remoteMediaLive = hasLiveMedia(p.remoteStream);
  const localVideoLive = hasLiveEnabledVideo(p.localStream);

  const peerInitials = useMemo(
    () =>
      p.peerLabel
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join(""),
    [p.peerLabel],
  );

  const peerCameraInsetStream =
    p.mainStageShowsScreen && p.remotePeerCameraStream && hasLiveVideo(p.remotePeerCameraStream)
      ? p.remotePeerCameraStream
      : null;
  const peerCameraInsetLive = hasLiveVideo(peerCameraInsetStream);

  useAttachMediaStream(remoteVideoRef, p.remoteStream ?? null, remoteVideoLive);
  useAttachMediaStream(localVideoRef, p.localStream ?? null, localVideoLive);
  useAttachMediaStream(peerCameraInsetRef, peerCameraInsetStream, peerCameraInsetLive);

  const mediaTogglesReady =
    p.mediaStatus === "ready" && Boolean(p.onToggleMic && p.onToggleCamera);
  const screenShareAllowed = canUseScreenShare(p.rtcRoomType);
  const showScreenShare =
    screenShareAllowed && Boolean(p.onToggleScreenShare && p.onToggleMic && p.onToggleCamera);
  const mediaBusy =
    p.mediaStatus === "connecting_socket" ||
    p.mediaStatus === "joining" ||
    p.mediaStatus === "negotiating";

  const groupGalleryParticipants = useMemo(() => {
    if (!p.isGroupRoom) return p.remoteParticipants;
    return mergeGroupGalleryParticipants(p.remotePeers, p.remoteParticipants);
  }, [p.isGroupRoom, p.remotePeers, p.remoteParticipants]);

  return {
    remoteVideoRef,
    peerCameraInsetRef,
    localVideoRef,
    remoteVideoLive,
    remoteMediaLive,
    localVideoLive,
    /** Non-null while screen share is main stage and peer camera is available. */
    peerCameraInsetStream,
    peerCameraInsetLive,
    peerInitials,
    groupGalleryParticipants,
    mediaTogglesReady,
    showScreenShare,
    mediaBusy,
    elapsed,
    formatDuration: formatCallDuration,
  };
}
