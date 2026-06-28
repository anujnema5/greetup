import type {
  MatchPrepCurrentData,
  MatchPrepOptionsData,
} from "@/features/profile-setup/types/profile-setup-api.types";
import { cn } from "@/lib/utils";

import type { MatchPrepInitialFormState } from "../types/match-prep.types";

/**
 * Mobile Chrome: plain `vh` ignores the URL bar. Use `min(90svh, 90dvh)` so height tracks the
 * visible viewport (small + dynamic) and never assumes extra space behind the browser chrome.
 */
export const dialogShellClass = cn(
  "flex! min-h-0 max-h-[min(90svh,90dvh,760px)] flex-col! gap-0! overflow-hidden",
  "rounded-2xl border-border bg-card p-0 shadow-xl sm:max-w-lg",
);

export const dialogSectionPxClass = "px-5 sm:px-6";

export const scrollBodyClass = cn(
  "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2",
  dialogSectionPxClass,
  "[overflow-anchor:none]",
);

export const sectionLabelClass =
  "text-xs font-semibold text-muted-foreground";

export function toggleIdInSet(id: string, prev: Set<string>): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Mirrors Start a circle "More options" scroll-into-view behavior. */
export function scrollAnchoredSectionIntoView(
  scrollEl: HTMLElement,
  anchor: HTMLElement,
  pad = 12,
): void {
  const s = scrollEl.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  if (a.bottom > s.bottom - pad) {
    scrollEl.scrollBy({ top: a.bottom - s.bottom + pad, behavior: "smooth" });
  } else if (a.top < s.top + pad) {
    scrollEl.scrollBy({ top: a.top - s.top - pad, behavior: "smooth" });
  }
}

export function deriveInitialFormState(
  options: MatchPrepOptionsData,
  saved: MatchPrepCurrentData | undefined,
): MatchPrepInitialFormState {
  const moodIds =
    saved && saved.moodIds.length > 0
      ? saved.moodIds
      : options.moods[0]?.id
        ? [options.moods[0].id]
        : [];
  const lookingForIds =
    saved && saved.lookingForIds.length > 0
      ? saved.lookingForIds
      : options.lookingFor[0]?.id
        ? [options.lookingFor[0].id]
        : [];
  const interestIds =
    saved && saved.interestIds.length > 0
      ? saved.interestIds
      : options.interests[0]?.id
        ? [options.interests[0].id]
        : [];

  const selectedActivityIds = new Set(
    saved?.activitySelections.map((a) => a.activityId) ?? [],
  );
  const activityDetails: Record<string, string> = {};
  for (const row of saved?.activitySelections ?? []) {
    if (row.detail) activityDetails[row.activityId] = row.detail;
  }

  return {
    matchIntent: saved?.matchIntent ?? "quick",
    selectedActivityIds,
    activityDetails,
    moods: new Set(moodIds),
    lookingFor: new Set(lookingForIds),
    interests: new Set(interestIds),
    connectionPreference: saved?.connectionPreference ?? "open_to_anyone",
    locationPreferenceEnabled: saved?.locationPreferenceEnabled ?? false,
    distancePreference: saved?.distancePreference ?? "random",
    location:
      saved?.location?.country &&
      saved?.location?.countryCode &&
      typeof saved?.location?.latitude === "number" &&
      typeof saved?.location?.longitude === "number"
        ? {
            country: saved.location.country,
            countryCode: saved.location.countryCode,
            region: saved.location.region ?? undefined,
            regionCode: saved.location.regionCode ?? undefined,
            city: saved.location.city ?? undefined,
            latitude: saved.location.latitude ?? undefined,
            longitude: saved.location.longitude ?? undefined,
            source: "manual",
          }
        : null,
    sessionGoal: saved?.sessionGoal?.trim() ? saved.sessionGoal : "",
  };
}
