"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { markRoomMinimized } from "@/features/room/lib/session/room-sync";
import { publicProfileHref } from "@/features/user-profile/lib/public-profile-href";
import { minimizeVideoSession } from "@/lib/redux/slices/room-slice";

/** Minimize the call to the dock, then open the peer's public profile. */
export function useOpenPeerProfileFromCall() {
  const router = useRouter();
  const dispatch = useDispatch();

  return useCallback(
    (username: string | null | undefined) => {
      const href = publicProfileHref(username);
      if (!href) {
        toast.error("Profile is not available for this user yet.");
        return;
      }
      markRoomMinimized();
      dispatch(minimizeVideoSession());
      router.push(href);
    },
    [dispatch, router],
  );
}
