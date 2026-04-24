"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Camera, ImageIcon, Loader2, UserRound, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useEnsureProfilePhotoPublicMutation,
  usePresignProfilePhotoMutation,
  useSaveProfileSetupMutation,
} from "@/features/profile-setup/components/profile-setup-api";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";

const DICEBEAR_PNG = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars-neutral/png?seed=${encodeURIComponent(seed)}&size=512`;

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

function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const d = (error as FetchBaseQueryError).data;
    if (
      d &&
      typeof d === "object" &&
      "message" in d &&
      typeof (d as { message?: string }).message === "string"
    ) {
      return (d as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}

function truncateFilename(name: string): string {
  return name.length > 30 ? name.slice(0, 30) + "…" : name;
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

  const [presign] = usePresignProfilePhotoMutation();
  const [ensurePublic] = useEnsureProfilePhotoPublicMutation();
  const [saveProfile] = useSaveProfileSetupMutation();

  const busy = isUploading || isGenerating;
  const currentPhotoUrl = existingPhotos[0]?.url ?? "";
  const selectedPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const previewUrl = selectedPreviewUrl ?? currentPhotoUrl;

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
      const pres = await presign({ contentType }).unwrap();
      const inner = pres.data;
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
        await ensurePublic({ publicUrl: inner.publicUrl }).unwrap();
      } catch {
        toast.warning("Photo uploaded; fixing public access… saving profile will retry.");
      }
      const photos = buildPhotosPayload(inner.publicUrl, existingPhotos);
      await saveProfile({ step: 5, data: { photos } }).unwrap();
      toast.success("Profile photo updated");
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (e) {
      toast.error(rtkErrorMessage(e));
    } finally {
      setIsUploading(false);
    }
  };

  const onGenerateAvatar = async () => {
    if (busy) return;
    setIsGenerating(true);
    try {
      const seed =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `avatar-${Date.now()}`;
      const res = await fetch(DICEBEAR_PNG(seed));
      if (!res.ok) {
        toast.error("Could not generate an avatar. Try uploading instead.");
        return;
      }
      const blob = await res.blob();
      const generated = new File([blob], `avatar-${seed.slice(0, 8)}.png`, { type: "image/png" });
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
            <Wand2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Generate avatar
          </button>
        </div>

        {file && !isGenerating ? (
          <p className="text-center text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Ready to save</span>
            {" · "}
            {truncateFilename(file.name)}
          </p>
        ) : null}

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
