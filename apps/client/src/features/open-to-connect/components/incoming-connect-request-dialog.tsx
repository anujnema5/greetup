"use client";

import { Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { exploreAvatarClass } from "@/features/explore/lib/explore-display-utils";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";

import { incomingConnectRequestLabel, incomingConnectRequestNote, incomingConnectRequestToFeedItem } from "../lib/incoming-connect-request.utils";
import { OpenNowActivityChips } from "./open-now-activity-chips";
import { OpenNowPersonMeta } from "./open-now-person-card-parts";
import type { IncomingConnectRequest } from "../types/connect-requests.types";

const INCOMING_DIALOG_Z = "z-[260]";

type IncomingConnectRequestDialogProps = {
  request: IncomingConnectRequest;
  responding: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingConnectRequestDialog({
  request,
  responding,
  onAccept,
  onDecline,
}: IncomingConnectRequestDialogProps) {
  const label = incomingConnectRequestLabel(request);
  const requestNote = incomingConnectRequestNote(request);
  const feedItem = incomingConnectRequestToFeedItem(request);

  return (
    <Dialog open onOpenChange={(next) => {
      if (!next && !responding) onDecline();
    }}>
      <DialogContent
        className={cn(
          INCOMING_DIALOG_Z,
          "max-h-[min(90dvh,640px)] gap-4 overflow-y-auto sm:max-w-100",
          "data-[state=open]:animate-none data-[state=closed]:animate-none",
        )}
        overlayClassName={cn(
          INCOMING_DIALOG_Z,
          "bg-black/50 data-[state=open]:animate-none data-[state=closed]:animate-none",
        )}
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="flex items-start gap-3 pr-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
              {OPEN_TO_CONNECT.inbound.modalTitle}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] leading-snug">
              {OPEN_TO_CONNECT.inbound.modalDescription}
            </DialogDescription>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white",
                request.requesterImage ? "bg-muted" : exploreAvatarClass(request.requesterUserId),
              )}
            >
              {request.requesterImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getProfileImageUrl(request.requesterImage)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                nameInitials(label)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{label}</p>
              <p className="truncate text-[12px] text-muted-foreground">@{request.requesterUsername}</p>
            </div>
          </div>

          <OpenNowPersonMeta person={feedItem} className="mt-3" />
          <OpenNowActivityChips activities={request.activities} className="mt-2.5" />

          {requestNote ? (
            <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {OPEN_TO_CONNECT.inbound.modalRequestNote}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-foreground">{requestNote}</p>
            </div>
          ) : null}
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">{OPEN_TO_CONNECT.inbound.modalHint}</p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-3"
            disabled={responding}
            onClick={onDecline}
          >
            {responding ? OPEN_TO_CONNECT.inbound.declining : OPEN_TO_CONNECT.inbound.decline}
          </Button>
          <Button type="button" className="flex-2" disabled={responding} onClick={onAccept}>
            {responding ? (
              <Loader2 className="mr-1.5 size-4 shrink-0 animate-spin" aria-hidden />
            ) : null}
            {responding ? OPEN_TO_CONNECT.inbound.accepting : OPEN_TO_CONNECT.inbound.accept}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
