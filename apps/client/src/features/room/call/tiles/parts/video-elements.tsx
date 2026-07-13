"use client";

/**
 * Small video UI primitives for the room call (mirror stream, avatar fallback).
 */

import { useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isMobileRtcCaptureProfile } from "@/features/rtc/lib/rtc-mobile-profile";

// ─── VideoMirror ──────────────────────────────────────────────────────────────

/**
 * Renders the same `MediaStream` as a hidden “sink” `<video>` (`srcRef`) into a visible `<video>`.
 * We poll `srcObject` because the sink is updated by other hooks; events alone do not always fire.
 *
 * Interval: slightly faster on touch devices so track swaps after reconnect feel less “stuck”.
 */
export function VideoMirror({
  srcRef,
  className,
  mirrored = false,
}: {
  srcRef: RefObject<HTMLVideoElement | null>;
  className?: string;
  mirrored?: boolean;
}) {
  const displayRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const src = srcRef.current;
    const dst = displayRef.current;
    if (!src || !dst) return;

    const syncSrcObject = () => {
      if (dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject;
      }
    };

    syncSrcObject();
    const intervalMs = isMobileRtcCaptureProfile() ? 100 : 300;
    const id = setInterval(syncSrcObject, intervalMs);
    return () => clearInterval(id);
  }, [srcRef]);

  return (
    <video
      ref={displayRef}
      playsInline
      autoPlay
      muted={mirrored}
      className={cn("pointer-events-none", className, mirrored && "-scale-x-100")}
    />
  );
}

// ─── CameraOffAvatar ─────────────────────────────────────────────────────────

/**
 * Circular avatar when camera is off; profile image or initials.
 */
export function CameraOffAvatar({
  name,
  initials,
  imageUrl,
  sizeClass,
}: {
  name: string;
  initials: string;
  imageUrl?: string | null;
  /** Tailwind size classes, e.g. "h-20 w-20 md:h-24 md:w-24" */
  sizeClass: string;
}) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-border/80",
        "bg-muted text-foreground shadow-sm ring-1 ring-border/40",
        sizeClass,
      )}
    >
      {hasImage ? (
        <Image
          src={imageUrl!.trim()}
          alt={`${name} profile`}
          fill
          sizes="(max-width: 768px) 96px, 144px"
          className="object-cover"
          unoptimized
          loading="eager"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-center text-lg font-semibold sm:text-xl">
          <span>{initials || "?"}</span>
        </div>
      )}
    </div>
  );
}
