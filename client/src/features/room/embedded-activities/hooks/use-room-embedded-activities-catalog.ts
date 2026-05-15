"use client";

import { useMemo } from "react";

import { useGetRoomEmbeddedActivitiesQuery } from "@/features/room/api/room-api";
import {
  embeddedCallPolicyLookupFromApiRows,
  type EmbeddedCallPolicyLookup,
} from "@/features/room/embedded-activities/policy/embedded-activity-call-policy";
import type { RoomEmbeddedActivityDto } from "@/features/room/embedded-activities/types";
import type { RoomActivityMeta } from "@/features/room/types/call/room-activity.types";

export type RoomEmbeddedActivitiesCatalog = {
  /** `is_active` rows only — drives the Activities tab grid. */
  directRoomActivities: RoomActivityMeta[];
  /**
   * Policy for every slug returned by the API (including inactive rows), so in-flight games still
   * resolve invite/UI rules if a module is turned off in the DB.
   */
  embeddedCallPolicyLookup: EmbeddedCallPolicyLookup | null;
};

function activeTilesFromRows(rows: RoomEmbeddedActivityDto[]): RoomActivityMeta[] {
  return rows
    .filter((r) => r.isActive)
    .map((r) => ({ id: r.slug, label: r.displayLabel, emoji: r.emoji }));
}

/**
 * Fetches the embedded-activities catalog once per call surface and splits it into UI tiles vs policy.
 */
export function useRoomEmbeddedActivitiesCatalog(): RoomEmbeddedActivitiesCatalog {
  const { data: rows } = useGetRoomEmbeddedActivitiesQuery();

  const directRoomActivities = useMemo((): RoomActivityMeta[] => {
    if (!rows?.length) return [];
    return activeTilesFromRows(rows);
  }, [rows]);

  const embeddedCallPolicyLookup = useMemo(
    () => (rows?.length ? embeddedCallPolicyLookupFromApiRows(rows) : null),
    [rows],
  );

  return { directRoomActivities, embeddedCallPolicyLookup };
}
