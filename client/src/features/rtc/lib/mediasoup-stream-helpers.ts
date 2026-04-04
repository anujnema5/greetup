/** Helpers for composing local/remote `MediaStream`s around mediasoup producers/consumers. */

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

/** Mirrors {@link videoTrackActsAsScreenShare} into stored per-track metadata after consume. */
export function resolveInboundVideoMediaSource(
  track: MediaStreamTrack,
  signaled: "camera" | "screen",
): "camera" | "screen" {
  return videoTrackActsAsScreenShare(track, signaled) ? "screen" : "camera";
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
