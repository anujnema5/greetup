"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { Camera, ImageOff, Loader2, RefreshCw, UserRound, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FormDescription,
  FormLabel,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { fetchAvatarPng } from "@/lib/avatar";

import {
  useEnsureProfilePhotoPublic,
  usePresignProfilePhoto,
} from "../api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
const MAX_SIZE_ERROR = "Image must be 5 MB or smaller.";
const INVALID_TYPE_ERROR = "Use JPEG, PNG, or WebP.";

export type ProfileSetupPhotoItem = {
  id?: string;
  url: string;
  order?: number;
};

function normalizeContentType(file: File): string | null {
  if (file.type && ALLOWED_CONTENT_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return ext && byExt[ext] ? byExt[ext]! : null;
}

function mergePrimaryPhoto(
  publicUrl: string,
  existing: ProfileSetupPhotoItem[],
  max: number,
): ProfileSetupPhotoItem[] {
  const rest = existing.slice(1).map((p, i) => ({
    ...p,
    url: p.url,
    order: i + 1,
  }));
  return [{ url: publicUrl, order: 0 }, ...rest].slice(0, max);
}

type ProfileSetupPhotoFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  max?: number;
  value: ProfileSetupPhotoItem[];
  onChange: (next: ProfileSetupPhotoItem[]) => void;
  onBlur: () => void;
  disabled?: boolean;
};

export function ProfileSetupPhotoField({
  label,
  description,
  required,
  max = 6,
  value,
  onChange,
  onBlur,
  disabled,
}: ProfileSetupPhotoFieldProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<"upload" | "generate" | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const { mutateAsync: presign } = usePresignProfilePhoto();
  const { mutateAsync: ensurePublic } = useEnsureProfilePhotoPublic();
  const busy = pending !== null;

  const primary = value[0];
  const previewUrl = localPreview ?? primary?.url ?? "";
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const showImage = Boolean(previewUrl) && !imageLoadFailed;

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [previewUrl]);

  const uploadBlob = useCallback(
    async (blob: Blob, filename: string) => {
      const contentType = blob.type && ALLOWED_CONTENT_TYPES.has(blob.type)
        ? blob.type
        : "image/png";
      const file =
        blob instanceof File
          ? blob
          : new File([blob], filename, { type: contentType });

      const ct = normalizeContentType(file) ?? (contentType === "image/png" ? "image/png" : null);
      if (!ct) {
        toast.error(INVALID_TYPE_ERROR);
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(MAX_SIZE_ERROR);
        return;
      }

      const inner = await presign({ contentType: ct });
      const putHeaders =
        inner.uploadHeaders ?? ({ "Content-Type": inner.contentType } as Record<string, string>);
      const put = await fetch(inner.uploadUrl, {
        method: "PUT",
        body: file,
        headers: putHeaders,
        credentials: "omit",
      });
      if (!put.ok) {
        toast.error(`Upload failed (${put.status}). Try again.`);
        return;
      }

      try {
        await ensurePublic({ publicUrl: inner.publicUrl });
      } catch {
        toast.warning(
          "Photo uploaded, but it may not show until permissions update. Try saving this step or re-upload.",
        );
      }

      const next = mergePrimaryPhoto(inner.publicUrl, value, max);
      onChange(next);
      onBlur();
      setLocalPreview(null);
      toast.success("Photo added");
    },
    [ensurePublic, max, onBlur, onChange, presign, value],
  );

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || disabled || busy) return;
    if (f.size > MAX_BYTES) {
      toast.error(MAX_SIZE_ERROR);
      return;
    }
    const ct = normalizeContentType(f);
    if (!ct) {
      toast.error(INVALID_TYPE_ERROR);
      return;
    }
    setPending("upload");
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(f));
    try {
      await uploadBlob(f, f.name);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Something went wrong"));
      setLocalPreview(null);
    } finally {
      setPending(null);
    }
  };

  const onGenerateAvatar = async () => {
    if (disabled || busy) return;
    setPending("generate");
    try {
      const { blob, filename } = await fetchAvatarPng();
      await uploadBlob(blob, filename);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Could not generate an avatar. Try uploading instead."),
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <FormLabel className="text-xs font-semibold text-foreground sm:text-sm">
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </FormLabel>
        {description ? (
          <FormDescription className="mt-1 text-[11px] text-muted-foreground leading-snug sm:text-xs">
            {description}
          </FormDescription>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-lg border border-border bg-background p-3 sm:p-4 dark:border-white/11 dark:bg-white/[0.03]",
          "transition-colors hover:border-primary/25",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          {/* Preview — left, aligns with form controls like bio / inputs */}
          <div
            className={cn(
              "relative shrink-0 self-start overflow-hidden rounded-lg border border-border bg-muted/30 dark:border-white/11",
              "size-[120px] sm:size-[132px]",
            )}
          >
            {showImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImageLoadFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
                {previewUrl && imageLoadFailed ? (
                  <>
                    <ImageOff className="size-6 text-muted-foreground/70" aria-hidden />
                    <span className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                      Couldn’t load this image. Upload or generate a new one.
                    </span>
                  </>
                ) : (
                  <>
                    <UserRound className="size-7 text-muted-foreground/60" aria-hidden />
                    <span className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                      Your profile photo
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <p className="text-[11px] text-muted-foreground leading-snug sm:text-xs sm:leading-relaxed">
              JPEG, PNG, or WebP · up to 5&nbsp;MB. Or create a character avatar — same as a real upload.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              disabled={disabled || busy}
              onChange={(e) => void onFileChange(e)}
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full gap-1.5 border-border bg-background text-xs font-medium shadow-none hover:bg-muted/60 dark:border-white/12 dark:bg-white/[0.03]"
                disabled={disabled || busy}
                onClick={() => fileRef.current?.click()}
              >
                {pending === "upload" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                    Uploading…
                  </span>
                ) : (
                  <>
                    <Camera className="size-3.5 shrink-0" aria-hidden />
                    Upload a photo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-9 w-full gap-1.5 text-xs font-medium shadow-sm hover:opacity-95"
                disabled={disabled || busy}
                onClick={() => void onGenerateAvatar()}
              >
                {pending === "generate" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                    {showImage ? "Regenerating…" : "Generating…"}
                  </span>
                ) : showImage ? (
                  <>
                    <RefreshCw className="size-3.5 shrink-0 opacity-95" aria-hidden />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Wand2 className="size-3.5 shrink-0 opacity-95" aria-hidden />
                    Generate avatar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {value.length > 1 ? (
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          {value.length} photos — we’ll use the first as your main picture.
        </p>
      ) : null}
    </div>
  );
}
