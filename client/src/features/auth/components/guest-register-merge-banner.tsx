"use client";

import { AlertCircle, Sparkles } from "lucide-react";

import type { SignupMergeContext } from "@/features/guest-try/api/guest-try.api";
import { GUEST_TRIAL_REGISTER } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

type GuestRegisterMergeBannerProps = {
  fromGuestIntent: boolean;
  signupContext: SignupMergeContext | undefined;
  displayName?: string | null;
  isLoading?: boolean;
};

export function GuestRegisterMergeBanner({
  fromGuestIntent,
  signupContext,
  displayName = null,
  isLoading = false,
}: GuestRegisterMergeBannerProps) {
  if (isLoading) {
    return (
      <div
        className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40"
        aria-hidden
      />
    );
  }

  if (fromGuestIntent && signupContext?.mergeAvailable) {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-3 text-sm text-foreground",
        )}
        role="status"
      >
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>{GUEST_TRIAL_REGISTER.mergeBanner(displayName)}</p>
      </div>
    );
  }

  if (fromGuestIntent && signupContext && !signupContext.mergeAvailable) {
    return (
      <div
        className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-foreground"
        role="status"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p>{GUEST_TRIAL_REGISTER.noSessionOnDevice}</p>
      </div>
    );
  }

  return null;
}
