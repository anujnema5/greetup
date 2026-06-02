"use client";

import { useSession } from "@/lib/auth-client";

import { useStartCircleModal } from "../components/start-circle-modal-provider";
import type { ActiveCircleCardGridHandlers } from "../components/active-circle-card";
import { useJoinCircle } from "./use-join-circle";

/**
 * Shared join / host-edit actions for circle cards
 * (dashboard grid and `/circles` browse).
 */
export function useActiveCircleCardActions(): ActiveCircleCardGridHandlers {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const { openModalForEdit } = useStartCircleModal();
  const onJoinCircle = useJoinCircle();

  return {
    currentUserId,
    onJoinCircle,
    onEditScheduled: openModalForEdit,
  };
}
