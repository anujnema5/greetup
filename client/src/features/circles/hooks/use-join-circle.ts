"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { circleRoomPath } from "@/features/room/lib/navigation/circle-routes";

import type { ActiveCircleItem } from "../types/circles-api.types";

/** Navigate to a circle room — safe on any page (no StartCircleModalProvider). */
export function useJoinCircle() {
  const router = useRouter();

  return useCallback(
    (circle: Pick<ActiveCircleItem, "id">) => {
      router.push(circleRoomPath(circle.id));
    },
    [router],
  );
}
