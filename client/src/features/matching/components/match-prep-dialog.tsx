"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetMatchPrepCurrentQuery,
  useGetMatchPrepOptionsQuery,
  useSaveMatchPrepMutation,
} from "@/features/profile-setup/components/profile-setup-api";
import type {
  MatchPrepCurrentData,
  MatchPrepOptionsData,
} from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";

import {
  ConnectionPreferenceRow,
  InterestsBlock,
  OptionChipList,
  type ConnectionPreferenceValue,
} from "./match-prep-dialog-parts";

// --- props ---

export type MatchPrepDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartSearch: () => void;
  clientSessionId: string | null;
  mode?: "match_flow" | "edit";
};

// --- layout (same idea as Start a circle: flex shell + scrollable body) ---

const dialogShellClass = cn(
  "flex! min-h-0 max-h-[min(92vh,760px)] flex-col! gap-0! overflow-hidden",
  "rounded-2xl border-border bg-card p-0 shadow-xl sm:max-w-lg",
);

const scrollBodyClass = cn(
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 sm:px-6",
  "[overflow-anchor:none] [scrollbar-gutter:stable]",
  "pr-4 sm:pr-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
);

const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

// --- small helpers (dialog-only) ---

function toggleIdInSet(id: string, prev: Set<string>): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Mirrors Start a circle “More options” scroll-into-view behavior. */
function scrollAnchoredSectionIntoView(
  scrollEl: HTMLElement,
  anchor: HTMLElement,
  pad = 12,
): void {
  const s = scrollEl.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  if (a.bottom > s.bottom - pad) {
    scrollEl.scrollBy({ top: a.bottom - s.bottom + pad, behavior: "smooth" });
  } else if (a.top < s.top + pad) {
    scrollEl.scrollBy({ top: a.top - s.top - pad, behavior: "smooth" });
  }
}

function deriveInitialFormState(
  options: MatchPrepOptionsData,
  saved: MatchPrepCurrentData | undefined,
): {
  moods: Set<string>;
  lookingFor: Set<string>;
  interests: Set<string>;
  connectionPreference: ConnectionPreferenceValue;
  sessionGoal: string;
} {
  const moodIds =
    saved && saved.moodIds.length > 0
      ? saved.moodIds
      : options.moods[0]?.id
        ? [options.moods[0].id]
        : [];
  const lookingForIds =
    saved && saved.lookingForIds.length > 0
      ? saved.lookingForIds
      : options.lookingFor[0]?.id
        ? [options.lookingFor[0].id]
        : [];
  const interestIds =
    saved && saved.interestIds.length > 0
      ? saved.interestIds
      : options.interests[0]?.id
        ? [options.interests[0].id]
        : [];

  return {
    moods: new Set(moodIds),
    lookingFor: new Set(lookingForIds),
    interests: new Set(interestIds),
    connectionPreference: saved?.connectionPreference ?? "open_to_anyone",
    sessionGoal: saved?.sessionGoal?.trim() ? saved.sessionGoal : "",
  };
}

// --- dialog ---

