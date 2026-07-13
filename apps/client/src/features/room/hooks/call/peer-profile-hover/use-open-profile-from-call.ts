"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markRoomMinimized } from "@/features/room/lib/session/room-sync";
import { useRoomStore } from "@/features/room/state/room.store";
import { publicProfileHref } from "@/features/user-profile/lib/public-profile-href";

/** Minimize the call to the dock, then open the peer's public profile. */
export function useOpenPeerProfileFromCall() {
  const router = useRouter();
  const minimizeVideoSession = useRoomStore((s) => s.minimizeVideoSession);

  return useCallback(
    (username: string | null | undefined) => {
      const href = publicProfileHref(username);
      if (!href) {
        toast.error("Profile is not available for this user yet.");
        return;
      }
      markRoomMinimized();
      minimizeVideoSession();
      router.push(href);
    },
    [minimizeVideoSession, router],
  );
}
