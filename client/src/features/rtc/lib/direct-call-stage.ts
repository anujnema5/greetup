/**
 * Direct (1:1) call layout: picks which tracks feed the main `<video>`, PiP, and `object-fit`.
 *
 * Non-direct room types pass through the primary remote stream unchanged for video layout
 * (gallery-style UIs should use {@link remoteParticipantsFromRecord} instead).
 */

import type { ProducerMediaSource } from "@/features/rtc/types/mediasoup-room.types";
import { videoTrackActsAsScreenShare } from "@/features/rtc/lib/mediasoup-stream-helpers";

function isDirectRoom(rtcRoomType: string | null | undefined): boolean {
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
      videoTrackActsAsScreenShare(t, remoteTrackMediaSource[t.id]),
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
      const cameras = remoteVideos.filter(
        (t) => !videoTrackActsAsScreenShare(t, remoteTrackMediaSource[t.id]),
      );
      const chosen = cameras[0] ?? remoteVideos[0];
      return new MediaStream([chosen!, ...remoteAudios]);
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
    .some((t) => videoTrackActsAsScreenShare(t, remoteTrackMediaSource[t.id]));
}

/** Camera-only stream for sidebar/dock while the main stage shows a screen share. */
export function buildDirectCallRemotePeerCameraStream(input: {
  rtcRoomType: string | null | undefined;
  primaryRemoteStream: MediaStream | null;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
}): MediaStream | null {
  const { rtcRoomType, primaryRemoteStream: base, remoteTrackMediaSource } = input;
  if (!base || !isDirectRoom(rtcRoomType)) return null;
  const cameras = base
    .getVideoTracks()
    .filter((t) => !videoTrackActsAsScreenShare(t, remoteTrackMediaSource[t.id]));
  if (cameras.length === 0) return null;
  return new MediaStream([cameras[0]!]);
}

/** Hides the display-capture track in local PiP while screen-sharing. */
export function buildLocalPreviewStream(
  localStream: MediaStream | null,
  localScreenTrackId: string | null,
): MediaStream | null {
  if (!localStream) return null;
  if (localScreenTrackId == null) return localStream;
  const tracks = localStream.getTracks().filter((t) => t.id !== localScreenTrackId);
  return tracks.length > 0 ? new MediaStream(tracks) : localStream;
}