export function MatchPrepDialog({
  open,
  onOpenChange,
  onStartSearch,
  clientSessionId,
  mode = "match_flow",
}: MatchPrepDialogProps) {
  const isEdit = mode === "edit";

  const { data, isLoading, isError, refetch } = useGetMatchPrepOptionsQuery(undefined, {
    skip: !open,
  });
  const {
    data: saved,
    isSuccess: savedReady,
    isError: savedError,
  } = useGetMatchPrepCurrentQuery(undefined, {
    skip: !open,
  });

  const [saveMatchPrep, { isLoading: isSaving }] = useSaveMatchPrepMutation();

  const [moods, setMoods] = useState<Set<string>>(new Set());
  const [lookingFor, setLookingFor] = useState<Set<string>>(new Set());
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [connectionPreference, setConnectionPreference] =
    useState<ConnectionPreferenceValue>("open_to_anyone");
  const [sessionGoal, setSessionGoal] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [interestsOpen, setInterestsOpen] = useState(false);

  const seededRef = useRef(false);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const interestsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interestsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollEl = formScrollRef.current;
        const anchor = interestsSectionRef.current;
        if (scrollEl && anchor) scrollAnchoredSectionIntoView(scrollEl, anchor);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interestsOpen]);

  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      setLocalError(null);
      setInterestsOpen(false);
      return;
    }
    if (!data || seededRef.current) return;
    if (!savedReady && !savedError) return;

    seededRef.current = true;
    const next = deriveInitialFormState(data, saved);
    setMoods(next.moods);
    setLookingFor(next.lookingFor);
    setInterests(next.interests);
    setConnectionPreference(next.connectionPreference);
    setSessionGoal(next.sessionGoal);
  }, [open, data, saved, savedReady, savedError]);

  const handleSkip = useCallback(() => {
    setLocalError(null);
    onOpenChange(false);
    onStartSearch();
  }, [onOpenChange, onStartSearch]);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    if (moods.size === 0 || lookingFor.size === 0 || interests.size === 0) {
      setLocalError("Choose at least one mood, one “looking for” option, and one interest.");
      return;
    }
    try {
      await saveMatchPrep({
        moodIds: [...moods],
        lookingForIds: [...lookingFor],
        interestIds: [...interests],
        connectionPreference,
        sessionGoal: sessionGoal.trim() || null,
        clientSessionId: clientSessionId ?? undefined,
      }).unwrap();
      onOpenChange(false);
      if (!isEdit) onStartSearch();
    } catch {
      setLocalError(isEdit ? "Could not save. Try again." : "Could not save. Try again or skip for now.");
    }
  }, [
    moods,
    lookingFor,
    interests,
    connectionPreference,
    sessionGoal,
    clientSessionId,
    isEdit,
    saveMatchPrep,
    onOpenChange,
    onStartSearch,
  ]);

  const busy = isSaving;
  const prefsLoading = isLoading || (open && !savedReady && !savedError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className={dialogShellClass}>
        <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6 sm:pb-2">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-primary">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isEdit ? "Match preferences" : "Before you match"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {isEdit
                ? "Adjust how you show up for your next matches."
                : "Share your mood and what you want—then we’ll find someone who fits."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div ref={formScrollRef} className={scrollBodyClass}>
          <div className="space-y-5 pt-1">
            {prefsLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </div>
            )}

            {isError && !prefsLoading && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Could not load options.{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => void refetch()}
                >
                  Retry
                </button>
              </div>
            )}

            {data && !prefsLoading && (
              <>
                <section className="space-y-2 py-1">
                  <p className={sectionLabelClass}>Mood right now</p>
                  <OptionChipList
                    rows={data.moods}
                    selected={moods}
                    onToggle={(id) => setMoods((p) => toggleIdInSet(id, p))}
                  />
                </section>

                <section className="space-y-2 py-1">
                  <p className={sectionLabelClass}>Looking for</p>
                  <OptionChipList
                    rows={data.lookingFor}
                    selected={lookingFor}
                    onToggle={(id) => setLookingFor((p) => toggleIdInSet(id, p))}
                  />
                </section>

                <section className="space-y-2">
                  <p className={sectionLabelClass}>Who should we prioritize?</p>
                  <ConnectionPreferenceRow
                    value={connectionPreference}
                    onChange={setConnectionPreference}
                  />
                </section>

                <InterestsBlock
                  sectionRef={interestsSectionRef}
                  open={interestsOpen}
                  onToggleOpen={() => setInterestsOpen((o) => !o)}
                  rows={data.interests}
                  selected={interests}
                  onToggleOption={(id) => setInterests((p) => toggleIdInSet(id, p))}
                />

                {/* <section className="flex flex-col space-y-2">
                  <label htmlFor="session-goal" className={sectionLabelClass}>
                    Optional note / specific ask
                  </label>
                  <Textarea
                    id="session-goal"
                    placeholder="e.g. Want to talk to an artist, startup founder, or someone with a different perspective…"
                    value={sessionGoal}
                    onChange={(e) => setSessionGoal(e.target.value)}
                    className="min-h-[72px] resize-none rounded-xl text-sm"
                    maxLength={280}
                  />
                </section> */}
              </>
            )}
          </div>

          {localError && data && (
            <p className="pt-2 text-xs text-destructive" role="alert">
              {localError}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border/40 bg-card/90 px-5 py-4 backdrop-blur-sm sm:flex-row sm:justify-end sm:gap-2 sm:px-6">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => void handleSave()}
                disabled={prefsLoading || busy || !data}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground sm:w-auto"
                onClick={() => void handleSkip()}
                disabled={busy}
              >
                Skip, just match
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => void handleSave()}
                disabled={prefsLoading || busy || !data}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save & find match"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
