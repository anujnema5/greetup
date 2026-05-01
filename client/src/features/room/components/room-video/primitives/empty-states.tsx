"use client";

import { Search, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── SearchingCandidateState ──────────────────────────────────────────────────

/**
 * Full-stage overlay shown while we are searching for the next match.
 * The orb rings use CSS animations defined in the global stylesheet.
 */
export function SearchingCandidateState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <PulsingOrb icon={<Search className="h-8 w-8 text-primary" />} animated />

      <div className="space-y-1.5">
        <p className="text-base font-semibold text-white">
          Searching for another candidate...
        </p>
        <p className="text-xs text-white/65 sm:text-sm">
          Your current match left. We will connect you when someone new is available.
        </p>
      </div>
    </div>
  );
}

// ─── NoPeerAvailableState ─────────────────────────────────────────────────────

/** Full-stage overlay shown when matchmaking could not find anyone. */
export function NoPeerAvailableState({
  detail,
  onTryAgain,
}: {
  detail: string | null;
  onTryAgain: () => void;
}) {
  const subtitle =
    detail?.trim() || "We could not find anyone to connect you with right now.";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <PulsingOrb icon={<UserX className="h-8 w-8 text-primary" aria-hidden />} animated={false} />

      <div className="max-w-md space-y-1.5">
        <p className="text-base font-semibold text-white">No peer available</p>
        <p className="text-xs text-white/65 sm:text-sm">{subtitle}</p>
      </div>

      <Button
        type="button"
        variant="default"
        size="lg"
        className="rounded-full px-8"
        onClick={onTryAgain}
      >
        Try again
      </Button>
    </div>
  );
}

// ─── Shared orb (internal) ────────────────────────────────────────────────────

/**
 * Decorative orb with three concentric rings and a centre icon.
 * When `animated` is true the rings pulse; when false they are static.
 */
function PulsingOrb({
  icon,
  animated,
}: {
  icon: React.ReactNode;
  animated: boolean;
}) {
  const ringClass = animated ? "match-orb-ring-pulse" : "";
  const centerClass = animated ? "animate-match-orb-breathe" : "";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      {/* Three concentric rings, each slightly smaller than the last */}
      <div className={`absolute inset-0 rounded-full border border-primary/12 ${ringClass}`} />
      <div
        className={`absolute rounded-full border border-primary/14 ${ringClass}`}
        style={{ inset: 14, animationDelay: animated ? "180ms" : undefined }}
      />
      <div
        className={`absolute rounded-full border border-primary/18 ${ringClass}`}
        style={{ inset: 28, animationDelay: animated ? "360ms" : undefined }}
      />

      {/* Glow behind the centre circle */}
      <div className="absolute inset-[30px] rounded-full bg-primary/15 blur-2xl" />

      {/* Centre icon circle */}
      <div
        className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-background/85 ${centerClass}`}
      >
        {icon}
      </div>
    </div>
  );
}
