"use client";

import { Check, Clock, UserCheck, UserMinus, UserPlus, XCircle } from "lucide-react";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import { cn } from "@/lib/utils";

type PeerProfileHoverConnectionActionsProps = {
  panel: PublicProfileConnectionPanel;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isWithdrawing: boolean;
  isAccepting: boolean;
  isRejecting: boolean;
  /** True while a connect request is in flight but the server id is not known yet. */
  isPendingOptimistic?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onWithdraw: () => void;
  onAccept: () => void;
  onReject: () => void;
};

const actionBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60";

export function PeerProfileHoverConnectionActions({
  panel,
  isConnecting,
  isDisconnecting,
  isWithdrawing,
  isAccepting,
  isRejecting,
  isPendingOptimistic = false,
  onConnect,
  onDisconnect,
  onWithdraw,
  onAccept,
  onReject,
}: PeerProfileHoverConnectionActionsProps) {
  if (panel.kind === "none") {
    return null;
  }

  if (panel.kind === "connect") {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={isConnecting}
        className={cn(actionBtn, "w-full bg-primary text-primary-foreground hover:opacity-95")}
      >
        <UserPlus className="size-3.5 shrink-0" aria-hidden />
        {isConnecting ? "Sending…" : "Connect"}
      </button>
    );
  }

  if (panel.kind === "pending_outgoing") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {isPendingOptimistic || isConnecting ? "Sending request…" : "Request sent"}
        </span>
        <button
          type="button"
          onClick={onWithdraw}
          disabled={isWithdrawing || isPendingOptimistic || isConnecting}
          className={cn(actionBtn, "border border-border/70 bg-background px-2 py-1 text-[11px] font-medium")}
        >
          <XCircle className="size-3 shrink-0" aria-hidden />
          {isWithdrawing ? "…" : "Withdraw"}
        </button>
      </div>
    );
  }

  if (panel.kind === "pending_incoming") {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-200">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          Wants to connect
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onReject}
            disabled={isRejecting || isAccepting}
            className={cn(actionBtn, "flex-1 border border-border/70 bg-background text-foreground")}
          >
            {isRejecting ? "…" : "Decline"}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isAccepting || isRejecting}
            className={cn(
              actionBtn,
              "flex-1 border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
            )}
          >
            <UserCheck className="size-3 shrink-0" aria-hidden />
            {isAccepting ? "…" : "Accept"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-100">
        <Check className="size-3.5 shrink-0" aria-hidden />
        Connected
      </span>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className={cn(actionBtn, "border border-border/70 bg-background px-2 py-1 text-[11px] font-medium")}
      >
        <UserMinus className="size-3 shrink-0" aria-hidden />
        {isDisconnecting ? "…" : "Remove"}
      </button>
    </div>
  );
}
