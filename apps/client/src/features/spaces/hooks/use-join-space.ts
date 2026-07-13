"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";

import type { ActiveSpaceItem } from "../types/spaces-api.types";

/** Navigate to a space room — safe on any page (no StartSpaceModalProvider). */
export function useJoinSpace() {
  const router = useRouter();

  return useCallback(
    (space: Pick<ActiveSpaceItem, "id">) => {
      router.push(spaceRoomPath(space.id));
    },
    [router],
  );
}
