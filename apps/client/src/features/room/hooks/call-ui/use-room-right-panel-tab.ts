"use client";

import { useCallback, useState } from "react";

import {
  selectCallRightPanelTab,
  useRoomStore,
} from "@/features/room/state/room.store";
import type { RoomCallRightPanelTab } from "@/features/room/types/call/room-call-panel.types";

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
 * - Tab lives in the room store so minimize → expand restores the same selection.
 * - Auto-switches to `"participants"` when `showPeopleTab` rises false→true at xl+ while
 *   mounted (share / embedded activity starts). First xl+ paint only seeds the edge
 *   detector so returning from the minimized dock does not override the restored tab.
 * - Falls back to `"chat"` when the stored tab's content has gone away — derived from the
 *   stored value and availability flags, so no effect is required.
 * - `surfacePeopleIfAvailable` lets event handlers (e.g. exiting the share fullscreen)
 *   re-assert People when it's still meaningful.
 */
export function useRoomRightPanelTab({
  showPeopleTab,
  showActivitiesTab,
  xlUp,
}: UseRoomRightPanelTabParams): UseRoomRightPanelTabResult {
  const storedTab = useRoomStore(selectCallRightPanelTab);
  const setTab = useRoomStore((s) => s.setCallRightPanelTab);
  const [seenShowPeopleTab, setSeenShowPeopleTab] = useState<boolean | null>(null);

  if (xlUp && seenShowPeopleTab === null) {
    // Seed on first xl+ observation — do not treat remount / hydrate as a rising edge.
    setSeenShowPeopleTab(showPeopleTab);
  } else if (xlUp && showPeopleTab !== seenShowPeopleTab) {
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
  }, [xlUp, showPeopleTab, setTab]);

  return { tab, setTab, surfacePeopleIfAvailable };
}
