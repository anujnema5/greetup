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
  OptionChipList,
  SessionActivitiesBlock,
} from "@/features/matching/components/match-prep-dialog-parts";
import {
  deriveInitialFormState,
  dialogSectionPxClass,
  dialogShellClass,
  scrollBodyClass,
  sectionLabelClass,
  toggleIdInSet,
} from "@/features/matching/utils/match-prep-dialog.utils";
import {
  buildActivitySelectionsPayload,
  toggleSessionActivityId,
  validateSessionActivitySelections,
} from "@/features/matching/utils/session-activities.utils";
import {
  useMatchPrepCurrent,
  useMatchPrepOptions,
  useSaveMatchPrep,
} from "@/features/profile-setup/api";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { cn } from "@/lib/utils";

import { useEnableOpenToConnect } from "../api/open-to-connect.mutations";
import { useOpenToConnectMe } from "../api/open-to-connect.queries";

const MAX_SESSION_ACTIVITIES = 3;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OpenToConnectEnableDialog({ open, onOpenChange }: Props) {
  const { data: me } = useOpenToConnectMe(open);
  const { data: options, isLoading: optionsLoading, isError: optionsError, refetch } =
    useMatchPrepOptions({ enabled: open });
  const {
    data: saved,
    isSuccess: savedReady,
    isError: savedError,
  } = useMatchPrepCurrent({ enabled: open });
  const saveMatchPrep = useSaveMatchPrep();
  const enable = useEnableOpenToConnect();

  const [headline, setHeadline] = useState("");
  const [lookingFor, setLookingFor] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activityDetails, setActivityDetails] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const seededRef = useRef(false);
  const formScrollRef = useRef<HTMLDivElement>(null);

  const activityRows = options?.activities ?? [];
  const prefsLoading = optionsLoading || (open && !savedReady && !savedError);
  const busy = saveMatchPrep.isPending || enable.isPending;

  const resetDialogUiState = useCallback(() => {
    seededRef.current = false;
    setValidationError(null);
  }, []);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetDialogUiState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetDialogUiState],
  );

  useEffect(() => {
    if (!open || !options || seededRef.current) return;
    if (!savedReady && !savedError) return;

    seededRef.current = true;
    const next = deriveInitialFormState(options, saved);
    /* eslint-disable react-hooks/set-state-in-effect */
    setHeadline(me?.headline ?? "");
    setSelectedIds(next.selectedActivityIds);
    setActivityDetails(next.activityDetails);
    setLookingFor(next.lookingFor);
    setValidationError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, options, saved, savedReady, savedError, me?.headline]);

  const handleToggleActivity = useCallback((id: string) => {
    setSelectedIds((prev) => toggleSessionActivityId(prev, id, MAX_SESSION_ACTIVITIES));
    setValidationError(null);
  }, []);

  const handleDetailChange = useCallback((id: string, value: string) => {
    setActivityDetails((prev) => ({ ...prev, [id]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = async () => {
    setValidationError(null);

    if (lookingFor.size === 0) {
      setValidationError("Choose at least one “looking for” option.");
      return;
    }

    const interestIds = saved?.interestIds ?? [];
    if (interestIds.length === 0) {
      setValidationError("Add interests in your profile or match preferences first.");
      return;
    }

    const moodIds =
      saved && saved.moodIds.length > 0
        ? saved.moodIds
        : options?.moods[0]?.id
          ? [options.moods[0].id]
          : [];
    if (moodIds.length === 0) {
      setValidationError("Could not load mood options. Try again.");
      return;
    }

    const activityError = validateSessionActivitySelections(activityRows, selectedIds, activityDetails, {
      maxCount: MAX_SESSION_ACTIVITIES,
    });
    if (activityError) {
      setValidationError(activityError);
      return;
    }

    const activitySelections = buildActivitySelectionsPayload(selectedIds, activityDetails);
    const matchIntent = saved?.matchIntent ?? "quick";

    try {
      await saveMatchPrep.mutateAsync({
        matchIntent,
        activitySelections,
        moodIds,
        lookingForIds: [...lookingFor],
        interestIds,
        connectionPreference: saved?.connectionPreference ?? "open_to_anyone",
        locationPreferenceEnabled: saved?.locationPreferenceEnabled ?? false,
        distancePreference: saved?.distancePreference ?? "random",
        location: saved?.location
          ? {
              country: saved.location.country,
              countryCode: saved.location.countryCode,
              region: saved.location.region,
              regionCode: saved.location.regionCode,
              city: saved.location.city,
              latitude: saved.location.latitude,
              longitude: saved.location.longitude,
            }
          : undefined,
        sessionGoal: null,
      });

      await enable.mutateAsync({
        headline: headline.trim() || null,
      });
      handleDialogOpenChange(false);
    } catch (err: unknown) {
      setValidationError(
        getApiErrorMessage(err, OPEN_TO_CONNECT.toast.enableFailed),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={dialogShellClass}>
        <div className={cn("shrink-0 border-b border-border py-4 pl-5 pr-10 sm:pl-6 sm:pr-12")}>
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{OPEN_TO_CONNECT.enable.dialogTitle}</DialogTitle>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {OPEN_TO_CONNECT.enable.recommendedBadge}
              </span>
            </div>
            <DialogDescription>{OPEN_TO_CONNECT.enable.dialogDescription}</DialogDescription>
          </DialogHeader>
        </div>

        <div ref={formScrollRef} className={cn(scrollBodyClass, "pb-5 sm:pb-6")}>
          {prefsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : optionsError ? (
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
          ) : options ? (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="otc-headline" className={sectionLabelClass}>
                  {OPEN_TO_CONNECT.enable.headlineLabel}
                </label>
                <input
                  id="otc-headline"
                  type="text"
                  maxLength={120}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={OPEN_TO_CONNECT.enable.headlinePlaceholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {activityRows.length > 0 ? (
                <SessionActivitiesBlock
                  rows={activityRows}
                  selectedIds={selectedIds}
                  activityDetails={activityDetails}
                  onToggle={handleToggleActivity}
                  onDetailChange={handleDetailChange}
                  required={false}
                />
              ) : null}

              <section className="space-y-2">
                <p className={sectionLabelClass}>Looking for</p>
                <OptionChipList
                  rows={options.lookingFor}
                  selected={lookingFor}
                  onToggle={(id) => setLookingFor((p) => toggleIdInSet(id, p))}
                />
              </section>

              {validationError ? (
                <p className="text-sm text-destructive" role="alert">
                  {validationError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter
          className={cn(
            "shrink-0 gap-2 border-t border-border bg-card/90 py-4",
            dialogSectionPxClass,
          )}
        >
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={busy || prefsLoading || !options}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {OPEN_TO_CONNECT.enable.enabling}
              </>
            ) : (
              OPEN_TO_CONNECT.enable.enable
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
