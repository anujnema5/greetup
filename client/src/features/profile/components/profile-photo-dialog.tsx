"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  usePresignProfilePhotoMutation,
  useSaveProfileSetupMutation,
} from "@/features/profile-setup/components/profile-setup-api";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";

import { ProfileEditShell } from "./profile-edit-shell";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
const FILE_HINT = "JPEG, PNG, WebP";
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
  const rest = existing.slice(1).map((p, i) => ({
    url: p.url,
    order: i + 1,
  }));
  return [{ url: newUrl, order: 0 }, ...rest].slice(0, 6);
}

function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const d = (error as FetchBaseQueryError).data;
    if (d && typeof d === "object" && "message" in d && typeof (d as { message?: string }).message === "string") {
      return (d as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}

type ProfilePhotoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full list from GET /profile/me — used to keep secondary photo slots when updating the first. */
  existingPhotos: MyProfileResponse["photos"];
  onUploaded?: () => void;
};

const FILE_INPUT_ID = "profile-photo-file";

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  existingPhotos,
  onUploaded,
}: ProfilePhotoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [presign, { isLoading: isPresigning }] = usePresignProfilePhotoMutation();
  const [saveProfile, { isLoading: isSaving }] = useSaveProfileSetupMutation();
  const busy = isPresigning || isSaving;
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

    try {
      const pres = await presign({ contentType }).unwrap();
      const inner = pres.data;
      const put = await fetch(inner.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": inner.contentType },
        credentials: "omit",
      });
      if (!put.ok) {
        toast.error(`Upload failed (${put.status}). Check Spaces CORS and credentials.`);
        return;
      }

      const photos = buildPhotosPayload(inner.publicUrl, existingPhotos);
      await saveProfile({ step: 6, data: { photos } }).unwrap();
      toast.success("Profile photo updated");
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (e) {
      toast.error(rtkErrorMessage(e));
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        className="flex-1 rounded-xl"
        disabled={busy}
        onClick={() => handleClose(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="flex-1 rounded-xl gap-2"
        disabled={busy || !file}
        onClick={() => void handleUpload()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save photo
      </Button>
    </div>
  );

  return (
    <ProfileEditShell
      open={open}
      onOpenChange={handleClose}
      title="Profile photo"
      description="Upload a new picture. We’ll store it securely and show it on your profile."
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="mx-auto aspect-3/4 w-full max-w-64 overflow-hidden rounded-2xl border border-border bg-muted/20">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Profile preview" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No profile photo yet
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-photo-file">Image file</Label>
          <input
            ref={fileInputRef}
            id={FILE_INPUT_ID}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
              {file ? "Change photo" : "Upload from device"}
            </span>
            <span className="text-xs text-muted-foreground">{FILE_HINT}</span>
          </button>
        </div>
        {file ? (
          <p className="text-sm text-muted-foreground truncate" title={file.name}>
            Selected: {file.name}
          </p>
        ) : null}
      </div>
    </ProfileEditShell>
  );
}
