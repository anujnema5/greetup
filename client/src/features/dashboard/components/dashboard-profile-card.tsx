"use client";

import Link from "next/link";
import { memo } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatProfileHandle } from "@/features/app-shell/lib/page-header-account";
import { useClientMounted } from "@/features/app-shell/hooks/use-client-mounted";
import { usePageHeaderAccount } from "@/features/app-shell/hooks/use-page-header-account";
import { useMyProfile } from "@/features/profile-setup/api";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";

import { useDashboardInsights } from "../hooks/use-dashboard-insights";

const PROFILE_COMPLETE_AT = 80;

function DashboardProfileCardInner() {
  const mounted = useClientMounted();
  const account = usePageHeaderAccount();
  const { data: profile } = useMyProfile();
  const { heroStats, isLoading } = useDashboardInsights();

  const handle = mounted ? formatProfileHandle(profile?.username) : null;
  const displayName = mounted ? account.displayName || "Your profile" : "Your profile";
  const profilePhoto = mounted ? profile?.photos?.[0]?.url?.trim() : undefined;
  const avatarSrc = profilePhoto ? getProfileImageUrl(profilePhoto) : account.avatarSrc;
  const completionRaw = heroStats.profileCompletion;
  const completion =
    completionRaw != null && Number.isFinite(completionRaw)
      ? Math.round(Math.min(100, Math.max(0, completionRaw)))
      : null;
  const isComplete = (completion ?? 0) >= PROFILE_COMPLETE_AT;

  return (
    <div>
      <Link href="/profile" className="group flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt=""
          className="size-12 shrink-0 rounded-full object-cover ring-2 ring-border transition-opacity group-hover:opacity-90"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          {handle ? (
            <p className="truncate text-xs text-muted-foreground">{handle}</p>
          ) : (
            <p className="flex items-center gap-0.5 text-xs font-medium text-primary">
              View profile
              <ChevronRight className="size-3.5 opacity-80" aria-hidden />
            </p>
          )}
        </div>
      </Link>

      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Profile strength</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              isComplete ? "text-success-foreground" : "text-foreground",
            )}
          >
            {isLoading ? "—" : completion != null ? `${completion}%` : "—"}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <ProgressBar
            value={completion ?? 0}
            max={100}
            aria-label="Profile completion"
            className={cn(
              "h-1.5 [&::-webkit-progress-bar]:bg-muted",
              isComplete
                ? "[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success"
                : "[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary",
            )}
          />
        </div>
      </div>

      {!isComplete && !isLoading ? (
        <Button asChild size="sm" variant="outline" className="mt-3 w-full rounded-full">
          <Link href="/profile">Complete your profile</Link>
        </Button>
      ) : null}
    </div>
  );
}

export const DashboardProfileCard = memo(DashboardProfileCardInner);
