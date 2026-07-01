"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/lib/api";
import { roomApiFetch } from "@/features/room/lib/room-api-fetch";

const INITIAL_DELAY_MS = 2_500;
const DRIP_DELAY_MS = 90_000;

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
 * Fetches overlap hints once after join, then optionally one more after a pause.
 * Server dedupes shown cues per user per room.
 */
export function useRoomConversationCues({
  roomId,
  enabled,
}: UseRoomConversationCuesOptions): void {
  const sessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;

    const sessionKey = roomId;
    sessionKeyRef.current = sessionKey;
    let cancelled = false;
    let dripTimer: ReturnType<typeof setTimeout> | null = null;

    const pullCue = async (): Promise<boolean> => {
      try {
        const result = await fetchNextConversationCue(roomId);
        if (cancelled || sessionKeyRef.current !== sessionKey) return false;
        if (result.cue) {
          showConversationCueToast(roomId, result.cue);
        }
        return result.hasMore;
      } catch {
        return false;
      }
    };

    const initialTimer = setTimeout(() => {
      void (async () => {
        const hasMore = await pullCue();
        if (cancelled || !hasMore) return;

        dripTimer = setTimeout(() => {
          void pullCue();
        }, DRIP_DELAY_MS);
      })();
    }, INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (dripTimer) clearTimeout(dripTimer);
    };
  }, [enabled, roomId]);
}
