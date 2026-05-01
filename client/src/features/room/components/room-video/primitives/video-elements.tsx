"use client";

import { useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

// ─── VideoMirror ──────────────────────────────────────────────────────────────

/**
 * Displays a video stream from `srcRef` in a new <video> element.
 * Use `mirrored` for the local self-view — it flips the image horizontally
 * so it feels like looking in a mirror, which users expect from webcams.
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

  // Poll every 300 ms so we pick up stream changes (e.g. reconnects)
  // without wiring a full event listener chain.
  useEffect(() => {
    const src = srcRef.current;
    const dst = displayRef.current;
    if (!src || !dst) return;

    const sync = () => {
      if (dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject;
      }
    };

    sync();
    const id = setInterval(sync, 300);
    return () => clearInterval(id);
  }, [srcRef]);

  return (
    <video
      ref={displayRef}
      playsInline
      autoPlay
      muted={mirrored}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

// ─── CameraOffAvatar ──────────────────────────────────────────────────────────

/**
 * Circular avatar shown in place of a video feed when the camera is off.
 * Prefers the profile image; falls back to initials if none is set.
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
          src={getProfileImageUrl(imageUrl)}
          alt={`${name} profile`}
          fill
          sizes="(max-width: 768px) 96px, 144px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-center text-lg font-semibold sm:text-xl">
          <span>{initials || "?"}</span>
        </div>
      )}
    </div>
  );
}
