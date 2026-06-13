"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useMatchPrepCurrent, useMatchPrepOptions } from "@/features/profile-setup/api";
import { getApiErrorMessage } from "@/lib/api";
import { GUEST_TRIAL_NAV, GUEST_TRIAL_PREFS } from "@/lib/copy/user-messages";

import { VIBE_PREFS_MAX_INTERESTS, VIBE_PREFS_MIN_INTERESTS } from "../../constants/vibe-prefs.constants";
import { useHydrateVibeDraft } from "../../hooks/use-hydrate-vibe-draft";
import { useSaveVibePrefs } from "../../hooks/use-save-vibe-prefs";
import {
  toggleVibeDraft,
  validateVibeDraft,
  vibeDraftFromSaved,
  vibeDraftsEqual,
} from "../../lib/vibe-prefs-draft";
import type { TryBackTarget, VibePrefsDraft } from "../../types/guest-try.types";
import { TryContinueButton } from "../ui/try-continue-button";
import { TryChipList } from "../ui/try-chip-list";
import { TrySection } from "../ui/try-section";
import { TryStepFrame } from "../layout/try-step-frame";

type VibeStepProps = {
  draft: VibePrefsDraft | null;
  onDraftChange: (draft: VibePrefsDraft) => void;
  back?: TryBackTarget;
  onForward?: () => void;
};

export function VibeStep({ draft, onDraftChange, back, onForward }: VibeStepProps) {
  const { data: options, isLoading, isError, refetch } = useMatchPrepOptions({ enabled: true });
  const {
    data: saved,
    isSuccess: savedReady,
    isError: savedFailed,
  } = useMatchPrepCurrent({ enabled: true });
  const { mutateAsync: saveVibePrefs, isPending: isSaving } = useSaveVibePrefs();
  const [error, setError] = useState<string | null>(null);

  useHydrateVibeDraft({
    draft,
    options,
    saved,
    savedReady,
    savedFailed,
    onDraftChange,
  });

  const selected = useMemo(
    () => ({
      moods: new Set(draft?.moodIds ?? []),
      lookingFor: new Set(draft?.lookingForIds ?? []),
      interests: new Set(draft?.interestIds ?? []),
    }),
    [draft],
  );

  const isLoadingPrefs = isLoading || !draft || (!savedReady && !savedFailed);

  const handleContinue = useCallback(async () => {
    if (!draft) {
      return;
    }

    setError(null);

    if (saved && vibeDraftsEqual(draft, vibeDraftFromSaved(saved))) {
      onForward?.();
      return;
    }

    const validationError = validateVibeDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await saveVibePrefs(draft);
      onForward?.();
    } catch (cause) {
      setError(getApiErrorMessage(cause, GUEST_TRIAL_PREFS.saveError));
    }
  }, [draft, onForward, saveVibePrefs, saved]);

  const footer = (
    <div className="max-w-md">
      <TryContinueButton
        type="button"
        size="default"
        fullWidth
        className="h-9 text-sm"
        disabled={isLoadingPrefs || isSaving || !options}
        onClick={() => void handleContinue()}
      >
        {isSaving ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {GUEST_TRIAL_PREFS.saving}
          </>
        ) : (
          GUEST_TRIAL_NAV.continue
        )}
      </TryContinueButton>
    </div>
  );

  return (
    <TryStepFrame
      title={GUEST_TRIAL_PREFS.title}
      description={GUEST_TRIAL_PREFS.description}
      footer={footer}
      back={back}
      backLabel="Your name"
      width="wide"
    >
      <div className="space-y-6 lg:space-y-8">
        {isLoadingPrefs && (
          <div className="flex items-center justify-center gap-1.5 py-16 text-sm text-muted-foreground sm:py-24">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {GUEST_TRIAL_PREFS.loading}
          </div>
        )}

        {isError && !isLoadingPrefs && (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            {GUEST_TRIAL_PREFS.loadError}{" "}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => void refetch()}
            >
              {GUEST_TRIAL_NAV.tryAgain}
            </button>
          </div>
        )}

        {options && draft && !isLoadingPrefs && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
              <TrySection label={GUEST_TRIAL_PREFS.mood}>
                <TryChipList
                  rows={options.moods}
                  selected={selected.moods}
                  onToggle={(id) => onDraftChange(toggleVibeDraft(draft, "moodIds", id))}
                />
              </TrySection>

              <TrySection label={GUEST_TRIAL_PREFS.lookingFor}>
                <TryChipList
                  rows={options.lookingFor}
                  selected={selected.lookingFor}
                  onToggle={(id) => onDraftChange(toggleVibeDraft(draft, "lookingForIds", id))}
                />
              </TrySection>
            </div>

            <TrySection
              label={GUEST_TRIAL_PREFS.interests}
              hint={
                <p className="text-sm text-muted-foreground">
                  {GUEST_TRIAL_PREFS.interestsHint(
                    selected.interests.size,
                    VIBE_PREFS_MIN_INTERESTS,
                    VIBE_PREFS_MAX_INTERESTS,
                  )}
                </p>
              }
            >
              <TryChipList
                rows={options.interests}
                selected={selected.interests}
                onToggle={(id) => onDraftChange(toggleVibeDraft(draft, "interestIds", id))}
              />
            </TrySection>
          </>
        )}

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </TryStepFrame>
  );
}
