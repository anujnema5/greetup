"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useStartScheduledSpace } from "@/features/room/api/room.mutations";
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { useSession } from "@/lib/auth-client";

import { useStartSpaceModal } from "../components/start-space-modal-provider";
import type { ActiveSpaceCardGridHandlers } from "../components/active-space-card";
import type { ActiveSpaceItem } from "../types/spaces-api.types";
import { useJoinSpace } from "./use-join-space";

/**
 * Shared join / host-edit / start-scheduled actions for space cards
 * (dashboard grid and `/spaces` browse).
 */
export function useActiveSpaceCardActions(): ActiveSpaceCardGridHandlers {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const { openModalForEdit } = useStartSpaceModal();
  const onJoinSpace = useJoinSpace();
  const { mutateAsync: startScheduledSpace, isPending: startScheduledBusy } =
    useStartScheduledSpace();

  const onStartScheduledNow = useCallback(
    async (space: ActiveSpaceItem) => {
      try {
        await startScheduledSpace(space.id);
        toast.success("Space is live — opening room…");
        router.push(spaceRoomPath(space.id));
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, "Could not start this space yet"));
      }
    },
    [router, startScheduledSpace],
  );

  return {
    currentUserId,
    onJoinSpace,
    onEditScheduled: openModalForEdit,
    onStartScheduledNow,
    startScheduledBusy,
  };
}
