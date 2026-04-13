"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  matchingApi,
  useExpandDirectRespondMutation,
  useJoinRoomMutation,
} from "@/features/matching/api/matching-api";
import { rtcApi } from "@/features/rtc/api/rtc-api";
import {
  DIRECT_EXPAND_SOCKET_EVENTS,
  parseBecameCircleRoomId,
  parseDirectExpandInvitePayload,
  type DirectExpandInvitePayload,
} from "@/features/room/types/direct-expand-socket.types";
import {
  invalidateRoomAndPeersCallStatusTags,
  patchCachedRtcRoomType,
} from "@/features/room/lib/room-rtk-cache";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";

/**
 * Listens on the global Socket.IO namespace for direct → circle invite lifecycle
 * and refreshes RTC/room cache when a call expands in place.
 */
export function RoomDirectExpandSocketBridge() {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [invite, setInvite] = useState<DirectExpandInvitePayload | null>(null);
  const [respond, { isLoading: responding }] = useExpandDirectRespondMutation();
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
      dispatch(matchingApi.util.invalidateTags([...invalidateRoomAndPeersCallStatusTags(roomId)]));
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
    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.becameCircle, onBecameCircle);
    socket.on(DIRECT_EXPAND_SOCKET_EVENTS.declined, onDeclined);

    return () => {
      socket.off(DIRECT_EXPAND_SOCKET_EVENTS.invite, onInvite);
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

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && closeInvite()}>
      <DialogContent className="z-[200] sm:max-w-md" overlayClassName="z-[199]">
        <DialogHeader>
          <DialogTitle>Join this circle?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{invite?.inviterDisplayName}</span> wants
                to add you to &ldquo;{invite?.roomTitle ?? "this call"}&rdquo; with {participantListLabel}.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDeclineInvite()}
            disabled={responding}
          >
            Decline
          </Button>
          <Button type="button" onClick={() => void onAccept()} disabled={responding}>
            {responding ? "Joining…" : "Join"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
