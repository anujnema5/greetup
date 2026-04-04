/** Small helpers shared by full-screen room and minimized dock (no Redux — streams stay non-serializable). */

export function hasLiveVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.readyState === "live");
}

export function hasLiveMedia(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getTracks().some((t) => t.readyState === "live");
}

/** Local preview: track must be live and not muted via `track.enabled = false`. */
export function hasLiveEnabledVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled);
}
