"use client";

/**
 * Chrome often throttles (or never decodes) very small in-layout `<video>` elements → persistent
 * black frames. {@link MainStage} fixes this with off-screen 320×180 decode sinks + VideoMirror;
 * the minimized dock must do the same while the call is floating over other routes.
 */
import { useRef, type RefObject } from "react";
import { VideoMirror } from "@/features/room/call/tiles/tile-primitives";
import { useAttachMediaStream } from "@/features/room/hooks/media/use-attach-media-stream";
import { cn } from "@/lib/utils";

export const MINIMIZED_DOCK_OFFSCREEN_SINK_CLASS =
  "pointer-events-none fixed top-0 left-[-9999px] z-[-1] h-[180px] w-[320px] opacity-0";

type Props = {
  stream: MediaStream | null;
  attachRevision: unknown;
  /** Local self-view: mirror + mute display to avoid feedback. */
  mirrored: boolean;
  /** Full-size video tile (when false but stream present, use `audioOnlyClassName` for remote audio). */
  videoVisible: boolean;
  visibleClassName: string;
  audioOnlyClassName: string;
  cloneVideoTracksForPlayback?: boolean;
};

export function MinimizedDockVideoFromSink({
  stream,
  attachRevision,
  mirrored,
  videoVisible,
  visibleClassName,
  audioOnlyClassName,
  cloneVideoTracksForPlayback = true,
}: Props) {
  const sinkRef = useRef<HTMLVideoElement>(null);
  useAttachMediaStream(sinkRef, stream, attachRevision, {
    cloneVideoTracksForPlayback,
  });

  return (
    <>
      <video
        ref={sinkRef}
        playsInline
        autoPlay
        muted={mirrored}
        className={MINIMIZED_DOCK_OFFSCREEN_SINK_CLASS}
        aria-hidden
      />
      <VideoMirror
        srcRef={sinkRef as RefObject<HTMLVideoElement | null>}
        mirrored={mirrored}
        className={cn(
          "pointer-events-none",
          videoVisible ? visibleClassName : audioOnlyClassName,
        )}
      />
    </>
  );
}
