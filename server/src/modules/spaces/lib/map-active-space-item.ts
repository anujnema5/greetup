import { mergeRoomAdvancedOptions } from "@/core/database/schema";

import type { ActiveSpaceItem } from "../types/active-space.types";

function normalizePendingInviteeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function toActiveSpaceItem(row: {
  id: string;
  title: string;
  status: "live" | "scheduled" | "ended" | "cancelled";
  visibility: "public" | "private";
  maxParticipants: number;
  description: string | null;
  advancedOptions: unknown;
  pendingInviteeIds: unknown;
  expiresAt: Date | null;
  isExpired: boolean;
  scheduledStartAt: Date | null;
  startedAt: Date | null;
  participantCount: number;
  categoryId: string;
  categorySlug: string;
  categoryDisplayName: string;
  categoryEmoji: string | null;
  hostUserId: string;
  hostName: string;
  hostDisplayName: string | null;
}): ActiveSpaceItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status as "live" | "scheduled",
    visibility: row.visibility,
    maxParticipants: row.maxParticipants,
    description: row.description,
    advancedOptions: mergeRoomAdvancedOptions(row.advancedOptions as never),
    pendingInviteeIds: normalizePendingInviteeIds(row.pendingInviteeIds),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isExpired: row.isExpired,
    scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    participantCount: row.participantCount,
    category: {
      id: row.categoryId,
      slug: row.categorySlug,
      displayName: row.categoryDisplayName,
      emoji: row.categoryEmoji,
    },
    host: {
      userId: row.hostUserId,
      name: row.hostName,
      displayName: row.hostDisplayName,
    },
  };
}
