"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** React 19 — types may lag; runtime provides this hook. */
const useEffectEvent = React.useEffectEvent as <T extends (...args: never[]) => unknown>(fn: T) => T;
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  useRoomChessDrawRespondMutation,
  useRoomChessRespondMutation,
} from "@/features/activity/api/activity-api";
import {
  CHESS_SOCKET_EVENTS,
  parseChessDeclinedPayload,
  parseChessDrawOfferedPayload,
  parseChessDrawRejectedPayload,
  parseChessEndedPayload,
  parseChessInvitePayload,
  parseChessMovedPayload,
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

export function ChessSocketBridge() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const isVideoSessionActive = useAppSelector(selectIsVideoSessionActive);
  const activeRealtimeActivity = useAppSelector(selectRoomActiveActivity);
  const [invite, setInvite] = useState<ChessInvitePayload | null>(null);
  const [drawOffer, setDrawOffer] = useState<{ roomId: string; gameId: string } | null>(null);
  const [respond, { isLoading: responding }] = useRoomChessRespondMutation();
  const [respondDraw, { isLoading: respondingDraw }] = useRoomChessDrawRespondMutation();

  const onInvite = useEffectEvent((payload: unknown) => {
    const parsed = parseChessInvitePayload(payload);
    if (!parsed) return;
    if (!isVideoSessionActive || !activeRoomId || parsed.roomId !== activeRoomId) return;
    setInvite(parsed);
  });

  const onDeclined = useEffectEvent((payload: unknown) => {
    const parsed = parseChessDeclinedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
    toast.message("Chess invite declined");
  });

  const onStarted = useEffectEvent((payload: unknown) => {
    const parsed = parseChessStartedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
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
        fen: parsed.fen,
        turn: parsed.turn,
        moveNumber: 0,
        lastMoveSan: null,
        lastMoveAt: null,
      }),
    );
    toast.success("Chess started");
  });

  const onMoved = useEffectEvent((payload: unknown) => {
    const parsed = parseChessMovedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
    if (activeRealtimeActivity?.kind !== "chess" || activeRealtimeActivity.gameId !== parsed.gameId) return;
    dispatch(
      setActiveActivity({
        ...activeRealtimeActivity,
        fen: parsed.fen,
        turn: parsed.turn,
        moveNumber: parsed.moveNumber,
        lastMoveSan: parsed.san,
        lastMoveAt: parsed.movedAt,
      }),
    );
  });

  const onDrawOffered = useEffectEvent((payload: unknown) => {
    const parsed = parseChessDrawOfferedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
    setDrawOffer({ roomId: parsed.roomId, gameId: parsed.gameId });
  });

  const onDrawRejected = useEffectEvent((payload: unknown) => {
    const parsed = parseChessDrawRejectedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
    toast.message("Draw offer rejected");
  });

  const onEnded = useEffectEvent((payload: unknown) => {
    const parsed = parseChessEndedPayload(payload);
    if (!parsed) return;
    if (!activeRoomId || parsed.roomId !== activeRoomId) return;
    if (activeRealtimeActivity?.kind === "chess" && activeRealtimeActivity.gameId === parsed.gameId) {
      dispatch(setActiveActivity(null));
    }
    setDrawOffer(null);
    const me = session?.user?.id ?? null;
    if (parsed.result === "resign") {
      toast.message(parsed.endedByUserId === me ? "You resigned" : "Opponent resigned");
    } else if (parsed.result === "draw" || parsed.result === "stalemate") {
      toast.message("Game drawn");
    } else if (parsed.result === "checkmate") {
      toast.message(parsed.winnerUserId === me ? "You won by checkmate" : "You lost by checkmate");
    } else {
      toast.message("Chess game ended");
    }
  });

  useEffect(() => {
    socket.on(CHESS_SOCKET_EVENTS.invite, onInvite);
    socket.on(CHESS_SOCKET_EVENTS.declined, onDeclined);
    socket.on(CHESS_SOCKET_EVENTS.started, onStarted);
    socket.on(CHESS_SOCKET_EVENTS.moved, onMoved);
    socket.on(CHESS_SOCKET_EVENTS.drawOffered, onDrawOffered);
    socket.on(CHESS_SOCKET_EVENTS.drawRejected, onDrawRejected);
    socket.on(CHESS_SOCKET_EVENTS.ended, onEnded);

    return () => {
      socket.off(CHESS_SOCKET_EVENTS.invite, onInvite);
      socket.off(CHESS_SOCKET_EVENTS.declined, onDeclined);
      socket.off(CHESS_SOCKET_EVENTS.started, onStarted);
      socket.off(CHESS_SOCKET_EVENTS.moved, onMoved);
      socket.off(CHESS_SOCKET_EVENTS.drawOffered, onDrawOffered);
      socket.off(CHESS_SOCKET_EVENTS.drawRejected, onDrawRejected);
      socket.off(CHESS_SOCKET_EVENTS.ended, onEnded);
    };
  }, [socket]);

  const onRespond = async (accept: boolean) => {
    if (!invite) return;
    try {
      await respond({
        roomId: invite.roomId,
        requestId: invite.requestId,
        accept,
      }).unwrap();
      if (!accept) toast.message("Chess invite declined");
      setInvite(null);
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not respond to chess invite"));
    }
  };

  const onRespondDraw = async (accept: boolean) => {
    if (!drawOffer) return;
    try {
      await respondDraw({
        roomId: drawOffer.roomId,
        gameId: drawOffer.gameId,
        accept,
      }).unwrap();
      setDrawOffer(null);
      if (!accept) toast.message("Draw offer declined");
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not respond to draw offer"));
    }
  };

  return (
    <>
      <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && setInvite(null)}>
        <DialogContent className="z-200 overflow-hidden p-0 sm:max-w-sm" overlayClassName="z-199">
          <div className="flex flex-col items-center gap-3 border-b border-border/40 px-6 pb-6 pt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl ring-1 ring-border/60">
              ♟︎
            </div>
            <div className="text-center">
              <DialogTitle className="text-lg font-semibold">Play chess?</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{invite?.inviterDisplayName}</span> wants to start a
                chess game with you.
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => void onRespond(false)} disabled={responding}>
              Decline
            </Button>
            <Button type="button" className="flex-1" onClick={() => void onRespond(true)} disabled={responding}>
              {responding ? "Starting…" : "Accept"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(drawOffer)} onOpenChange={(open) => !open && setDrawOffer(null)}>
        <DialogContent className="z-200 overflow-hidden p-0 sm:max-w-sm" overlayClassName="z-199">
          <div className="flex flex-col items-center gap-3 border-b border-border/40 px-6 pb-6 pt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl ring-1 ring-border/60">
              🤝
            </div>
            <div className="text-center">
              <DialogTitle className="text-lg font-semibold">Draw offer</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Your opponent offered a draw. Accept or reject.
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => void onRespondDraw(false)}
              disabled={respondingDraw}
            >
              Reject
            </Button>
            <Button type="button" className="flex-1" onClick={() => void onRespondDraw(true)} disabled={respondingDraw}>
              Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
