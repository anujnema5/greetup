"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch } from "@/lib/redux/hooks";
import { endCall } from "@/lib/redux/slices/callSlice";
import { clearCallSession } from "@/lib/call/call-sync";
import { useLeaveRoomMutation, leaveRoomKeepalive } from "@/features/matching/api/matching-api";
import { Video, Users, Zap, ArrowLeft } from "lucide-react";

interface RoomData {
  roomId: string;
  userA: string;
  userB: string;
  matchScore: string | null;
}

function UserCard({ userId, label, isYou }: { userId: string; label: string; isYou: boolean }) {
  const initials = userId.slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{
            background: isYou
              ? "radial-gradient(circle at 40% 35%, oklch(72% 0.18 280), oklch(55% 0.22 280))"
              : "radial-gradient(circle at 40% 35%, oklch(88% 0.11 105), oklch(72% 0.14 105))",
            boxShadow: isYou
              ? "0 0 32px oklch(60% 0.2 280 / 0.4)"
              : "0 0 32px oklch(80% 0.12 105 / 0.4)",
          }}
        >
          {initials}
        </div>
        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-background" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{isYou ? "You" : "Match"}</p>
        <p className="text-xs text-muted-foreground font-mono">{userId.slice(0, 8)}…</p>
        <span className="mt-1 inline-block rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          {label}
        </span>
      </div>
    </div>
  );
}

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const [leaveRoom] = useLeaveRoomMutation();

  const roomId = params.roomId as string;
  const peerIdFromUrl = searchParams.get("peer");
  const scoreFromUrl = searchParams.get("score");

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearLocalCallUi = useCallback(() => {
    clearCallSession();
    dispatch(endCall());
  }, [dispatch]);

  /** Match lobby is not the legacy `/room` ConnectedView; clear stale flags so the minimized dock does not treat this as an active call. */
  useEffect(() => {
    clearLocalCallUi();
  }, [clearLocalCallUi]);

  const leaveRoomAndClearUi = useCallback(async () => {
    try {
      await leaveRoom().unwrap();
    } catch {
      // best-effort — still clear local UI
    }
    clearLocalCallUi();
  }, [leaveRoom, clearLocalCallUi]);

  useEffect(() => {
    const onBeforeUnload = () => {
      leaveRoomKeepalive();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/room/${roomId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Room not found");
        const json = await res.json();
        setRoom(json.data);
      } catch {
        // Fall back to URL params if server fetch fails
        if (peerIdFromUrl && session?.user?.id) {
          setRoom({
            roomId,
            userA: session.user.id,
            userB: peerIdFromUrl,
            matchScore: scoreFromUrl,
          });
        } else {
          setError("Could not load room data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, peerIdFromUrl, scoreFromUrl, session]);

  const currentUserId = session?.user?.id;

  const peerId = room
    ? room.userA === currentUserId
      ? room.userB
      : room.userA
    : peerIdFromUrl ?? null;

  const score = room?.matchScore ?? scoreFromUrl;

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-muted-foreground text-sm">
        Connecting to room…
      </div>
    );
  }

  if (error && !peerId) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground text-sm">{error}</p>
        <button
          onClick={() => router.replace("/")}
          className="text-xs text-primary underline underline-offset-2"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <button
          onClick={() => {
            void leaveRoomAndClearUi().then(() => router.replace("/"));
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Leave
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Room active
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6">
        {/* Match badge */}
        <div
          className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-5 py-2 text-sm font-semibold text-foreground"
          style={{ boxShadow: "0 0 20px oklch(88% 0.11 105 / 0.12)" }}
        >
          <Zap size={14} className="text-primary" fill="currentColor" />
          Match found!
          {score && (
            <span className="ml-1 text-primary">· {score}% vibe</span>
          )}
        </div>

        {/* Users */}
        <div className="flex items-center gap-12 md:gap-20">
          {currentUserId && (
            <UserCard userId={currentUserId} label="online" isYou={true} />
          )}

          <div className="flex flex-col items-center gap-2">
            <div
              className="h-px w-16 md:w-24"
              style={{ background: "linear-gradient(to right, oklch(60% 0.2 280 / 0.5), oklch(88% 0.11 105 / 0.5))" }}
            />
            <Users size={14} className="text-muted-foreground" />
            <div
              className="h-px w-16 md:w-24"
              style={{ background: "linear-gradient(to left, oklch(60% 0.2 280 / 0.5), oklch(88% 0.11 105 / 0.5))" }}
            />
          </div>

          {peerId && (
            <UserCard userId={peerId} label="online" isYou={false} />
          )}
        </div>

        {/* Room ID */}
        <p className="text-xs text-muted-foreground font-mono opacity-50">
          room · {roomId.slice(0, 8)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              void leaveRoomAndClearUi().then(() => router.replace("/"));
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            End
          </button>
          <button
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground transition-all"
            style={{
              background: "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
              boxShadow: "0 0 18px oklch(88% 0.11 105 / 0.3)",
            }}
          >
            <Video size={15} />
            Start Video
          </button>
        </div>
      </main>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-background text-muted-foreground text-sm">
          Connecting to room…
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
