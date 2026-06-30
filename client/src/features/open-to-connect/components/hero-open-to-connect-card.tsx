"use client";

import { Loader2, Radio } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OnlinePresenceDot } from "@/features/presence";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { useDisableOpenToConnect } from "../api/open-to-connect.mutations";
import { useOpenToConnectMe } from "../api/open-to-connect.queries";
import { OpenToConnectEnableDialog } from "./open-to-connect-enable-dialog";

type Props = {
  disabled?: boolean;
  variant?: "card" | "banner" | "inline";
};

export function HeroOpenToConnectCard({ disabled, variant = "card" }: Props) {
  const { data: me, isLoading } = useOpenToConnectMe();
  const disable = useDisableOpenToConnect();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOpen = me?.openToConnect === true;
  const pausedInRoom = me?.pausedForRoom === true;
  const isVisible = isOpen && !pausedInRoom && me?.visibleInDiscovery;
  const busy = disable.isPending;
  const isCompact = variant === "banner" || variant === "inline";

  const shellClass = isCompact
    ? "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5"
    : "flex w-full items-center gap-3 rounded-2xl p-3.5";

  const iconShellClass = isCompact ? "size-8 rounded-lg" : "size-10 rounded-xl";
  const iconClass = isCompact ? "size-4" : "size-[18px]";

  if (isLoading) {
    return (
      <div
        className={cn(shellClass, "border border-border/70 bg-card")}
        aria-hidden
      >
        <span className={cn("shrink-0 animate-pulse bg-muted", iconShellClass)} />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block h-3.5 w-32 animate-pulse rounded bg-muted" />
          {!isCompact ? (
            <span className="block h-3 w-48 animate-pulse rounded bg-muted" />
          ) : null}
        </span>
      </div>
    );
  }

  if (isOpen) {
    const subtitle = pausedInRoom
      ? OPEN_TO_CONNECT.enable.pausedInRoomSubtitle
      : me.headline?.trim() || OPEN_TO_CONNECT.enable.activeSubtitle;

    return (
      <>
        <div
          className={cn(
            shellClass,
            "border border-primary/25 bg-primary/5",
          )}
          data-tour-id={TOUR_TARGETS.openToConnect}
        >
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setDialogOpen(true)}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 rounded-lg",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <span
              className={cn(
                "relative flex shrink-0 items-center justify-center bg-primary/18 text-primary",
                iconShellClass,
              )}
            >
              <Radio className={iconClass} strokeWidth={2} aria-hidden />
              {isVisible ? (
                <OnlinePresenceDot
                  isOnline
                  size="sm"
                  borderClassName="border-card"
                  className="absolute -right-0.5 -top-0.5"
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {OPEN_TO_CONNECT.enable.activeTitle}
                </span>
                <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {pausedInRoom ? "Paused" : "Open"}
                </span>
              </span>
              {!isCompact ? (
                <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => disable.mutate()}
            className="h-7 shrink-0 self-center rounded-lg px-2.5 text-xs font-medium"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              OPEN_TO_CONNECT.enable.turnOff
            )}
          </Button>
        </div>
        <OpenToConnectEnableDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        data-tour-id={TOUR_TARGETS.openToConnect}
        onClick={() => setDialogOpen(true)}
        className={cn(
          shellClass,
          "cursor-pointer border border-emerald-500/35 bg-emerald-500/[0.07] text-left transition-colors duration-150",
          "hover:border-emerald-500/45 hover:bg-emerald-500/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            iconShellClass,
          )}
        >
          <Radio className={iconClass} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {OPEN_TO_CONNECT.enable.title}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {OPEN_TO_CONNECT.enable.recommendedBadge}
            </span>
          </span>
          {!isCompact ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {OPEN_TO_CONNECT.enable.subtitle}
            </span>
          ) : null}
        </span>
      </button>
      <OpenToConnectEnableDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
