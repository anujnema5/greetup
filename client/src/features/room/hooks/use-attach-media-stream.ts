import { type RefObject, useEffect } from "react";

/** Keeps `<video>.srcObject` in sync and nudges playback when `stream` or `revision` changes. */
export function useAttachMediaStream(
  ref: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  revision: unknown = 0,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [ref, stream, revision]);
}
