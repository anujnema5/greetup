"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { DashboardSectionHeader } from "@/features/dashboard/components/dashboard-section-header";
import { exploreAvatarClass } from "@/features/explore/lib/explore-display-utils";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";

import { useInboundConnectRequests } from "../api/connect-requests.queries";
import { useRespondConnectRequest } from "../api/connect-requests.mutations";
import { openNowPersonProfileHref } from "../lib/open-now-display";
import type { ConnectRequestItem } from "../types/connect-requests.types";

function InboundRequestRow({ item }: { item: ConnectRequestItem }) {
  const { mutate: respond, isPending, variables } = useRespondConnectRequest();
  const label = item.peer.displayName?.trim() || item.peer.name || item.peer.username;
  const href = openNowPersonProfileHref(item.peer.username);
  const busyId = isPending ? variables?.requestId : null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-start gap-2.5">
        <Link href={href} className="shrink-0">
          <span
            className={cn(
              "flex size-9 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white",
              item.peer.image ? "bg-muted" : exploreAvatarClass(item.peer.userId),
            )}
          >
            {item.peer.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getProfileImageUrl(item.peer.image)} alt="" className="size-full object-cover" />
            ) : (
              nameInitials(label)
            )}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block truncate text-xs font-semibold text-foreground hover:underline">
            {label}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">@{item.peer.username}</p>
          {item.message ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.message}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond({ requestId: item.id, accept: true })}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyId === item.id && variables?.accept ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : null}
          {busyId === item.id && variables?.accept
            ? OPEN_TO_CONNECT.inbound.accepting
            : OPEN_TO_CONNECT.inbound.accept}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond({ requestId: item.id, accept: false })}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyId === item.id && variables?.accept === false ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : null}
          {busyId === item.id && variables?.accept === false
            ? OPEN_TO_CONNECT.inbound.declining
            : OPEN_TO_CONNECT.inbound.decline}
        </button>
      </div>
    </div>
  );
}

export function OpenToConnectInboundSection() {
  const { data, isLoading } = useInboundConnectRequests();
  const items = data?.items ?? [];

  return (
    <section>
      <DashboardSectionHeader variant="panel" title={OPEN_TO_CONNECT.inbound.title} />
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {OPEN_TO_CONNECT.inbound.empty}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <InboundRequestRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
