"use client";

import { useMemo, useRef } from "react";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import {
  hasLiveEnabledVideo,
  hasLiveMedia,
  hasLiveVideo,
  mergeGroupGalleryParticipants,
  type MediasoupRoomStatus,
  type ProducerMediaSource,
  type RemoteParticipant,
  type RemotePeer,
  type ScreenShareTileInfo,
} from "@/features/rtc";
import {
  cameraOnlyParticipantStream,
  videoTrackIdsFromScreenShareTilesForPeer,
} from "@/features/rtc/lib/screen-share-stage";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { useCallElapsedSeconds } from "@/features/room/hooks/use-call-elapsed-seconds";
import { formatCallDuration } from "@/features/room/lib/format-call-duration";
import type { RoomSessionType } from "@/shared/types/room-session";

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
  rtcRoomType: RoomSessionType | null;
  peerLabel: string;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  screenShareTiles?: ScreenShareTileInfo[];
  remoteTrackMediaSource?: Record<string, ProducerMediaSource>;
};

export function useRoomVideoViewModel(p: UseRoomVideoViewModelArgs) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerCameraInsetRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const elapsed = useCallElapsedSeconds(true);

  /** Partner camera-off must not hide the main stage when it is a screen share (or other non-camera video). */
  const remoteVideoLive =
    hasLiveVideo(p.remoteStream) && (!p.remotePeerCameraOff || p.mainStageShowsScreen);
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

  const screenShareMainLayout = Boolean(
    p.isGroupRoom && p.screenShareTiles && p.screenShareTiles.length > 0,
  );

  const groupGalleryParticipants = useMemo(() => {
    if (!p.isGroupRoom) return p.remoteParticipants;
    const merged = mergeGroupGalleryParticipants(p.remotePeers, p.remoteParticipants);
    const rtm = p.remoteTrackMediaSource ?? {};
    const tiles = p.screenShareTiles ?? [];
    // Always camera+mic-only per peer for circle tiles. Exclude whatever we already show as a
    // screen-share tile for that peer so metadata glitches cannot attach the screen track to the
    // camera cell. `screenShareTiles` must be in deps — it used to be missing, so tiles never
    // influenced this stream when only share state changed.
    return merged.map((part) => {
      const exclude = new Set<string>();
      if (tiles.length > 0) {
        for (const id of videoTrackIdsFromScreenShareTilesForPeer(tiles, part.peer.peerId)) {
          exclude.add(id);
        }
      }
      for (const t of part.stream.getVideoTracks()) {
        if (rtm[t.id] === "screen") exclude.add(t.id);
      }
      return {
        ...part,
        stream: cameraOnlyParticipantStream(part.stream, rtm, {
          excludeVideoTrackIds: exclude.size > 0 ? exclude : undefined,
        }),
      };
    });
  }, [p.isGroupRoom, p.remotePeers, p.remoteParticipants, p.remoteTrackMediaSource, p.screenShareTiles]);

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
    screenShareMainLayout,
  };
}
