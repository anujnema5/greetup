'use client';

import { type RefObject, useEffect, useReducer } from "react";
import { createPlaybackStreamWithClonedVideo } from "@/features/rtc/lib/media-stream-utils";

/** Re-render when video tracks mute/unmute so tiles can switch out of “black until first frame”. */
export function useRerenderOnVideoTrackMuteCycle(stream: MediaStream | null | undefined): number {
  const [gen, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return;
    const on = () => bump();
    tracks.forEach((t) => {
      t.addEventListener("unmute", on);
      t.addEventListener("mute", on);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener("unmute", on);
        t.removeEventListener("mute", on);
      });
    };
  }, [stream]);
  return gen;
}

export type UseAttachMediaStreamOptions = {
  /** Decodes via cloned video tracks — avoids black tiles with some WebRTC + Chromium combos. */
  cloneVideoTracksForPlayback?: boolean;
};

/** Keeps `<video>.srcObject` in sync and nudges playback when `stream` or `revision` changes. */
export function useAttachMediaStream(
  ref: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  revision: unknown = 0,
  options?: UseAttachMediaStreamOptions,
): void {
  const clone = options?.cloneVideoTracksForPlayback ?? false;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!stream) {
      el.srcObject = null;
      return;
    }

    const { playback, dispose } = clone
      ? createPlaybackStreamWithClonedVideo(stream)
      : { playback: stream, dispose: () => {} };

    el.srcObject = playback;

    const tryPlay = () => {
      void el.play().catch(() => {});
    };

    tryPlay();
    const tracks = stream.getVideoTracks();
    const onUnmute = () => tryPlay();
    tracks.forEach((t) => t.addEventListener("unmute", onUnmute));
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);

    return () => {
      dispose();
      tracks.forEach((t) => t.removeEventListener("unmute", onUnmute));
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      if (clone && el.srcObject === playback) el.srcObject = null;
    };
  }, [ref, stream, revision, clone]);
}
