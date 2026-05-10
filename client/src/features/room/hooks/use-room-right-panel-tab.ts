"use client";

import { useCallback, useState } from "react";

import type { RoomCallRightPanelTab } from "@/features/room/types/room-call-panel.types";

export type UseRoomRightPanelTabParams = {
  /** True while screen share / an embedded activity makes the People panel meaningful. */
  showPeopleTab: boolean;
  /** True while the Activities tab has any `is_active` tile. */
  showActivitiesTab: boolean;
  /** `true` once Tailwind's `xl` breakpoint has resolved (matchMedia is `false` on first paint). */
  xlUp: boolean;
};

export type UseRoomRightPanelTabResult = {
  tab: RoomCallRightPanelTab;
  setTab: (tab: RoomCallRightPanelTab) => void;
  /** Re-asserts the People panel when it's available — used after collapsing the share stage. */
  surfacePeopleIfAvailable: () => void;
};

/**
 * Owns the right-hand panel tab in the in-call view and the auto-routing rules around it:
 *
 * - Auto-switches to `"participants"` when `showPeopleTab` becomes `true` at xl+ (share /
 *   embedded activity starts, or we remount into a call that already has one). Implemented
 *   by adjusting state during render (React's canonical pattern for prop transitions), which
 *   keeps the rule out of an effect and avoids cascading-render warnings.
 * - Falls back to `"chat"` when the stored tab's content has gone away — derived from the
 *   stored value and availability flags, so no effect is required.
 * - `surfacePeopleIfAvailable` lets event handlers (e.g. exiting the share fullscreen)
 *   re-assert People when it's still meaningful.
 *
 * xlUp gate: matchMedia returns `false` synchronously on first paint. Tracking the last
 * `showPeopleTab` we observed *while xl+* defers the transition until xlUp resolves, so a
 * call that's already sharing on mount (e.g. returning from the minimized dock) still trips
 * the auto-switch.
 */
export function useRoomRightPanelTab({
  showPeopleTab,
  showActivitiesTab,
  xlUp,
}: UseRoomRightPanelTabParams): UseRoomRightPanelTabResult {
  const [storedTab, setTab] = useState<RoomCallRightPanelTab>("chat");
  const [seenShowPeopleTab, setSeenShowPeopleTab] = useState<boolean | null>(null);

  if (xlUp && showPeopleTab !== seenShowPeopleTab) {
    setSeenShowPeopleTab(showPeopleTab);
    if (showPeopleTab && !seenShowPeopleTab) {
      setTab("participants");
    }
  }

  const tab: RoomCallRightPanelTab =
    (storedTab === "participants" && !showPeopleTab) ||
    (storedTab === "activities" && !showActivitiesTab)
      ? "chat"
      : storedTab;

  const surfacePeopleIfAvailable = useCallback(() => {
    if (xlUp && showPeopleTab) setTab("participants");
  }, [xlUp, showPeopleTab]);

  return { tab, setTab, surfacePeopleIfAvailable };
}
