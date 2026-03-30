"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const COMPLETE_AT_PERCENT = 80;

export type ProfileCompletionCopy = {
  headline: string;
  supporting: string;
  variant: "complete" | "high" | "mid" | "low";
};

export function getProfileCompletionCopy(
  percent: number,
  isOnboarded: boolean | null | undefined
): ProfileCompletionCopy {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const done = isOnboarded === true || p >= COMPLETE_AT_PERCENT;

  if (done) {
    return {
      headline: "Profile complete",
      supporting:
        "Great work — your profile has everything we need. Update sections anytime to keep it fresh.",
      variant: "complete",
    };
  }
  if (p >= 60) {
    return {
      headline: "You’re almost there",
      supporting: `You’re at ${p}% — add the remaining details so matches see the full you.`,
      variant: "high",
    };
  }
  if (p >= 40) {
    return {
      headline: "Nice progress",
      supporting:
        "Keep filling in your profile — richer profiles lead to better conversations on Circlo.",
      variant: "mid",
    };
  }
  if (p >= 1) {
    return {
      headline: "Let’s build your profile",
      supporting:
        "Add basics, goals, and interests so people know who they’re connecting with.",
      variant: "low",
    };
  }
  return {
    headline: "Start your profile",
    supporting:
      "You haven’t filled in much yet — take a few minutes to introduce yourself.",
    variant: "low",
  };
}

type ProfileCompletionCardProps = {
  percent: number | null | undefined;
  isOnboarded: boolean | null | undefined;
  onContinueEditing: () => void;
  className?: string;
};

export function ProfileCompletionCard({
  percent,
  isOnboarded,
  onContinueEditing,
  className,
}: ProfileCompletionCardProps) {
  const p = percent != null && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const rounded = Math.round(p);
  const copy = getProfileCompletionCopy(rounded, isOnboarded);
  const isDone = copy.variant === "complete";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 md:p-5",
        isDone
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-border bg-card",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            isDone
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-primary/20 bg-primary/8 text-primary"
          )}
        >
          {isDone ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">{copy.headline}</h2>
            <span
              className={cn(
                "text-[13px] font-bold tabular-nums",
                isDone ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
              aria-label={`Profile ${rounded} percent complete`}
            >
              {rounded}%
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{copy.supporting}</p>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                isDone ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${rounded}%` }}
            />
          </div>

          {!isDone ? (
            <button
              type="button"
              onClick={onContinueEditing}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              Complete your profile
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
