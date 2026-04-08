import { Check, Clock, UserCheck, UserMinus, UserPlus, XCircle } from "lucide-react";

import type { PublicProfileConnectionPanel } from "../lib/public-profile-connection";

type Props = {
  panel: PublicProfileConnectionPanel;
  isSubmittingConnect: boolean;
  isSubmittingDisconnect: boolean;
  isSubmittingWithdraw: boolean;
  isSubmittingAccept: boolean;
  isSubmittingReject: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onWithdraw: () => void;
  onAccept: () => void;
  onReject: () => void;
};

export function PublicProfileConnectionActions({
  panel,
  isSubmittingConnect,
  isSubmittingDisconnect,
  isSubmittingWithdraw,
  isSubmittingAccept,
  isSubmittingReject,
  onConnect,
  onDisconnect,
  onWithdraw,
  onAccept,
  onReject,
}: Props) {
  if (panel.kind === "none") {
    return null;
  }

  if (panel.kind === "connect") {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={isSubmittingConnect}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserPlus size={18} aria-hidden />
        {isSubmittingConnect ? "Sending…" : "Connect"}
      </button>
    );
  }

  if (panel.kind === "pending_outgoing") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={16} aria-hidden />
          Request pending
        </div>
        <button
          type="button"
          onClick={onWithdraw}
          disabled={isSubmittingWithdraw}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          <XCircle size={14} aria-hidden />
          {isSubmittingWithdraw ? "Withdrawing..." : "Withdraw"}
        </button>
      </div>
    );
  }

  if (panel.kind === "pending_incoming") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-amber-200">
          <Clock size={16} aria-hidden />
          Wants to connect
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReject}
            disabled={isSubmittingReject || isSubmittingAccept}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingReject ? "Rejecting..." : "Reject"}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isSubmittingAccept || isSubmittingReject}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserCheck size={14} aria-hidden />
            {isSubmittingAccept ? "Accepting..." : "Accept"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-emerald-200">
        <Check size={16} aria-hidden />
        Connected
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={isSubmittingDisconnect}
        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserMinus size={14} aria-hidden />
        {isSubmittingDisconnect ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}
