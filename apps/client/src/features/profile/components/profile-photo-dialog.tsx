"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { Camera, ImageIcon, Loader2, RefreshCw, UserRound, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useEnsureProfilePhotoPublic,
  usePresignProfilePhoto,
  useSaveProfileSetup,
} from "@/features/profile-setup/api";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";
import { fetchAvatarFile } from "@/lib/avatar";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
const MAX_SIZE_ERROR = "Image must be 5 MB or smaller.";
const INVALID_TYPE_ERROR = "Use JPEG, PNG, or WebP.";

function normalizeContentType(file: File): string | null {
  if (file.type && ALLOWED_CONTENT_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const contentTypeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return ext && contentTypeByExtension[ext] ? contentTypeByExtension[ext]! : null;
}

function buildPhotosPayload(
  newUrl: string,
  existing: MyProfileResponse["photos"]
): Array<{ url: string; order: number }> {
  const rest = existing.slice(1).map((p, i) => ({ url: p.url, order: i + 1 }));
  return [{ url: newUrl, order: 0 }, ...rest].slice(0, 6);
}

type ProfilePhotoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPhotos: MyProfileResponse["photos"];
  onUploaded?: () => void;
};

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  existingPhotos,
  onUploaded,
}: ProfilePhotoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { mutateAsync: presign } = usePresignProfilePhoto();
  const { mutateAsync: ensurePublic } = useEnsureProfilePhotoPublic();
  const { mutateAsync: saveProfile } = useSaveProfileSetup();

  const busy = isUploading || isGenerating;
  const currentPhotoUrl = existingPhotos[0]?.url ?? "";
  const selectedPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const previewUrl = selectedPreviewUrl ?? currentPhotoUrl;
  const hasPreview = Boolean(previewUrl);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  const reset = () => {
    setFile(null);
    setIsGenerating(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(MAX_SIZE_ERROR);
      e.target.value = "";
      setFile(null);
      return;
    }
    const ct = normalizeContentType(f);
    if (!ct) {
      toast.error(INVALID_TYPE_ERROR);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a photo first.");
      return;
    }
    const contentType = normalizeContentType(file);
    if (!contentType) {
      toast.error("Could not read image type.");
      return;
    }
    setIsUploading(true);
    try {
      const inner = await presign({ contentType, contentLength: file.size });
      const putHeaders =
        inner.uploadHeaders ?? ({ "Content-Type": inner.contentType } as Record<string, string>);
      const put = await fetch(inner.uploadUrl, {
        method: "PUT",
        body: file,
        headers: putHeaders,
        credentials: "omit",
      });
      if (!put.ok) {
        toast.error(`Upload failed (${put.status}). Check Spaces CORS and credentials.`);
        return;
      }
      try {
        await ensurePublic({ publicUrl: inner.publicUrl });
      } catch {
        toast.warning("Photo uploaded; fixing public access… saving profile will retry.");
      }
      const photos = buildPhotosPayload(inner.publicUrl, existingPhotos);
      await saveProfile({ step: 5, data: { photos } });
      toast.success("Profile photo updated");
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Something went wrong"));
    } finally {
      setIsUploading(false);
    }
  };

  const onGenerateAvatar = async () => {
    if (busy) return;
    setIsGenerating(true);
    try {
      const { file: generated } = await fetchAvatarFile();
      setFile(generated);
    } catch {
      toast.error("Could not generate an avatar. Try uploading instead.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[380px]" showCloseButton>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
              Profile photo
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] leading-snug">
              Upload a photo or generate a character avatar.
            </DialogDescription>
          </div>
        </div>

        <div className="flex justify-center py-1">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30 transition-colors">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
                <UserRound className="h-10 w-10" aria-hidden />
                <span className="text-[10px]">No photo yet</span>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <Loader2 className="h-6 w-6 animate-spin text-foreground" aria-hidden />
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={onFileChange}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Upload photo
          </button>
          <button
            type="button"
            onClick={() => void onGenerateAvatar()}
            disabled={busy}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
            ) : hasPreview ? (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            ) : (
              <Wand2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            )}
            {isGenerating
              ? hasPreview
                ? "Regenerating…"
                : "Generating…"
              : hasPreview
                ? "Regenerate"
                : "Generate avatar"}
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-3 rounded-xl"
            disabled={busy}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-2 rounded-xl gap-2"
            disabled={busy || !file}
            onClick={() => void handleUpload()}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save photo
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
