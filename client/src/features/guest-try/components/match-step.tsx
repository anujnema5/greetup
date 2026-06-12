"use client";

import { Loader2, Video, X } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { MatchOrb } from "@/features/dashboard/components/match-orb";
import { useMatchmaking } from "@/features/matching";
import { GUEST_TRIAL_MATCH, GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";

import { RedirectToGuestRegister } from "./redirect-to-guest-register";
import { TryBackButton, type TryBackTarget } from "./try-back-button";
import { TryStepFrame } from "./try-step-frame";
import { queryKeys } from "@/lib/query/keys";

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

  const footer =
    back && !isSearching && !isMatched ? (
      <TryBackButton back={back} className="sm:w-auto" />
    ) : undefined;

  const orbDisabled = isProposed || !canStartMatch;

  return (
    <TryStepFrame
      icon={Video}
      title={title}
      description={heroCopy.subtitle}
      align="center"
      footer={footer}
      width="narrow"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-4 sm:gap-8 sm:py-6">
        {isMatched ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground sm:py-16">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            {GUEST_TRIAL_MATCH.connecting}
          </div>
        ) : (
          <>
            <div className="py-2">
              <MatchOrb
                isSearching={isSearching}
                disabled={orbDisabled}
                onToggle={() => {
                  if (!isSearching && !orbDisabled) {
                    handleFindMatch();
                  }
                }}
              />
            </div>
            {!isSearching && !isProposed ? (
              <p className="text-center text-base font-medium text-muted-foreground">
                {GUEST_TRIAL_MATCH.matchLabel}
              </p>
            ) : null}
          </>
        )}

        {isSearching && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/8"
          >
            <X className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} aria-hidden />
            {GUEST_TRIAL_MATCH.cancelSearch}
          </button>
        )}

        {status === "error" && error && (
          <div className="flex w-full flex-col items-center gap-3">
            <p
              className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => void restartSearch()}>
              {GUEST_TRIAL_NAV.tryAgain}
            </Button>
          </div>
        )}

        {matchSearchAttemptsRemaining === 1 && canStartMatch && !isMatched && !isSearching ? (
          <p className="text-center text-sm text-muted-foreground">{GUEST_TRIAL_MATCH.lastTryHint}</p>
        ) : null}
      </div>
    </TryStepFrame>
  );
}
