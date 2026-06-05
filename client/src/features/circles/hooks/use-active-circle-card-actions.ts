"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useStartScheduledCircleMutation } from "@/features/room/api/room-api";
import { circleRoomPath } from "@/features/room/lib/navigation/circle-routes";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { useSession } from "@/lib/auth-client";

import { useStartCircleModal } from "../components/start-circle-modal-provider";
import type { ActiveCircleCardGridHandlers } from "../components/active-circle-card";
import type { ActiveCircleItem } from "../types/circles-api.types";
import { useJoinCircle } from "./use-join-circle";

/**
 * Shared join / host-edit / start-scheduled actions for circle cards
 * (dashboard grid and `/circles` browse).
 */
export function useActiveCircleCardActions(): ActiveCircleCardGridHandlers {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const { openModalForEdit } = useStartCircleModal();
  const onJoinCircle = useJoinCircle();
  const [startScheduledCircle, { isLoading: startScheduledBusy }] =
    useStartScheduledCircleMutation();

  const onStartScheduledNow = useCallback(
    async (circle: ActiveCircleItem) => {
      try {
        await startScheduledCircle(circle.id).unwrap();
        toast.success("Circle is live — opening room…");
        router.push(circleRoomPath(circle.id));
      } catch (e: unknown) {
        toast.error(getRtkMutationErrorMessage(e, "Could not start this circle yet"));
      }
    },
    [router, startScheduledCircle],
  );

  return {
    currentUserId,
    onJoinCircle,
    onEditScheduled: openModalForEdit,
    onStartScheduledNow,
    startScheduledBusy,
  };
}
