"use client";

import type { CSSProperties, ReactNode } from "react";
import { useAudioLevel } from "@/features/room/hooks/media/use-audio-level";
import { TileMediaControlsBar } from "@/features/room/call/tiles/parts/tile-participant-controls-bar";
import { cn } from "@/lib/utils";

// ─── TileNameBadge ────────────────────────────────────────────────────────────

/** Shared chrome for tile name labels (static + hover trigger). */
export const TILE_NAME_BADGE_CHROME =
  "rounded-md border border-border/70 bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm";

/** Name label pinned to the bottom-left of a video tile. */
export function TileNameBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-2 left-2 z-10",
        TILE_NAME_BADGE_CHROME,
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── TileMediaStatus ──────────────────────────────────────────────────────────

/**
 * Mic / camera status pill pinned to the bottom-right of a video tile.
 *
 * Rules:
 *  - Pass `false`     → shows the red icon (e.g. mic is muted)
 *  - Pass `true`      → hides the icon (everything is fine, no visual noise)
 *  - Pass `undefined` → hides the icon (state is unknown, don't guess)
 *
 * The pill only renders at all when at least one icon is visible.
 */
export function TileMediaStatus({
  micOn,
  cameraOn,
  className,
}: {
  micOn?: boolean;
  cameraOn?: boolean;
  className?: string;
}) {
  return <TileMediaControlsBar micOn={micOn} cameraOn={cameraOn} className={className} />;
}

// ─── TileSpeakingRings ────────────────────────────────────────────────────────

/** Audio level below this is treated as silence — rings stay hidden. */
const SPEAKING_THRESHOLD = 0.04;

const SPEAKING_RING_EASE: Pick<CSSProperties, "transition"> = {
  transition: "transform 80ms ease-out, opacity 80ms ease-out",
};

/**
 * Google Meet-style speaking indicator.
 *
 * Wraps any avatar/child with three concentric rings that pulse
 * outward in response to the microphone loudness from `stream`.
 *
 * Pass `stream={null}` to disable completely (e.g. when the peer is muted)
 * — no AudioContext will be created and no rings will appear.
 */
export function TileSpeakingRings({
  stream,
  children,
}: {
  stream: MediaStream | null;
  children: ReactNode;
}) {
  const level = useAudioLevel(stream);
  const speaking = level > SPEAKING_THRESHOLD;

  // Each ring is defined by how far it expands and how strongly it glows.
  // Listed inner → outer so they layer correctly.
  const rings = [
    {
      label: "inner",
      scale: 1 + level * 0.14,
      opacity: speaking ? Math.min(level * 2.2, 0.9) : 0,
      ringClass: "border-2 border-emerald-400/90",
    },
    {
      label: "middle",
      scale: 1 + level * 0.38,
      opacity: speaking ? level * 0.68 : 0,
      ringClass: "border-[1.5px] border-emerald-400/65",
    },
    {
      label: "outer",
      scale: 1 + level * 0.72,
      opacity: speaking ? level * 0.38 : 0,
      ringClass:
        "border-0 bg-[radial-gradient(circle,transparent_44%,rgba(52,211,153,0.28)_100%)]",
    },
  ];

  return (
    <div className="relative inline-flex items-center justify-center">
      {rings.map((ring) => (
        <div
          key={ring.label}
          className={cn("pointer-events-none absolute inset-0 rounded-full", ring.ringClass)}
          style={{
            transform: `scale(${ring.scale})`,
            opacity: ring.opacity,
            ...SPEAKING_RING_EASE,
          }}
        />
      ))}
      {children}
    </div>
  );
}
