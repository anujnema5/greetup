"use client";

import Link from "next/link";

import { OnlinePresenceDot } from "@/features/presence";
import { exploreAvatarClass } from "@/features/explore/lib/explore-display-utils";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";

import { openNowPersonLabel, openNowPersonProfileHref } from "../lib/open-now-display";
import type { OpenNowFeedItem } from "../types/open-to-connect.types";
import type { ConnectRequestItem } from "../types/connect-requests.types";
import { OpenNowActivityChips } from "./open-now-activity-chips";
import {
  openNowCompactHint,
  OpenNowPersonMeta,
} from "./open-now-person-card-parts";
import { OpenNowRequestActions } from "./open-now-request-actions";

type Props = {
  person: OpenNowFeedItem;
  variant?: "card" | "compact";
  pendingRequest?: ConnectRequestItem;
  showRequestAction?: boolean;
};

function OpenNowAvatar({
  person,
  label,
  size = "md",
  borderClassName = "border-card",
}: {
  person: OpenNowFeedItem;
  label: string;
  size?: "sm" | "md";
  borderClassName?: string;
}) {
  const dim = size === "sm" ? "size-8 text-[10px]" : "size-12 text-xs";
  return (
    <span className="relative shrink-0">
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-background",
          dim,
          person.image ? "bg-muted" : exploreAvatarClass(person.userId),
        )}
      >
        {person.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getProfileImageUrl(person.image)} alt="" className="size-full object-cover" />
        ) : (
          nameInitials(label)
        )}
      </span>
      <OnlinePresenceDot
        isOnline={person.isOnline}
        size="sm"
        borderClassName={borderClassName}
        className="absolute -bottom-0.5 -right-0.5"
      />
    </span>
  );
}

export function OpenNowPersonCard({
  person,
  variant = "card",
  pendingRequest,
  showRequestAction = false,
}: Props) {
  const label = openNowPersonLabel(person);
  const href = openNowPersonProfileHref(person.username);
  const compactHint = openNowCompactHint(person);

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-border/60 hover:bg-muted/50"
      >
        <OpenNowAvatar person={person} label={label} size="sm" borderClassName="border-background" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">{label}</span>
            <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
              Open
            </span>
          </span>
          {compactHint ? (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{compactHint}</span>
          ) : null}
        </span>
      </Link>
    );
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-colors duration-150 hover:border-border hover:bg-muted/20">
      <div className="relative bg-linear-to-br from-primary/6 via-transparent to-transparent px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-start gap-3">
          <Link href={href} className="shrink-0">
            <OpenNowAvatar person={person} label={label} />
          </Link>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <div className="min-w-0">
                <Link
                  href={href}
                  className="block truncate text-[15px] font-semibold leading-tight text-foreground hover:underline"
                >
                  {label}
                </Link>
                <p className="truncate text-[11px] text-muted-foreground">@{person.username}</p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {DASHBOARD_SECTIONS.openNow.badge}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-1.5">
        <OpenNowPersonMeta person={person} />

        {person.activities.length > 0 ? (
          <div className="mt-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              Up for
            </p>
            <OpenNowActivityChips activities={person.activities} />
          </div>
        ) : null}

        {showRequestAction ? (
          <div className="mt-3.5 border-t border-border/60 pt-2.5">
            <OpenNowRequestActions
              targetUserId={person.userId}
              pendingRequest={pendingRequest}
              fullWidth
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function OpenNowPersonCardSkeleton({ variant = "card" }: { variant?: "card" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
        <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-start gap-3">
          <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-3 px-3.5 pb-3.5 pt-1.5">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted/60" />
      </div>
    </div>
  );
}
