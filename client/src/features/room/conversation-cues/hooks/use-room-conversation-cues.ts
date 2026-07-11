"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/lib/api";
import { roomApiFetch } from "@/features/room/lib/room-api-fetch";

const INITIAL_DELAY_MS = 2_500;

type ConversationCue = {
  id: string;
  title: string;
  body: string | null;
  emoji: string | null;
};

type ConversationCuesResponse = {
  cue: ConversationCue | null;
  hasMore: boolean;
};

function toastIdForCue(roomId: string, cueId: string): string {
  return `conversation-cue-${roomId}-${cueId}`;
}

function showConversationCueToast(roomId: string, cue: ConversationCue): void {
  const title = cue.emoji ? `${cue.emoji} ${cue.title}` : cue.title;
  toast.info(title, {
    id: toastIdForCue(roomId, cue.id),
    description: cue.body ?? undefined,
    duration: 8_000,
    icon: null,
    // Same bottom-right stack as peer-leave toasts so multiple in-call toasts
    // sit one above another (see Toaster `expand` + `.toaster-in-call` lift).
    className: "conversation-cue-toast",
  });
}

async function fetchNextConversationCue(roomId: string): Promise<ConversationCuesResponse> {
  return roomApiFetch<ConversationCuesResponse>(
    API_ENDPOINTS.ROOM.conversationCues(roomId),
    undefined,
    "Could not load conversation cues",
  );
}

type UseRoomConversationCuesOptions = {
  roomId: string;
  /** Direct 1:1 calls only — group spaces skip cues. */
  enabled: boolean;
};

/**
 * Fetches one overlap hint after join and shows it once. No polling or follow-up fetches.
 */
export function useRoomConversationCues({
  roomId,
  enabled,
}: UseRoomConversationCuesOptions): void {
  const fetchedForRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;
    if (fetchedForRoomRef.current === roomId) return;

    fetchedForRoomRef.current = roomId;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await fetchNextConversationCue(roomId);
          if (cancelled || fetchedForRoomRef.current !== roomId) return;
          if (result.cue) {
            showConversationCueToast(roomId, result.cue);
          }
        } catch {
          // swallow — cues are optional UX
        }
      })();
    }, INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, roomId]);
}
