"use client";

import { Clock, Loader2, UserPlus, XCircle } from "lucide-react";

import { CONNECTIONS } from "@/lib/copy/user-messages";

const copy = CONNECTIONS.requestActions;

type OutgoingState = {
  connectionId: string;
  status: "pending" | "accepted";
};

type Props = {
  outgoing: OutgoingState | undefined;
  connectBusy: boolean;
  withdrawBusy: boolean;
  onConnect: (e: React.MouseEvent) => void;
  onWithdraw: (e: React.MouseEvent, connectionId: string) => void;
};

export function PeerConnectionRequestActions({
  outgoing,
  connectBusy,
  withdrawBusy,
  onConnect,
  onWithdraw,
}: Props) {
  if (outgoing?.status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
          aria-live="polite"
        >
          <Clock size={12} className="shrink-0" aria-hidden />
          {copy.requested}
        </span>
        <button
          type="button"
          disabled={withdrawBusy}
          onClick={(e) => onWithdraw(e, outgoing.connectionId)}
          className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {withdrawBusy ? (
            <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          ) : (
            <XCircle size={12} className="shrink-0" aria-hidden />
          )}
          {withdrawBusy ? copy.withdrawing : copy.withdraw}
        </button>
      </div>
    );
  }

  if (outgoing?.status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        {copy.connected}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={connectBusy}
      onClick={onConnect}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
    >
      {connectBusy ? (
        <Loader2 size={12} className="animate-spin" aria-hidden />
      ) : (
        <UserPlus size={12} className="shrink-0" aria-hidden />
      )}
      {connectBusy ? copy.sending : copy.connect}
    </button>
  );
}
