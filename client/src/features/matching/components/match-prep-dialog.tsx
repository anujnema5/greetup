"use client";

import { Loader2, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type MatchPrepDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after skip or save+match in match flow — starts 1:1 search */
  onStartSearch: () => void;
  /** Browser tab session id — used for first-run session tracking */
  clientSessionId: string | null;
  /**
   * `match_flow` — from Find Match: skip/dismiss does not mark prep done; only Save does.
   * `edit` — from dashboard: save only closes.
   */
  mode?: "match_flow" | "edit";
};

function toggleInSet(id: string, set: Set<string>): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

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
  const [connectionPreference, setConnectionPreference] = useState<
    "same_profession" | "different_profession" | "open_to_anyone"
  >("open_to_anyone");
  const [sessionGoal, setSessionGoal] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const seededRef = useRef(false);

  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      setLocalError(null);
      return;
    }
    if (!data || seededRef.current) return;
    if (!savedReady && !savedError) return;

    seededRef.current = true;
    const s = saved;
    if (s && s.moodIds.length > 0) {
      setMoods(new Set(s.moodIds));
    } else {
      const firstMood = data.moods[0]?.id;
      setMoods(firstMood ? new Set([firstMood]) : new Set());
    }
    if (s && s.lookingForIds.length > 0) {
      setLookingFor(new Set(s.lookingForIds));
    } else {
      const firstLf = data.lookingFor[0]?.id;
      setLookingFor(firstLf ? new Set([firstLf]) : new Set());
    }
    if (s?.connectionPreference) {
      setConnectionPreference(s.connectionPreference);
    } else {
      setConnectionPreference("open_to_anyone");
    }
    setSessionGoal(s?.sessionGoal?.trim() ? s.sessionGoal : "");
  }, [open, data, saved, savedReady, savedError]);

  /** Skip / close without saving — does not mark this tab session as “prep done”; next Find Match shows the dialog again. */
  const handleSkip = useCallback(() => {
    setLocalError(null);
    onOpenChange(false);
    onStartSearch();
  }, [onOpenChange, onStartSearch]);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    if (moods.size === 0 || lookingFor.size === 0) {
      setLocalError("Choose at least one mood and one “looking for” option.");
      return;
    }
    try {
      await saveMatchPrep({
        moodIds: [...moods],
        lookingForIds: [...lookingFor],
        connectionPreference,
        sessionGoal: sessionGoal.trim() || null,
        clientSessionId: clientSessionId ?? undefined,
      }).unwrap();
      onOpenChange(false);
      if (!isEdit) {
        onStartSearch();
      }
    } catch {
      setLocalError(isEdit ? "Could not save. Try again." : "Could not save. Try again or skip for now.");
    }
  }, [
    moods,
    lookingFor,
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
      <DialogContent
        showCloseButton
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card p-5 sm:p-6"
      >
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5 shrink-0" aria-hidden />
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {isEdit ? "Match preferences" : "Before you match"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {isEdit
              ? "Update mood, intent, and who to prioritize for your next matches. Saves to your profile and matching snapshot."
              : "Set your mood, what you want from the chat, and who to prioritize. This updates your current status and profile snapshot for the matching engine."}
          </DialogDescription>
        </DialogHeader>

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
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mood right now
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.moods.map((m) => {
                    const selected = moods.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMoods((prev) => toggleInSet(m.id, prev))}
                        title={m.description ?? undefined}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
                        )}
                      >
                        {m.displayName}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Looking for
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.lookingFor.map((l) => {
                    const selected = lookingFor.has(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLookingFor((prev) => toggleInSet(l.id, prev))}
                        title={l.description ?? undefined}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
                        )}
                      >
                        {l.displayName}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Who should we prioritize?
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "same_profession", label: "People in my profession" },
                    { id: "different_profession", label: "People from other professions" },
                    { id: "open_to_anyone", label: "Open to anyone" },
                  ].map((o) => {
                    const selected = connectionPreference === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          setConnectionPreference(
                            o.id as "same_profession" | "different_profession" | "open_to_anyone",
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <label
                  htmlFor="session-goal"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
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
              </section>
            </>
          )}
        </div>

        {localError && data && (
          <p className="text-xs text-destructive" role="alert">
            {localError}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
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
                className="w-full sm:w-auto text-muted-foreground"
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
