"use client";

/**
 * OnDirectExpandedToCircle handles direct-call -> circle-call expansion invites.
 *
 * Purpose:
 * - Listens to socket events for invite, accepted expansion, and decline updates.
 * - Shows the "Join this circle?" dialog and sends accept/decline mutations.
 * - Refreshes room/RTC cache so active call UI switches to group semantics without full teardown.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useRoomInviteRespondMutation,
  useJoinRoomMutation,
  roomApi,
} from "@/features/room/api/room-api";
import { rtcApi } from "@/features/rtc/api/rtc-api";
import {
  DIRECT_EXPAND_SOCKET_EVENTS,
  parseBecameCircleRoomId,
  parseDirectExpandInvitePayload,
  type DirectExpandInvitePayload,
} from "@/features/room/types/socket/direct-expand-socket.types";
import {
  invalidateRoomAndPeersCallStatusTags,
  patchCachedRtcRoomType,
} from "@/features/room/lib/session/room-rtk-cache";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";

/**
 * Listens on the global Socket.IO namespace for direct → circle invite lifecycle
 * and refreshes RTC/room cache when a call expands in place.
 */
export function OnDirectExpandedToCircle() {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [invite, setInvite] = useState<DirectExpandInvitePayload | null>(null);
  const [respond, { isLoading: responding }] = useRoomInviteRespondMutation();
  const [joinRoom] = useJoinRoomMutation();

  /**
   * Refresh room metadata + peer presence. Do **not** invalidate `RtcToken` — that recreates the rtc
   * socket for everyone in the room and kills mediasoup producers.
   */
  const onRoomBecameCircle = useCallback(
    (roomId: string) => {
      dispatch(
        rtcApi.util.updateQueryData("getRtcToken", roomId, patchCachedRtcRoomType("circle")),
      );
      dispatch(
        roomApi.util.updateQueryData("getRoom", roomId, (draft) => {
          if (!draft) return;
          if ("sessionKind" in draft && draft.sessionKind === "circle") {
            draft.roomType = "circle";
            return;
          }
          if ("userA" in draft) {
            draft.roomType = "circle";
          }
        }),
      );
      dispatch(roomApi.util.invalidateTags([...invalidateRoomAndPeersCallStatusTags(roomId)]));
    },
    [dispatch],
  );

  useEffect(() => {
    const onInvite = (payload: unknown) => {
      const parsed = parseDirectExpandInvitePayload(payload);
      if (parsed) setInvite(parsed);
    };

    const onBecameCircle = (payload: unknown) => {
      const roomId = parseBecameCircleRoomId(payload);
      if (roomId) onRoomBecameCircle(roomId);
    };

    const onDeclined = () => {
      toast.message("They declined to join the circle");
    };

    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.invite, onInvite);
    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.inviteLegacy, onInvite);
    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.becameCircle, onBecameCircle);
    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.declined, onDeclined);

    return () => {
      socket.off(DIRECT_EXPAND_SOCKET_EVENTS.invite, onInvite);
      socket.off(DIRECT_EXPAND_SOCKET_EVENTS.inviteLegacy, onInvite);
      socket.off(DIRECT_EXPAND_SOCKET_EVENTS.becameCircle, onBecameCircle);
      socket.off(DIRECT_EXPAND_SOCKET_EVENTS.declined, onDeclined);
    };
  }, [socket, onRoomBecameCircle]);

  const closeInvite = () => setInvite(null);

  const onAccept = async () => {
    if (!invite) return;
    try {
      const result = await respond({
        roomId: invite.roomId,
        inviteId: invite.inviteId,
        accept: true,
      }).unwrap();
      if (result.expanded) {
        await joinRoom(invite.roomId).unwrap();
        onRoomBecameCircle(invite.roomId);
        closeInvite();
        router.push(`/circle/${invite.roomId}`);
        toast.success("You joined the circle");
      }
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not join"));
    }
  };

  const onDeclineInvite = async () => {
    if (!invite) return;
    try {
      await respond({
        roomId: invite.roomId,
        inviteId: invite.inviteId,
        accept: false,
      }).unwrap();
      closeInvite();
    } catch {
      toast.error("Could not decline invite");
    }
  };

  const participantListLabel =
    invite?.currentParticipantNames?.length && invite.currentParticipantNames.length > 0
      ? invite.currentParticipantNames.join(", ")
      : "people on the call";

  const inviterName = invite?.inviterDisplayName?.trim() || "Someone";
  const roomTitle = invite?.roomTitle?.trim() || "this call";

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && closeInvite()}>
      <DialogContent
        className="z-200 gap-0 overflow-hidden border-border/70 bg-card p-0 shadow-xl sm:max-w-md"
        overlayClassName="z-199"
      >
        <DialogHeader className="space-y-0 p-6 pb-4 text-left sm:pr-12">
          <div className="flex gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20"
              aria-hidden
            >
              <UsersRound className="size-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">
                Join this circle?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{inviterName}</span>
                    {" "}
                    <span>
                      wants to add you to{" "}
                      <span className="font-medium text-foreground">
                        &ldquo;{roomTitle}&rdquo;
                      </span>{" "}
                      with everyone already here.
                    </span>
                  </p>
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-3.5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/90">
                      On this call
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">
                      {participantListLabel}
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => void onDeclineInvite()}
            disabled={responding}
          >
            Decline
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void onAccept()}
            disabled={responding}
          >
            {responding ? "Joining…" : "Join circle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
