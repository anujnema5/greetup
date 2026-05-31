"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";
import { OnlinePresenceDot } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";

import {
  formatRecentMatchDate,
  profileAvatarGradientClass,
  recentMatchSecondaryLabel,
} from "../lib/profile-insights-display";
import type { ProfileRecentMatch } from "../types/profile-insights.types";
import { RecentMatchCallActions } from "./recent-match-call-actions";

type RecentMatchRowProps = {
  match: ProfileRecentMatch;
  isOnline?: boolean;
  onCall: (match: ProfileRecentMatch, mode: ConnectionCallMode) => void;
  onMessage: (match: ProfileRecentMatch) => void;
  isCalling?: boolean;
  isMessaging?: boolean;
  /** Stack action buttons below info — fits narrow sidebars. */
  actionsLayout?: "inline" | "stacked";
  className?: string;
};

export function RecentMatchRow({
  match,
  isOnline = false,
  onCall,
  onMessage,
  isCalling = false,
  isMessaging = false,
  actionsLayout = "inline",
  className,
}: RecentMatchRowProps) {
  const profileHref = match.username ? `/u/${encodeURIComponent(match.username)}` : null;
  const secondaryLabel = recentMatchSecondaryLabel(match);
  const matchedLabel = formatRecentMatchDate(match.matchedAt);

  const avatar = (
    <div className="relative shrink-0">
      {match.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getProfileImageUrl(match.image)}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-bold text-white",
            profileAvatarGradientClass(match.peerUserId),
          )}
        >
          {match.initials}
        </div>
      )}
      <OnlinePresenceDot
        isOnline={isOnline}
        size="md"
        borderClassName="border-card"
        className="absolute -bottom-0.5 -right-0.5"
      />
    </div>
  );

  const info = (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {profileHref ? (
          <Link
            href={profileHref}
            className="truncate text-[13px] font-semibold leading-tight text-foreground transition-colors hover:text-primary"
          >
            {match.displayName}
          </Link>
        ) : (
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {match.displayName}
          </p>
        )}
        {match.isConnected ? (
          <span className="shrink-0 rounded-full bg-emerald-500/12 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Connected
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-[12px] leading-snug text-muted-foreground">
        {secondaryLabel}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/75">
        {matchedLabel ? `Matched ${matchedLabel}` : null}
        {match.matchScore != null ? (
          <>
            {matchedLabel ? " · " : null}
            <span className="inline-flex items-center gap-0.5 text-primary">
              <Zap size={9} />
              {match.matchScore}%
            </span>
          </>
        ) : null}
      </p>
    </div>
  );

  const actions = (
    <RecentMatchCallActions
      match={match}
      isCalling={isCalling}
      isMessaging={isMessaging}
      onCall={onCall}
      onMessage={onMessage}
      variant="labeled"
      className={actionsLayout === "stacked" ? "w-full justify-end" : undefined}
    />
  );

  if (actionsLayout === "stacked") {
    return (
      <li
        className={cn(
          "flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5",
          className,
        )}
      >
        <div className="flex items-center gap-2.5">
          {profileHref ? (
            <Link
              href={profileHref}
              className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          {info}
        </div>
        {actions}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5",
        className,
      )}
    >
      {profileHref ? (
        <Link
          href={profileHref}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      {info}
      {actions}
    </li>
  );
}
