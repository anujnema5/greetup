import type { MatchPrepActivityOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";

export function validateSessionActivitySelections(
  rows: MatchPrepActivityOptionRow[],
  selectedIds: Set<string> | string[],
  activityDetails: Record<string, string>,
  options: {
    requireAtLeastOne?: boolean;
    maxCount?: number;
  } = {},
): string | null {
  const { requireAtLeastOne = false, maxCount } = options;
  const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);

  if (requireAtLeastOne && ids.size === 0) {
    return "Pick at least one activity.";
  }

  if (maxCount != null && ids.size > maxCount) {
    return `You can pick at most ${maxCount} activities.`;
  }

  for (const row of rows) {
    if (!ids.has(row.id)) continue;
    const detail = activityDetails[row.id]?.trim() ?? "";
    if (row.detailRequired && !detail) {
      return `${row.displayName}: ${row.detailLabel ?? "detail"} is required.`;
    }
    if (detail.length > row.detailMaxLength) {
      return `${row.displayName}: detail is too long.`;
    }
  }

  return null;
}

export function toggleSessionActivityId(
  prev: Set<string>,
  id: string,
  maxCount: number,
): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
    return next;
  }
  if (next.size >= maxCount) return prev;
  next.add(id);
  return next;
}

export function buildActivitySelectionsPayload(
  selectedIds: Set<string>,
  activityDetails: Record<string, string>,
): Array<{ activityId: string; detail?: string | null }> {
  return [...selectedIds].map((activityId) => ({
    activityId,
    detail: activityDetails[activityId]?.trim() || null,
  }));
}
