"use client";

import Link from "next/link";

import { PeerConnectionRequestActions } from "@/features/connections/components/peer-connection-request-actions";
import { OnlinePresenceDot } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { nameInitials } from "@/lib/utils/name-initials";
import { cn } from "@/lib/utils";

import { exploreAvatarClass } from "../lib/explore-display-utils";
import {
  suggestedPersonDisplayLabel,
  suggestedPersonProfileHref,
} from "../lib/explore-person-display";
import type { SuggestedPersonItem } from "../types/suggested-people.types";

type OutgoingState = {
  connectionId: string;
  status: "pending" | "accepted";
};

type Props = {
  person: SuggestedPersonItem;
  isOnline: boolean;
  outgoing: OutgoingState | undefined;
  connectBusy: boolean;
  withdrawBusy: boolean;
  onConnect: (e: React.MouseEvent) => void;
  onWithdraw: (e: React.MouseEvent, connectionId: string) => void;
};

export function ExploreSuggestedPersonCard({
  person,
  isOnline,
  outgoing,
  connectBusy,
  withdrawBusy,
  onConnect,
  onWithdraw,
}: Props) {
  const label = suggestedPersonDisplayLabel(person);
  const href = suggestedPersonProfileHref(person.username);
  const meta = [
    person.tagline,
    person.sharedInterestCount > 0
      ? `${person.sharedInterestCount} shared`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition-colors duration-150 hover:bg-muted/20">
      <Link href={href} className="relative shrink-0">
        <div
          className={cn(
            "flex size-10 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white",
            person.image ? "bg-muted" : exploreAvatarClass(person.userId),
          )}
        >
          {person.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProfileImageUrl(person.image)}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            nameInitials(label)
          )}
        </div>
        <OnlinePresenceDot
          isOnline={isOnline}
          size="sm"
          borderClassName="border-card"
          className="absolute -bottom-0.5 -right-0.5"
        />
      </Link>

      <Link href={href} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">@{person.username}</p>
        {meta ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/90">{meta}</p>
        ) : null}
      </Link>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <PeerConnectionRequestActions
          outgoing={outgoing}
          connectBusy={connectBusy}
          withdrawBusy={withdrawBusy}
          onConnect={onConnect}
          onWithdraw={onWithdraw}
        />
      </div>
    </article>
  );
}

export function ExploreSuggestedPersonCardSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-7 w-[68px] shrink-0 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
