/** Helpers for composing local/remote `MediaStream`s around mediasoup producers/consumers. */

import type { ProducerMediaSource } from "@/features/rtc/types/mediasoup-room.types";

/** True when the browser reports a captured display surface (post-`getDisplayMedia`). */
export function inferScreenCaptureFromTrack(track: MediaStreamTrack): boolean {
  if (track.kind !== "video") return false;
  try {
    const ds = (track.getSettings() as { displaySurface?: string }).displaySurface;
    if (ds === "monitor" || ds === "window" || ds === "browser") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Treat as screen if SFU said so. For `camera`, do **not** infer from `displaySurface` on inbound
 * tracks — receivers can false-positive and hide the partner camera beside screen share.
 * When `signaled` is missing (before metadata is stored), fall back to inference.
 */
export function videoTrackActsAsScreenShare(
  track: MediaStreamTrack,
  signaled?: "camera" | "screen",
): boolean {
  if (track.kind !== "video") return false;
  if (signaled === "screen") return true;
  if (signaled === "camera") return false;
  return inferScreenCaptureFromTrack(track);
}

/**
 * Remote video counts as an SFU screen share (filmstrip / focus tiles). For unknown `signaled`,
 * uses display-surface inference so a new screen producer still lists before metadata settles.
 */
export function inboundVideoTrackIsSfuScreenShare(
  track: MediaStreamTrack,
  signaled?: ProducerMediaSource,
): boolean {
  if (track.kind !== "video") return false;
  if (signaled === "screen") return true;
  if (signaled === "camera") return false;
  return inferScreenCaptureFromTrack(track);
}

/**
 * Remote video should appear in participant camera UI (inset, People tab, gallery strip).
 * Only excludes tracks the SFU marked as `screen` — avoids false-positive inference hiding camera
 * when multiple video producers exist (e.g. both users sharing).
 */
export function inboundVideoTrackIsParticipantCamera(
  track: MediaStreamTrack,
  signaled?: ProducerMediaSource,
): boolean {
  if (track.kind !== "video") return false;
  return signaled !== "screen";
}

/**
 * Camera-tile eligibility: SFU `screen` is out; for unknown `signaled`, drop display-capture
 * tracks so a delayed `mediaSource` update does not leave screen + camera competing (muted camera
 * vs live screen used to pick the wrong track → black tile).
 */
export function trackEligibleForParticipantCameraTile(
  track: MediaStreamTrack,
  signaled: ProducerMediaSource | undefined,
): boolean {
  if (track.kind !== "video") return false;
  if (signaled === "screen") return false;
  if (signaled === "camera") return true;
  return !inferScreenCaptureFromTrack(track);
}

function videoTrackPixelArea(t: MediaStreamTrack): number {
  try {
    const s = t.getSettings() as { width?: number; height?: number };
    return (s.width ?? 0) * (s.height ?? 0);
  } catch {
    return 0;
  }
}

/** When camera vs screen are still ambiguous, unmuted first, then smaller frame (webcam) before 4K capture. */
function sortVideoTracksForCameraTileWithAreaTieBreak(tracks: MediaStreamTrack[]): MediaStreamTrack[] {
  return [...tracks].sort((a, b) => {
    const am = a.muted ? 1 : 0;
    const bm = b.muted ? 1 : 0;
    if (am !== bm) return am - bm;
    const pa = videoTrackPixelArea(a);
    const pb = videoTrackPixelArea(b);
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Picks one inbound video track for a participant camera tile (never both camera+screen on one
 * `<video>`). Strips SFU `screen`, then disambiguates with unmuted-first + smaller resolution.
 */
export function pickPrimaryParticipantCameraVideoTrack(
  videoTracks: MediaStreamTrack[],
  remoteTrackMediaSource: Record<string, ProducerMediaSource>,
): MediaStreamTrack | null {
  if (videoTracks.length === 0) return null;

  const noExplicitScreen = videoTracks.filter((t) => remoteTrackMediaSource[t.id] !== "screen");
  const work = noExplicitScreen.length > 0 ? noExplicitScreen : videoTracks;
  if (work.length === 1) return work[0]!;

  const taggedCameras = work.filter((t) => remoteTrackMediaSource[t.id] === "camera");
  if (taggedCameras.length >= 1) {
    const noDisplaySurface = taggedCameras.filter((t) => !inferScreenCaptureFromTrack(t));
    const pool = noDisplaySurface.length >= 1 ? noDisplaySurface : taggedCameras;
    return sortVideoTracksForCameraTileWithAreaTieBreak(pool)[0]!;
  }

  const notSfuScreen = work.filter(
    (t) => !inboundVideoTrackIsSfuScreenShare(t, remoteTrackMediaSource[t.id]),
  );
  if (notSfuScreen.length === 1) return notSfuScreen[0]!;
  if (notSfuScreen.length > 1) {
    const tagged = notSfuScreen.filter((t) => remoteTrackMediaSource[t.id] === "camera");
    if (tagged.length >= 1) {
      return sortVideoTracksForCameraTileWithAreaTieBreak(tagged)[0]!;
    }
    const nonCapture = notSfuScreen.filter((t) => !inferScreenCaptureFromTrack(t));
    const pool = nonCapture.length >= 1 ? nonCapture : notSfuScreen;
    return sortVideoTracksForCameraTileWithAreaTieBreak(pool)[0]!;
  }

  return sortVideoTracksForCameraTileWithAreaTieBreak(work)[0]!;
}

/**
 * Store SFU `mediaSource` as the display role for this inbound track. Do not re-classify from
 * `displaySurface` — that was flipping real camera tracks to "screen" and breaking camera tiles
 * when a peer added screen share.
 */
export function resolveInboundVideoMediaSource(
  _track: MediaStreamTrack,
  signaled: "camera" | "screen",
): "camera" | "screen" {
  return signaled === "screen" ? "screen" : "camera";
}

export function copyStreamWithoutTrack(prev: MediaStream, track: MediaStreamTrack): MediaStream {
  const next = new MediaStream();
  for (const t of prev.getTracks()) {
    if (t !== track) next.addTrack(t);
  }
  return next;
}

/** Replace camera video only; keep `screenTrack` in the stream if present. */
export function mergeLocalCameraTrack(
  prevStream: MediaStream | null,
  newTrack: MediaStreamTrack,
  screenTrack: MediaStreamTrack | null,
): MediaStream {
  const out: MediaStreamTrack[] = [];
  if (prevStream) {
    for (const t of prevStream.getTracks()) {
      if (t.kind === "audio") {
        out.push(t);
      } else if (t.kind === "video") {
        if (screenTrack && t === screenTrack) {
          out.push(t);
        } else {
          if (t !== newTrack) {
            try {
              t.stop();
            } catch {
              /* ignore */
            }
          }
        }
      }
    }
  }
  if (!out.includes(newTrack)) out.push(newTrack);
  return new MediaStream(out);
}

/** Drop camera video tracks; keep optional screen + all audio. */
export function rebuildLocalStreamWithoutCameraVideo(
  prev: MediaStream | null,
  screenTrack: MediaStreamTrack | null,
): MediaStream | null {
  if (!prev) return null;
  const keep: MediaStreamTrack[] = [];
  for (const t of prev.getTracks()) {
    if (t.kind === "audio") {
      keep.push(t);
    } else if (t.kind === "video") {
      if (screenTrack && t === screenTrack) keep.push(t);
      else {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      }
    }
  }
  return keep.length > 0 ? new MediaStream(keep) : null;
}

export function appendTrack(prev: MediaStream | null, track: MediaStreamTrack): MediaStream {
  const base = prev ?? new MediaStream();
  const tracks = [...base.getTracks()];
  if (tracks.includes(track)) return base;
  return new MediaStream([...tracks, track]);
}

/** Keep the other kind, replace same-kind with `newTrack` (stop old). */
export function mergeLocalTrack(
  prevStream: MediaStream | null,
  newTrack: MediaStreamTrack,
  kind: "audio" | "video",
): MediaStream {
  const out: MediaStreamTrack[] = [];
  if (prevStream) {
    for (const t of prevStream.getTracks()) {
      const sameKind = kind === "audio" ? t.kind === "audio" : t.kind === "video";
      if (sameKind) {
        if (t !== newTrack) t.stop();
        continue;
      }
      out.push(t);
    }
  }
  out.push(newTrack);
  return new MediaStream(out);
}

/** Stops and drops all tracks of `kind`; returns a stream with remaining tracks or null. */
/** Stops `track` and returns a stream without it (or null if empty). */
export function stopAndRemoveTrackFromStream(
  prev: MediaStream | null,
  track: MediaStreamTrack,
): MediaStream | null {
  try {
    track.stop();
  } catch {
    /* ignore */
  }
  if (!prev) return null;
  const next = copyStreamWithoutTrack(prev, track);
  const remaining = next.getTracks();
  return remaining.length > 0 ? next : null;
}

export function mergeLocalScreenIntoStream(
  prev: MediaStream | null,
  newScreenTrack: MediaStreamTrack,
  previousScreenTrack: MediaStreamTrack | null,
): MediaStream {
  let base: MediaStream | null = prev;
  if (previousScreenTrack) {
    base = stopAndRemoveTrackFromStream(prev, previousScreenTrack);
  }
  return appendTrack(base, newScreenTrack);
}

export function rebuildLocalStreamWithoutKind(
  prev: MediaStream | null,
  kind: "audio" | "video",
): MediaStream | null {
  if (!prev) return null;
  const keep: MediaStreamTrack[] = [];
  for (const t of prev.getTracks()) {
    const isKind = kind === "audio" ? t.kind === "audio" : t.kind === "video";
    if (isKind) {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    } else {
      keep.push(t);
    }
  }
  return keep.length > 0 ? new MediaStream(keep) : null;
}
