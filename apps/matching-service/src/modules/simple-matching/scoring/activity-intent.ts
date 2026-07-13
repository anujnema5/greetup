import type { SnapshotUserProfile } from "@/modules/simple-matching/types";

type SessionActivityRow = {
  activityId: string;
  name: string;
  detailNormalized: string | null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) out.push(item.trim());
  }
  return out;
};

const toSessionActivities = (value: unknown): SessionActivityRow[] => {
  if (!Array.isArray(value)) return [];
  const out: SessionActivityRow[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const activityId = typeof row.activityId === "string" ? row.activityId : null;
    const name = typeof row.name === "string" ? row.name : null;
    if (!activityId || !name) continue;
    const detailNormalized =
      typeof row.detailNormalized === "string" && row.detailNormalized.trim().length > 0
        ? row.detailNormalized.trim().toLowerCase()
        : null;
    out.push({ activityId, name, detailNormalized });
  }
  return out;
};

const sharedActivityIds = (left: string[], right: string[]): string[] => {
  const rightSet = new Set(right);
  return left.filter((id) => rightSet.has(id));
};

/**
 * Activity-intent hard filter for primary matching passes (not fallback).
 * Both activity-intent users must share at least one session activity id.
 */
export function passesActivityIntentStrictFilter(
  requester: SnapshotUserProfile,
  candidate: SnapshotUserProfile,
): boolean {
  const requesterIntent =
    typeof requester.attributes.matchIntent === "string"
      ? requester.attributes.matchIntent
      : "quick";
  if (requesterIntent !== "activity") return true;

  const candidateIntent =
    typeof candidate.attributes.matchIntent === "string"
      ? candidate.attributes.matchIntent
      : "quick";

  const requesterActs = toStringArray(requester.attributes.sessionActivityIds);
  if (requesterActs.length === 0) return true;

  if (candidateIntent !== "activity") return true;

  const candidateActs = toStringArray(candidate.attributes.sessionActivityIds);
  if (candidateActs.length === 0) return false;

  return sharedActivityIds(requesterActs, candidateActs).length > 0;
}

export function sessionActivityOverlapScore(
  requester: SnapshotUserProfile,
  candidate: SnapshotUserProfile,
): { overlap: number; detailBonus: number } {
  const requesterActs = toSessionActivities(requester.attributes.sessionActivities);
  const candidateActs = toSessionActivities(candidate.attributes.sessionActivities);

  if (requesterActs.length === 0 || candidateActs.length === 0) {
    return { overlap: 0, detailBonus: 0 };
  }

  const candidateById = new Map(candidateActs.map((a) => [a.activityId, a]));
  let intersection = 0;
  let detailMatches = 0;

  for (const left of requesterActs) {
    const right = candidateById.get(left.activityId);
    if (!right) continue;
    intersection += 1;
    if (
      left.detailNormalized &&
      right.detailNormalized &&
      left.detailNormalized === right.detailNormalized
    ) {
      detailMatches += 1;
    }
  }

  const union = new Set([
    ...requesterActs.map((a) => a.activityId),
    ...candidateActs.map((a) => a.activityId),
  ]).size;
  const overlap = union === 0 ? 0 : intersection / union;
  const detailBonus = intersection === 0 ? 0 : detailMatches / intersection;
  return { overlap, detailBonus };
}
