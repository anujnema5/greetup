"use client";

import type { ReactNode, RefObject } from "react";
import React from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

export function VideoMirror({
  srcRef,
  className,
  mirrored = false,
}: {
  srcRef: RefObject<HTMLVideoElement | null>;
  className?: string;
  mirrored?: boolean;
}) {
  const displayRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const src = srcRef.current;
    const dst = displayRef.current;
    if (!src || !dst) return;

    const sync = () => {
      if (dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject;
      }
    };

    sync();
    const interval = setInterval(sync, 300);
    return () => clearInterval(interval);
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

export function CameraOffAvatar({
  name,
  initials,
  imageUrl,
  sizeClass,
}: {
  name: string;
  initials: string;
  imageUrl?: string | null;
  sizeClass: string;
}) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-border/80 bg-muted text-foreground shadow-sm ring-1 ring-border/40",
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

export function SearchingCandidateState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-primary/12 match-orb-ring-pulse" />
        <div
          className="absolute rounded-full border border-primary/14 match-orb-ring-pulse"
          style={{ inset: 14, animationDelay: "180ms" }}
        />
        <div
          className="absolute rounded-full border border-primary/18 match-orb-ring-pulse"
          style={{ inset: 28, animationDelay: "360ms" }}
        />
        <div className="absolute inset-[30px] rounded-full bg-primary/15 blur-2xl" />
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-background/85 animate-match-orb-breathe">
          <Search className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-white">Searching for another candidate...</p>
        <p className="text-xs text-white/65 sm:text-sm">
          Your current match left. We will connect you when someone new is available.
        </p>
      </div>
    </div>
  );
}

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
        "absolute bottom-2 left-2 z-10 rounded-md border border-border/70 bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MediaControlButton({
  active,
  onClick,
  disabled,
  ariaLabel,
  iconOn,
  iconOff,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  iconOn: ReactNode;
  iconOff: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-11 rounded-full p-0 transition-colors disabled:cursor-not-allowed",
        active ? "bg-white/15 hover:bg-white/25" : "bg-amber-500/25 hover:bg-amber-500/35",
      )}
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      {active ? iconOn : iconOff}
    </Button>
  );
}

export function CircleToolbarButton({
  onClick,
  ariaLabel,
  children,
  className,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-11 rounded-full bg-white/15 p-0 transition-colors hover:bg-white/25",
        className,
      )}
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </Button>
  );
}
