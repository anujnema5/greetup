"use client";

import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { MatchOrb } from "@/features/dashboard/components/match-orb";
import { useMatchmaking } from "@/features/matching";
import { GUEST_TRIAL_MATCH, GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

import { RedirectToGuestRegister } from "../gates/redirect-to-guest-register";
import { TryStepFrame } from "../layout/try-step-frame";
import type { TryBackTarget } from "../../types/guest-try.types";

type MatchStepProps = {
  displayName: string | null;
  trialConsumed: boolean;
  canStartMatch: boolean;
  matchSearchAttemptsRemaining?: number;
  back?: TryBackTarget;
};

export function MatchStep({
  displayName,
  trialConsumed,
  canStartMatch,
  matchSearchAttemptsRemaining,
  back,
}: MatchStepProps) {
  const queryClient = useQueryClient();
  const { status, error, errorCode, handleFindMatch, handleCancel, restartSearch } =
    useMatchmaking();

  const isSearching = status === "searching";
  const isProposed = status === "proposed";
  const isMatched = status === "matched";

  useEffect(() => {
    if (status === "searching" || status === "error") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guestTry.status });
    }
  }, [status, queryClient]);

  if (trialConsumed) {
    return <RedirectToGuestRegister />;
  }

  if (
    status === "error" &&
    (errorCode === "GUEST_TRIAL_EXHAUSTED" || errorCode === "GUEST_TRIAL_ALREADY_USED")
  ) {
    return <RedirectToGuestRegister />;
  }

  const heroCopy = isMatched
    ? GUEST_TRIAL_MATCH.matched
    : isSearching
      ? GUEST_TRIAL_MATCH.searching
      : isProposed
        ? GUEST_TRIAL_MATCH.proposed
        : GUEST_TRIAL_MATCH.idle;

  const title =
    typeof heroCopy.heading === "function" ? heroCopy.heading(displayName) : heroCopy.heading;

  const orbDisabled = isProposed || !canStartMatch;
  const showBack = back && !isSearching && !isMatched;

  return (
    <TryStepFrame
      title={title}
      description={heroCopy.subtitle}
      align="start"
      width="wide"
      back={showBack ? back : undefined}
      backLabel="Your vibe"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-muted/30",
          "px-6 py-10 sm:px-10 sm:py-12",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklch,var(--primary)_8%,transparent)_0%,transparent_58%)]"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-md flex-col items-center gap-5">
          {isMatched ? (
            <div
              className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {GUEST_TRIAL_MATCH.connecting}
            </div>
          ) : (
            <>
              <MatchOrb
                isSearching={isSearching}
                disabled={orbDisabled}
                onToggle={() => {
                  if (!isSearching && !orbDisabled) {
                    handleFindMatch();
                  }
                }}
              />

              {!isSearching && !isProposed ? (
                <p className="text-center text-sm text-muted-foreground">
                  {GUEST_TRIAL_MATCH.matchLabel}
                </p>
              ) : null}
            </>
          )}

          {isSearching ? (
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-sm"
            >
              <X className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} aria-hidden />
              {GUEST_TRIAL_MATCH.cancelSearch}
            </button>
          ) : null}

          {status === "error" && error ? (
            <div className="flex w-full flex-col items-center gap-2.5">
              <p
                className="w-full rounded-xl bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => void restartSearch()}>
                {GUEST_TRIAL_NAV.tryAgain}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {matchSearchAttemptsRemaining === 1 && canStartMatch && !isMatched && !isSearching ? (
        <p className="mt-4 text-sm text-muted-foreground">{GUEST_TRIAL_MATCH.lastTryHint}</p>
      ) : null}
    </TryStepFrame>
  );
}
