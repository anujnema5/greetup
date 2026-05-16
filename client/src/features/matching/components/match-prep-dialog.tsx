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
import {
  useGetMatchPrepCurrentQuery,
  useGetMatchPrepOptionsQuery,
  useSaveMatchPrepMutation,
} from "@/features/profile-setup/components/profile-setup-api";
import type {
  MatchPrepDialogProps,
  ConnectionPreferenceValue,
  DistancePreferenceValue,
} from "../types/match-prep.types";
import { useMatchPrepLocation } from "../hooks/use-match-prep-location";
import {
  deriveInitialFormState,
  dialogShellClass,
  scrollAnchoredSectionIntoView,
  scrollBodyClass,
  sectionLabelClass,
  toggleIdInSet,
} from "../utils/match-prep-dialog.utils";
import { MatchPrepLocationSection } from "./match-prep-location-section";

import {
  ConnectionPreferenceRow,
  InterestsBlock,
  OptionChipList,
} from "./match-prep-dialog-parts";

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
  const [locationPreferenceEnabled, setLocationPreferenceEnabled] = useState(false);
  const [distancePreference, setDistancePreference] =
    useState<DistancePreferenceValue>("random");
  const {
    selectedLocation,
    setSelectedLocation,
    manualLocationText,
    handleManualLocationInputChange,
    handleManualLocationInputFocus,
    locationSuggestions,
    isFetchingSuggestions,
    suggestionsOpen,
    isLocatingCurrent,
    isResolvingManualLocation,
    locationError,
    resetLocationUiState,
    handleSelectLocationSuggestion,
    handleUseCurrentLocation,
    handleUseTypedLocation,
  } = useMatchPrepLocation();
  const [sessionGoal, setSessionGoal] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [interestsOpen, setInterestsOpen] = useState(false);

  const seededRef = useRef(false);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const interestsSectionRef = useRef<HTMLDivElement>(null);

  const resetDialogUiState = useCallback(() => {
    seededRef.current = false;
    setLocalError(null);
    setInterestsOpen(false);
    resetLocationUiState();
  }, [resetLocationUiState]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetDialogUiState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetDialogUiState],
  );

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
    if (!open) return;
    if (!data || seededRef.current) return;
    if (!savedReady && !savedError) return;

    seededRef.current = true;
    const next = deriveInitialFormState(data, saved);
    /* eslint-disable react-hooks/set-state-in-effect */
    setMoods(next.moods);
    setLookingFor(next.lookingFor);
    setInterests(next.interests);
    setConnectionPreference(next.connectionPreference);
    setLocationPreferenceEnabled(next.locationPreferenceEnabled);
    setDistancePreference(next.distancePreference);
    setSelectedLocation(next.location);
    setSessionGoal(next.sessionGoal);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, data, saved, savedReady, savedError, setSelectedLocation]);

  const handleSkip = useCallback(() => {
    setLocalError(null);
    handleDialogOpenChange(false);
    onStartSearch();
  }, [handleDialogOpenChange, onStartSearch]);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    if (moods.size === 0 || lookingFor.size === 0 || interests.size === 0) {
      setLocalError("Choose at least one mood, one “looking for” option, and one interest.");
      return;
    }
    if (
      locationPreferenceEnabled &&
      (!selectedLocation ||
        typeof selectedLocation.latitude !== "number" ||
        typeof selectedLocation.longitude !== "number")
    ) {
      setLocalError("Select a location (with coordinates) to enable location-based matching.");
      return;
    }
    try {
      await saveMatchPrep({
        moodIds: [...moods],
        lookingForIds: [...lookingFor],
        interestIds: [...interests],
        connectionPreference,
        locationPreferenceEnabled,
        distancePreference: locationPreferenceEnabled ? distancePreference : "random",
        location: selectedLocation
          ? {
              country: selectedLocation.country,
              countryCode: selectedLocation.countryCode,
              region: selectedLocation.region,
              regionCode: selectedLocation.regionCode,
              city: selectedLocation.city,
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              source: selectedLocation.source,
            }
          : undefined,
        sessionGoal: sessionGoal.trim() || null,
        clientSessionId: clientSessionId ?? undefined,
      }).unwrap();
      handleDialogOpenChange(false);
      if (!isEdit) onStartSearch();
    } catch {
      setLocalError(isEdit ? "Could not save. Try again." : "Could not save. Try again or skip for now.");
    }
  }, [
    moods,
    lookingFor,
    interests,
    connectionPreference,
    locationPreferenceEnabled,
    distancePreference,
    selectedLocation,
    sessionGoal,
    clientSessionId,
    isEdit,
    saveMatchPrep,
    handleDialogOpenChange,
    onStartSearch,
  ]);

  const busy = isSaving;
  const prefsLoading = isLoading || (open && !savedReady && !savedError);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
              <div className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
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

                <MatchPrepLocationSection
                  locationPreferenceEnabled={locationPreferenceEnabled}
                  onLocationPreferenceEnabledChange={setLocationPreferenceEnabled}
                  distancePreference={distancePreference}
                  onDistancePreferenceChange={setDistancePreference}
                  selectedLocation={selectedLocation}
                  manualLocationText={manualLocationText}
                  onManualLocationTextChange={handleManualLocationInputChange}
                  onManualLocationTextFocus={handleManualLocationInputFocus}
                  locationSuggestions={locationSuggestions}
                  isFetchingSuggestions={isFetchingSuggestions}
                  suggestionsOpen={suggestionsOpen}
                  onSelectLocationSuggestion={handleSelectLocationSuggestion}
                  onUseCurrentLocation={() => void handleUseCurrentLocation()}
                  onUseTypedLocation={() => void handleUseTypedLocation()}
                  busy={busy}
                  isLocatingCurrent={isLocatingCurrent}
                  isResolvingManualLocation={isResolvingManualLocation}
                  locationError={locationError}
                />

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

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border/40 bg-card/90 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:flex-row sm:justify-end sm:gap-2 sm:px-6 sm:pb-3">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs font-medium text-muted-foreground sm:w-auto"
                onClick={() => handleDialogOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-medium sm:w-auto"
                onClick={() => void handleSave()}
                disabled={prefsLoading || busy || !data}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Saving…
                  </span>
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
                size="sm"
                className="w-full text-xs font-medium text-muted-foreground sm:w-auto"
                onClick={() => void handleSkip()}
                disabled={busy}
              >
                Skip, just match
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-medium sm:w-auto"
                onClick={() => void handleSave()}
                disabled={prefsLoading || busy || !data}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Saving…
                  </span>
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
