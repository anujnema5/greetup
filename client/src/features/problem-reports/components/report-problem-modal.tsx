"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, MessageSquareWarning, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useCreateProblemReport } from "../api/problem-reports.mutations";
import {
  isAllowedScreenshotType,
  useUploadReportScreenshot,
} from "../hooks/use-upload-report-screenshot";
import type { ReportProblemModalProps } from "../types/problem-reports.types";

const MAX_DESCRIPTION = 5000;

/** Best-effort client context — helps triage without asking the user. */
function captureMetadata() {
  if (typeof window === "undefined") return undefined;
  return {
    route: window.location.pathname,
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
  };
}

export function ReportProblemModal({
  open,
  onOpenChange,
  surface,
  roomId,
  contentClassName,
  overlayClassName,
}: ReportProblemModalProps) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createReport, isPending: isSubmitting } = useCreateProblemReport();
  const { uploadScreenshot, isUploading } = useUploadReportScreenshot();

  const busy = isSubmitting || isUploading;
  const canSubmit = description.trim().length > 0 && !busy;

  const reset = () => {
    setDescription("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return; // don't close mid-submit
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (picked && !isAllowedScreenshotType(picked.type)) {
      toast.error("Please choose a PNG, JPG, WEBP, or GIF image");
      e.target.value = "";
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const screenshotUrl = file ? await uploadScreenshot(file) : undefined;
      await createReport({
        surface,
        roomId,
        description: description.trim(),
        screenshotUrl,
        metadata: captureMetadata(),
      });
      toast.success("Thanks — your report was submitted");
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not submit your report"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("sm:max-w-100", contentClassName)}
        overlayClassName={overlayClassName}
        showCloseButton
      >
        {/* Header — icon + title + description */}
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
            <MessageSquareWarning className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
              Report a problem
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] leading-snug">
              Tell us what went wrong. A screenshot helps us fix it faster.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2.5">
            <Label htmlFor="report-description">What happened?</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Describe the problem you're facing…"
              autoFocus
              disabled={busy}
              className="max-h-48 resize-none overflow-y-auto"
            />
          </div>

          <div className="grid gap-2.5">
            <Label>
              Screenshot <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handlePickFile}
              disabled={busy}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={busy}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label="Remove screenshot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="w-full justify-start gap-2 rounded-xl text-muted-foreground"
              >
                <ImagePlus className="h-4 w-4" />
                Add a screenshot
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-3 text-[13px]"
              disabled={busy}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-2 text-[13px]" disabled={!canSubmit}>
              {busy ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  {isUploading ? "Uploading…" : "Submitting…"}
                </span>
              ) : (
                "Submit report"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
