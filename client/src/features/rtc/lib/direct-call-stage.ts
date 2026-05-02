/**
 * Direct (1:1) call layout: picks which tracks feed the main `<video>`, PiP, and `object-fit`.
 *
 * Non-direct room types pass through the primary remote stream unchanged for video layout
 * (gallery-style UIs should use {@link remoteParticipantsFromRecord} instead).
 */

import type { ProducerMediaSource } from "@/features/rtc/types/mediasoup-room.types";
import {
  inferScreenCaptureFromTrack,
  inboundVideoTrackIsSfuScreenShare,
  pickPrimaryParticipantCameraVideoTrack,
} from "@/features/rtc/lib/mediasoup-stream-helpers";

/** Classify local outbound video for PiP: known screen id + display-capture inference (covers stale ids). */
function localPreviewTrackMediaSource(
  videoTracks: MediaStreamTrack[],
  localScreenTrackId: string | null,
): Record<string, ProducerMediaSource> {
  const rtm: Record<string, ProducerMediaSource> = {};
  for (const t of videoTracks) {
    const explicitScreen = localScreenTrackId != null && t.id === localScreenTrackId;
    const inferredScreen = !explicitScreen && inferScreenCaptureFromTrack(t);
    rtm[t.id] = explicitScreen || inferredScreen ? "screen" : "camera";
  }
  return rtm;
}

export function isDirectRoom(rtcRoomType: string | null | undefined): boolean {
  return (rtcRoomType ?? "direct") === "direct";
}

/**
 * Priority for the main tile (direct only):
 * 1. Remote screen-share video (+ remote audio from the same composite stream)
 * 2. Local screen-share while you are sharing (+ that remote audio)
 * 3. Remote camera, or single remote video track
 *
 * Non-direct: returns `primaryRemoteStream` as-is.
 */
export function buildDirectCallMainStageStream(input: {
  rtcRoomType: string | null | undefined;
  primaryRemoteStream: MediaStream | null;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
  screenSharing: boolean;
  localStream: MediaStream | null;
  localScreenTrackId: string | null;
}): MediaStream | null {
  const {
    rtcRoomType,
    primaryRemoteStream: base,
    remoteTrackMediaSource,
    screenSharing,
    localStream,
    localScreenTrackId,
  } = input;

  if (!isDirectRoom(rtcRoomType)) return base;

  const remoteAudios = base?.getAudioTracks() ?? [];

  if (base) {
    const remoteVideos = base.getVideoTracks();
    const remoteScreen = remoteVideos.find((t) =>
      inboundVideoTrackIsSfuScreenShare(t, remoteTrackMediaSource[t.id]),
    );
    if (remoteScreen) return new MediaStream([remoteScreen, ...remoteAudios]);
  }

  if (screenSharing && localStream && localScreenTrackId) {
    const localScreen = localStream.getVideoTracks().find((t) => t.id === localScreenTrackId);
    if (localScreen && localScreen.readyState === "live") {
      return new MediaStream([localScreen, ...remoteAudios]);
    }
  }

  if (base) {
    const remoteVideos = base.getVideoTracks();
    if (remoteVideos.length > 1) {
      const chosen =
        pickPrimaryParticipantCameraVideoTrack(remoteVideos, remoteTrackMediaSource) ??
        remoteVideos[0]!;
      return new MediaStream([chosen, ...remoteAudios]);
    }
    return base;
  }

  return null;
}

/** True when the main tile should use `object-contain` (screen surfaces). */
export function directCallMainStageShowsScreen(input: {
  rtcRoomType: string | null | undefined;
  screenSharing: boolean;
  primaryRemoteStream: MediaStream | null;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
}): boolean {
  const { rtcRoomType, screenSharing, primaryRemoteStream, remoteTrackMediaSource } = input;
  if (!isDirectRoom(rtcRoomType)) return false;
  if (screenSharing) return true;
  if (!primaryRemoteStream) return false;
  return primaryRemoteStream
    .getVideoTracks()
    .some((t) => inboundVideoTrackIsSfuScreenShare(t, remoteTrackMediaSource[t.id]));
}

/** Camera-only stream for sidebar/dock while the main stage shows a screen share. */
export function buildDirectCallRemotePeerCameraStream(input: {
  rtcRoomType: string | null | undefined;
  primaryRemoteStream: MediaStream | null;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
}): MediaStream | null {
  const { rtcRoomType, primaryRemoteStream: base, remoteTrackMediaSource } = input;
  if (!base || !isDirectRoom(rtcRoomType)) return null;
  const videos = base.getVideoTracks();
  const cam = pickPrimaryParticipantCameraVideoTrack(videos, remoteTrackMediaSource);
  if (!cam) return null;
  return new MediaStream([cam]);
}

/**
 * Local self-view / PiP: never attach more than one video track — multiple tracks often render black.
 * Uses the known screen track id, plus display-capture inference when the id is stale after re-share.
 */
export function buildLocalPreviewStream(
  localStream: MediaStream | null,
  localScreenTrackId: string | null,
): MediaStream | null {
  if (!localStream) return null;
  const audios = localStream.getAudioTracks();
  const videos = localStream.getVideoTracks();
  if (videos.length === 0) return audios.length > 0 ? new MediaStream(audios) : null;
  if (videos.length === 1) return localStream;

  const withoutKnownScreen =
    localScreenTrackId != null
      ? videos.filter((t) => t.id !== localScreenTrackId)
      : videos;
  if (withoutKnownScreen.length === 1) {
    return new MediaStream([...audios, withoutKnownScreen[0]!]);
  }
  if (withoutKnownScreen.length === 0) {
    const rtm = localPreviewTrackMediaSource(videos, null);
    const cam = pickPrimaryParticipantCameraVideoTrack(videos, rtm);
    if (!cam) return new MediaStream(audios);
    return new MediaStream([...audios, cam]);
  }

  const rtm = localPreviewTrackMediaSource(videos, localScreenTrackId);
  const cam = pickPrimaryParticipantCameraVideoTrack(withoutKnownScreen, rtm);
  if (!cam) return new MediaStream(audios);
  return new MediaStream([...audios, cam]);
}
