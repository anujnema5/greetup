"use client";

import { useEffect, useState } from "react";
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
import { useRoomChessRespondMutation } from "@/features/activity/api/activity-api";
import {
  CHESS_SOCKET_EVENTS,
  parseChessDeclinedPayload,
  parseChessEndedPayload,
  parseChessInvitePayload,
  parseChessStartedPayload,
  type ChessInvitePayload,
} from "@/features/activity/chess/types/chess-socket.types";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRoomActiveActivity,
} from "@/lib/redux/selectors/room-selectors";
import { setActiveActivity } from "@/lib/redux/slices/roomSlice";
import { useSocket } from "@/lib/socket";

/**
 * Listens for direct-call chess lifecycle events and keeps room game state in sync.
 * Global mount is intentional so minimized calls still receive invites.
 */
export function ChessSocketBridge() {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const isVideoSessionActive = useAppSelector(selectIsVideoSessionActive);
  const activeRealtimeActivity = useAppSelector(selectRoomActiveActivity);
  const [invite, setInvite] = useState<ChessInvitePayload | null>(null);
  const [respond, { isLoading: responding }] = useRoomChessRespondMutation();
  const closeInvite = () => setInvite(null);

  useEffect(() => {
    const isForActiveRoom = (roomId: string) => Boolean(activeRoomId && roomId === activeRoomId);

    const onInvite = (payload: unknown) => {
      const parsed = parseChessInvitePayload(payload);
      if (!parsed) return;
      if (!isVideoSessionActive || !isForActiveRoom(parsed.roomId)) return;
      setInvite(parsed);
    };

    const onDeclined = (payload: unknown) => {
      const parsed = parseChessDeclinedPayload(payload);
      if (!parsed) return;
      if (!isForActiveRoom(parsed.roomId)) return;
      toast.message("Chess invite declined");
    };

    const onStarted = (payload: unknown) => {
      const parsed = parseChessStartedPayload(payload);
      if (!parsed) return;
      if (!isForActiveRoom(parsed.roomId)) return;
      setInvite(null);
      dispatch(
        setActiveActivity({
          kind: "chess",
          gameId: parsed.gameId,
          roomId: parsed.roomId,
          whiteUserId: parsed.whiteUserId,
          blackUserId: parsed.blackUserId,
          startedByUserId: parsed.startedByUserId,
          startedAt: parsed.startedAt,
        }),
      );
      toast.success("Chess started");
    };

    const onEnded = (payload: unknown) => {
      const parsed = parseChessEndedPayload(payload);
      if (!parsed) return;
      if (!isForActiveRoom(parsed.roomId)) return;
      if (activeRealtimeActivity?.kind === "chess" && activeRealtimeActivity.gameId === parsed.gameId) {
        dispatch(setActiveActivity(null));
      }
      toast.message("Chess game ended");
    };

    socket.on(CHESS_SOCKET_EVENTS.invite, onInvite);
    socket.on(CHESS_SOCKET_EVENTS.declined, onDeclined);
    socket.on(CHESS_SOCKET_EVENTS.started, onStarted);
    socket.on(CHESS_SOCKET_EVENTS.ended, onEnded);

    return () => {
      socket.off(CHESS_SOCKET_EVENTS.invite, onInvite);
      socket.off(CHESS_SOCKET_EVENTS.declined, onDeclined);
      socket.off(CHESS_SOCKET_EVENTS.started, onStarted);
      socket.off(CHESS_SOCKET_EVENTS.ended, onEnded);
    };
  }, [socket, activeRealtimeActivity, activeRoomId, dispatch, isVideoSessionActive]);

  const onRespond = async (accept: boolean) => {
    if (!invite) return;
    try {
      await respond({
        roomId: invite.roomId,
        requestId: invite.requestId,
        accept,
      }).unwrap();
      if (!accept) {
        toast.message("Chess invite declined");
      }
      closeInvite();
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not respond to chess invite"));
    }
  };

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && closeInvite()}>
      <DialogContent className="z-200 sm:max-w-md" overlayClassName="z-199">
        <DialogHeader>
          <DialogTitle>Play chess?</DialogTitle>
          <DialogDescription className="pt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{invite?.inviterDisplayName}</span> wants to
            start a chess game with you.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRespond(false)}
            disabled={responding}
          >
            Decline
          </Button>
          <Button type="button" onClick={() => void onRespond(true)} disabled={responding}>
            {responding ? "Starting..." : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
