"use client";

import { Loader2, Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SessionActivitiesBlock } from "@/features/matching/components/match-prep-dialog-parts";
import {
  buildActivitySelectionsPayload,
  toggleSessionActivityId,
  validateSessionActivitySelections,
} from "@/features/matching/utils/session-activities.utils";
import { useMatchPrepCurrent, useMatchPrepOptions } from "@/features/profile-setup/api";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";

import { useEnableOpenToConnect } from "../api/open-to-connect.mutations";
import { useOpenToConnectMe } from "../api/open-to-connect.queries";

const MAX_SESSION_ACTIVITIES = 3;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OpenToConnectPostNoMatchDialog({ open, onOpenChange }: Props) {
  const { data: me } = useOpenToConnectMe(open);
  const { data: matchPrep, isLoading: matchPrepLoading } = useMatchPrepCurrent({ enabled: open });
  const { data: options, isLoading: optionsLoading } = useMatchPrepOptions({ enabled: open });
  const enable = useEnableOpenToConnect();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activityDetails, setActivityDetails] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const activityRows = options?.activities ?? [];
  const loading = matchPrepLoading || optionsLoading;

  useEffect(() => {
    if (!open) return;
    if (me?.openToConnect) {
      onOpenChange(false);
      return;
    }
    if (!matchPrep) return;

    const ids = new Set(matchPrep.activitySelections.map((row) => row.activityId));
    const details: Record<string, string> = {};
    for (const row of matchPrep.activitySelections) {
      if (row.detail?.trim()) {
        details[row.activityId] = row.detail.trim();
      }
    }
    setSelectedIds(ids);
    setActivityDetails(details);
    setValidationError(null);
  }, [open, matchPrep, me?.openToConnect, onOpenChange]);

  const handleToggleActivity = useCallback((id: string) => {
    setSelectedIds((prev) => toggleSessionActivityId(prev, id, MAX_SESSION_ACTIVITIES));
    setValidationError(null);
  }, []);

  const handleDetailChange = useCallback((id: string, value: string) => {
    setActivityDetails((prev) => ({ ...prev, [id]: value }));
    setValidationError(null);
  }, []);

  const handleStayOpen = async () => {
    const error = validateSessionActivitySelections(activityRows, selectedIds, activityDetails, {
      maxCount: MAX_SESSION_ACTIVITIES,
    });
    if (error) {
      setValidationError(error);
      return;
    }

    const activitySelections = buildActivitySelectionsPayload(selectedIds, activityDetails);
    try {
      await enable.mutateAsync({
        source: "post_no_match",
        activitySelections,
      });
      onOpenChange(false);
    } catch {
      // toast handled in mutation
    }
  };

  const busy = enable.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
              <Radio className="size-[18px]" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>{OPEN_TO_CONNECT.postNoMatch.title}</DialogTitle>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {OPEN_TO_CONNECT.enable.recommendedBadge}
                </span>
              </div>
              <DialogDescription>{OPEN_TO_CONNECT.postNoMatch.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(55vh,380px)] space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : activityRows.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">{OPEN_TO_CONNECT.postNoMatch.prefillHint}</p>
              <SessionActivitiesBlock
                rows={activityRows}
                selectedIds={selectedIds}
                activityDetails={activityDetails}
                onToggle={handleToggleActivity}
                onDetailChange={handleDetailChange}
                required={false}
              />
              {validationError ? (
                <p className="text-sm text-destructive">{validationError}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{OPEN_TO_CONNECT.postNoMatch.noActivities}</p>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {OPEN_TO_CONNECT.postNoMatch.notNow}
          </Button>
          <Button type="button" onClick={() => void handleStayOpen()} disabled={busy || loading}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {OPEN_TO_CONNECT.postNoMatch.enabling}
              </>
            ) : (
              OPEN_TO_CONNECT.postNoMatch.stayOpen
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
