"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  useMatchPrepCurrent,
  useMatchPrepOptions,
  useSaveMatchPrep,
} from "@/features/profile-setup/api";
import { getApiErrorMessage } from "@/lib/api/fetch-client";

import type { MatchPrepDialogProps } from "../types/match-prep.types";
import { useMatchPrepLocation } from "../hooks/use-match-prep-location";
import {
  createMatchPrepFormSchema,
  EMPTY_MATCH_PREP_FORM_VALUES,
  type MatchPrepFormValues,
} from "../schemas/match-prep-form.schema";
import {
  deriveDefaultFormValues,
  dialogShellClass,
  scrollAnchoredSectionIntoView,
  scrollBodyClass,
} from "../utils/match-prep-dialog.utils";
import { MatchPrepFormBody } from "./match-prep-form-body";

export function MatchPrepDialog({
  open,
  onOpenChange,
  onStartSearch,
  clientSessionId,
  mode = "match_flow",
  initialMatchIntent = "quick",
}: MatchPrepDialogProps) {
  const isEdit = mode === "edit";

  const { data, isLoading, isError, refetch } = useMatchPrepOptions({
    enabled: open,
  });
  const {
    data: saved,
    isSuccess: savedReady,
    isError: savedError,
  } = useMatchPrepCurrent({
    enabled: open,
  });

  const { mutateAsync: saveMatchPrep, isPending: isSaving } = useSaveMatchPrep();

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

  const [interestsOpen, setInterestsOpen] = useState(false);

  const seededRef = useRef(false);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const interestsSectionRef = useRef<HTMLDivElement>(null);

  const schema = useMemo(
    () => createMatchPrepFormSchema(data?.activities ?? []),
    [data?.activities],
  );

  const form = useForm<MatchPrepFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_MATCH_PREP_FORM_VALUES,
    mode: "onSubmit",
  });

  const resetDialogUiState = useCallback(() => {
    seededRef.current = false;
    setInterestsOpen(false);
    form.clearErrors();
    form.reset(EMPTY_MATCH_PREP_FORM_VALUES);
    resetLocationUiState();
  }, [form, resetLocationUiState]);

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
    const defaults = deriveDefaultFormValues(data, saved, initialMatchIntent, isEdit);
    form.reset(defaults);
    setSelectedLocation(defaults.location);
  }, [
    open,
    data,
    saved,
    savedReady,
    savedError,
    setSelectedLocation,
    initialMatchIntent,
    isEdit,
    form,
  ]);

  useEffect(() => {
    if (!open) return;
    form.setValue("location", selectedLocation, { shouldDirty: true });
  }, [selectedLocation, form, open]);

  const handleSkip = useCallback(() => {
    form.clearErrors();
    handleDialogOpenChange(false);
    onStartSearch();
  }, [form, handleDialogOpenChange, onStartSearch]);

  const onSubmit = useCallback(
    async (values: MatchPrepFormValues, startMatch: boolean) => {
      form.clearErrors("root");
      try {
        await saveMatchPrep({
          matchIntent: values.matchIntent,
          activitySelections: values.activityIds.map((activityId) => ({
            activityId,
            detail: values.activityDetails[activityId]?.trim() || null,
          })),
          moodIds: values.moodIds,
          lookingForIds: values.lookingForIds,
          interestIds: values.interestIds,
          connectionPreference: values.connectionPreference,
          locationPreferenceEnabled: values.locationPreferenceEnabled,
          distancePreference: values.locationPreferenceEnabled
            ? values.distancePreference
            : "random",
          location: values.location
            ? {
                country: values.location.country,
                countryCode: values.location.countryCode,
                region: values.location.region,
                regionCode: values.location.regionCode,
                city: values.location.city,
                latitude: values.location.latitude,
                longitude: values.location.longitude,
                source: values.location.source,
              }
            : undefined,
          sessionGoal: values.sessionGoal.trim() || null,
          clientSessionId: clientSessionId ?? undefined,
        });
        handleDialogOpenChange(false);
        if (!isEdit || startMatch) onStartSearch();
      } catch (err: unknown) {
        const message = getApiErrorMessage(
          err,
          isEdit
            ? "Could not save preferences. Try again."
            : "Could not save preferences. Try again or skip for now.",
        );
        form.setError("root", { type: "server", message });
        toast.error(message);
      }
    },
    [
      form,
      saveMatchPrep,
      clientSessionId,
      handleDialogOpenChange,
      isEdit,
      onStartSearch,
    ],
  );

  const submit = useCallback(
    (startMatch: boolean) => {
      void form.handleSubmit((values) => onSubmit(values, startMatch))();
    },
    [form, onSubmit],
  );

  const busy = isSaving;
  const prefsLoading = isLoading || (open && !savedReady && !savedError);
  const matchIntent = form.watch("matchIntent");

  const rootError =
    typeof form.formState.errors.root?.message === "string"
      ? form.formState.errors.root.message
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent showCloseButton className={dialogShellClass}>
        <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6 sm:pb-2">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-tertiary-foreground">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isEdit ? "Match preferences" : "Before you match"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {isEdit
                ? "Adjust how you show up for your next matches."
                : "Share your mood and what you want, then we'll find someone who fits."}
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
              <Form {...form}>
                <form
                  id="match-prep-form"
                  onSubmit={form.handleSubmit((values) => onSubmit(values, true))}
                  className="contents"
                >
                  <MatchPrepFormBody
                    data={data}
                    interestsSectionRef={interestsSectionRef}
                    interestsOpen={interestsOpen}
                    onInterestsOpenChange={setInterestsOpen}
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
                </form>
              </Form>
            )}
          </div>

          {rootError && data && (
            <p className="pt-2 text-xs text-destructive" role="alert">
              {rootError}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border/40 bg-card/90 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:flex-row sm:justify-end sm:gap-2 sm:px-6 sm:pb-3">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="default"
                className="w-full sm:w-auto"
                onClick={() => handleDialogOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="default"
                className="w-full sm:w-auto"
                onClick={() => submit(false)}
                disabled={prefsLoading || busy || !data}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  "Save preferences"
                )}
              </Button>
              <Button
                type="button"
                size="default"
                className="w-full sm:w-auto"
                onClick={() => submit(true)}
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
          ) : (
            <>
              {matchIntent === "quick" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium sm:w-auto"
                  onClick={() => void handleSkip()}
                  disabled={busy}
                >
                  Skip, just match
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-medium sm:w-auto"
                onClick={() => submit(true)}
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
