/** Small helpers shared by full-screen room and minimized dock (no Redux — streams stay non-serializable). */

export function hasLiveVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.readyState === "live");
}

/**
 * Inbound WebRTC video often stays `track.muted === true` until the first decodable frame; a
 * `<video>` bound during that window renders black. Use this for remote tiles instead of
 * {@link hasLiveVideo} when you want to avoid a persistent black surface.
 */
export function hasRenderableRemoteVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream
    .getVideoTracks()
    .some((t) => t.readyState === "live" && !t.muted && t.enabled);
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

/**
 * Stable string for `useAttachMediaStream` revision — forces re-bind when the set of video tracks
 * changes (e.g. camera + screen) even if `MediaStream` identity is unstable across renders.
 */
export function mediaStreamVideoAttachRevision(stream: MediaStream | null | undefined): string {
  if (!stream) return "";
  return stream
    .getVideoTracks()
    .map((t) => `${t.id}:${t.readyState}:${t.enabled ? 1 : 0}:${t.muted ? 1 : 0}`)
    .join("|");
}

/**
 * Some Chromium builds show a black `<video>` when the same inbound track is decoded for display
 * while also consumed by WebRTC. Cloned video tracks decouple playback from the SFU consumer.
 */
export function createPlaybackStreamWithClonedVideo(
  stream: MediaStream | null,
): { playback: MediaStream | null; dispose: () => void } {
  if (!stream) return { playback: null, dispose: () => {} };
  const videos = stream.getVideoTracks();
  if (videos.length === 0) return { playback: stream, dispose: () => {} };
  const clones = videos.map((t) => t.clone());
  const playback = new MediaStream([...stream.getAudioTracks(), ...clones]);
  return {
    playback,
    dispose: () => {
      for (const c of clones) {
        try {
          c.stop();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
