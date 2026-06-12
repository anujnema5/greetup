"use client";

import { useEffect } from "react";

import type {
  MatchPrepCurrentData,
  MatchPrepOptionsData,
} from "@/features/profile-setup/types/profile-setup-api.types";
import { deriveInitialFormState } from "@/features/matching/utils/match-prep-dialog.utils";

import { vibeDraftFromFormState } from "../lib/vibe-prefs-draft";
import type { VibePrefsDraft } from "../types/guest-try.types";

type HydrateVibeDraftArgs = {
  draft: VibePrefsDraft | null;
  options: MatchPrepOptionsData | undefined;
  saved: MatchPrepCurrentData | undefined;
  savedReady: boolean;
  savedFailed: boolean;
  onDraftChange: (draft: VibePrefsDraft) => void;
};

/** Loads saved vibe prefs into the parent draft once, without overwriting user edits. */
export function useHydrateVibeDraft({
  draft,
  options,
  saved,
  savedReady,
  savedFailed,
  onDraftChange,
}: HydrateVibeDraftArgs) {
  useEffect(() => {
    if (draft || !options || (!savedReady && !savedFailed)) {
      return;
    }

    const initial = deriveInitialFormState(options, savedFailed ? undefined : saved);
    onDraftChange(vibeDraftFromFormState(initial));
  }, [draft, onDraftChange, options, saved, savedFailed, savedReady]);
}
