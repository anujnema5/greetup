/**
 * Pure helpers for in-call UX rules driven by `room_embedded_activities`.
 *
 * - **API rows** supply the authoritative map once loaded.
 * - **Fallback** keeps chess-safe defaults if the request fails (see `FALLBACK_POLICY_BY_ACTIVITY`).
 *
 * Server should still enforce `block_participant_invites` on invite endpoints.
 */

import type { RoomEmbeddedActivityDto } from "@/features/room/embedded-activities/types";
import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";

/** Keys we can resolve — extend when `RoomActiveActivity` gains new `kind` values. */
export type EmbeddedCallPolicyKey = RoomActivityId | RoomActiveActivity["kind"];

export type EmbeddedActivityCallPolicy = {
  hidePeopleTab: boolean;
  blockParticipantInvites: boolean;
  suppressPeoplePanelCameras: boolean;
};

export type EmbeddedCallPolicyPartial = Partial<EmbeddedActivityCallPolicy> & {
  inviteBlockedMessage?: string;
};

export type EmbeddedCallPolicyLookup = Partial<
  Record<EmbeddedCallPolicyKey, EmbeddedCallPolicyPartial>
>;

const DEFAULT_POLICY: EmbeddedActivityCallPolicy = {
  hidePeopleTab: false,
  blockParticipantInvites: false,
  suppressPeoplePanelCameras: false,
};

/** Client-side defaults when API data is missing; merge is overridden per-key by API. */
const FALLBACK_POLICY_BY_ACTIVITY: EmbeddedCallPolicyLookup = {
  chess: {
    hidePeopleTab: true,
    blockParticipantInvites: true,
    suppressPeoplePanelCameras: true,
    inviteBlockedMessage:
      "You can't invite someone while a chess game is in progress. End the game first.",
  },
};

export const DEFAULT_INVITE_BLOCKED_TOAST =
  "You can't invite someone during this activity. End it first.";

export function embeddedCallPolicyLookupFromApiRows(
  rows: RoomEmbeddedActivityDto[],
): EmbeddedCallPolicyLookup {
  const m: EmbeddedCallPolicyLookup = {};
  for (const r of rows) {
    m[r.slug] = {
      hidePeopleTab: r.hidePeopleTab,
      blockParticipantInvites: r.blockParticipantInvites,
      suppressPeoplePanelCameras: r.suppressPeoplePanelCameras,
      ...(r.inviteBlockedMessage?.trim()
        ? { inviteBlockedMessage: r.inviteBlockedMessage.trim() }
        : {}),
    };
  }
  return m;
}

function normalizePolicy(
  partial: (Partial<EmbeddedActivityCallPolicy> & { inviteBlockedMessage?: string }) | undefined,
): EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string } {
  return {
    ...DEFAULT_POLICY,
    ...partial,
  };
}

function policyForKey(
  key: string | null | undefined,
  policyByActivity: EmbeddedCallPolicyLookup | null | undefined,
): (EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string }) | null {
  if (!key) return null;
  const k = key as EmbeddedCallPolicyKey;
  const fromApi = policyByActivity?.[k];
  const fromFallback = FALLBACK_POLICY_BY_ACTIVITY[k];
  const mergedPartial =
    fromApi != null || fromFallback != null ? { ...fromFallback, ...fromApi } : null;
  if (!mergedPartial || Object.keys(mergedPartial).length === 0) return null;
  return normalizePolicy(mergedPartial);
}

function mergePolicies(
  a: (EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string }) | null,
  b: (EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string }) | null,
): EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string } {
  if (!a && !b) return { ...DEFAULT_POLICY };
  if (!a) return b!;
  if (!b) return a;
  return {
    hidePeopleTab: a.hidePeopleTab || b.hidePeopleTab,
    blockParticipantInvites: a.blockParticipantInvites || b.blockParticipantInvites,
    suppressPeoplePanelCameras: a.suppressPeoplePanelCameras || b.suppressPeoplePanelCameras,
    inviteBlockedMessage: a.inviteBlockedMessage ?? b.inviteBlockedMessage,
  };
}

/**
 * Effective policy for the call shell: local stage id + synced activity (e.g. chess) are OR-merged.
 */
export function resolveEmbeddedActivityCallPolicy(input: {
  stageActivityId: RoomActivityId | null;
  synchronizedActivity: RoomActiveActivity | null;
  policyByActivity?: EmbeddedCallPolicyLookup | null;
}): EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string } {
  const lookup = input.policyByActivity ?? null;
  const fromStage = policyForKey(input.stageActivityId, lookup);
  const fromSync = policyForKey(input.synchronizedActivity?.kind, lookup);
  return mergePolicies(fromStage, fromSync);
}

export function toastMessageForBlockedInvite(
  policy: EmbeddedActivityCallPolicy & { inviteBlockedMessage?: string },
): string {
  if (!policy.blockParticipantInvites) return "";
  return policy.inviteBlockedMessage?.trim() || DEFAULT_INVITE_BLOCKED_TOAST;
}

export function embeddedCallPolicyActivityIds(
  policyByActivity?: EmbeddedCallPolicyLookup | null,
): EmbeddedCallPolicyKey[] {
  const fromLookup = policyByActivity ? Object.keys(policyByActivity) : [];
  const fromFallback = Object.keys(FALLBACK_POLICY_BY_ACTIVITY);
  return [...new Set([...fromFallback, ...fromLookup])] as EmbeddedCallPolicyKey[];
}

/**
 * Whether duplicate camera tiles in the People panel should be hidden on direct calls.
 */
export function shouldSuppressDuplicatePeopleCameras(input: {
  isGroupRoom: boolean;
  hasActivityOnStage: boolean;
  stageActivityId: RoomActivityId | null;
  mergedPolicy: EmbeddedActivityCallPolicy;
}): boolean {
  if (input.isGroupRoom || !input.hasActivityOnStage) return false;
  if (input.mergedPolicy.suppressPeoplePanelCameras) return true;
  return input.stageActivityId != null;
}
