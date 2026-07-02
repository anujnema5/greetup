"use client";

import { Clock, Loader2, MessageCircle, XCircle } from "lucide-react";

import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";

import {
  useCancelConnectRequest,
  useCreateConnectRequest,
} from "../api/connect-requests.mutations";
import type { ConnectRequestItem } from "../types/connect-requests.types";

const copy = OPEN_TO_CONNECT.requestActions;

type Props = {
  targetUserId: string;
  pendingRequest?: ConnectRequestItem;
  fullWidth?: boolean;
};

export function OpenNowRequestActions({ targetUserId, pendingRequest, fullWidth }: Props) {
  const { mutate: createRequest, isPending: createBusy, variables } = useCreateConnectRequest();
  const { mutate: cancelRequest, isPending: cancelBusy } = useCancelConnectRequest();

  const isSendingToTarget = createBusy && variables?.targetUserId === targetUserId;
  const pending =
    pendingRequest?.status === "pending" && pendingRequest.peer.userId === targetUserId
      ? pendingRequest
      : undefined;

  if (pending) {
    return (
      <div className={fullWidth ? "flex w-full items-center gap-2" : "flex items-center gap-2"}>
        <span
          className={
            fullWidth
              ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground"
              : "inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
          }
        >
          <Clock className="size-3 shrink-0" aria-hidden />
          {copy.pending}
        </span>
        <button
          type="button"
          disabled={cancelBusy}
          onClick={() => cancelRequest(pending.id)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelBusy ? (
            <Loader2 className="size-3 animate-spin shrink-0" aria-hidden />
          ) : (
            <XCircle className="size-3 shrink-0" aria-hidden />
          )}
          {cancelBusy ? copy.cancelling : copy.cancel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isSendingToTarget}
      onClick={() => createRequest({ targetUserId })}
      className={
        fullWidth
          ? "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          : "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isSendingToTarget ? (
        <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
      ) : (
        <MessageCircle className="size-3.5 shrink-0" aria-hidden />
      )}
      {isSendingToTarget ? copy.sending : copy.request}
    </button>
  );
}
