"use client";

import Link from "next/link";

import { PeerConnectionRequestActions } from "@/features/connections/components/peer-connection-request-actions";
import { OnlinePresenceDot } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { nameInitials } from "@/lib/utils/name-initials";
import { cn } from "@/lib/utils";

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
  outgoing: OutgoingState | undefined;
  connectBusy: boolean;
  withdrawBusy: boolean;
  onConnect: (e: React.MouseEvent) => void;
  onWithdraw: (e: React.MouseEvent, connectionId: string) => void;
};

export function ExploreSuggestedPersonRow({
  person,
  outgoing,
  connectBusy,
  withdrawBusy,
  onConnect,
  onWithdraw,
}: Props) {
  const label = suggestedPersonDisplayLabel(person);
  const href = suggestedPersonProfileHref(person.username);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors duration-150"
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "h-10 w-10 rounded-full bg-linear-to-br from-primary/70 to-primary flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden",
          )}
        >
          {person.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProfileImageUrl(person.image)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            nameInitials(label)
          )}
        </div>
        <OnlinePresenceDot
          isOnline={person.isOnline}
          size="md"
          borderClassName="border-card"
          className="absolute -bottom-0.5 -right-0.5"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{person.tagline}</p>
      </div>

      <div className="shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
        <PeerConnectionRequestActions
          outgoing={outgoing}
          connectBusy={connectBusy}
          withdrawBusy={withdrawBusy}
          onConnect={onConnect}
          onWithdraw={onWithdraw}
        />
      </div>
    </Link>
  );
}
