"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

import type { RoomVideoToolbarSecondaryId } from "@/features/room/hooks/use-room-video-toolbar-secondaries";

/** Matches `ToolbarButtonColumn` width (`w-16`) for wide-layout overflow math */
const EST_ICON_PX = 64;

function maxSecondaryInlineCount(
  availablePx: number,
  total: number,
  iconGapPx: number,
): number {
  if (total <= 0 || availablePx <= 0) return 0;
  for (let k = total; k >= 0; k--) {
    let used = 0;
    if (k > 0) {
      used = k * EST_ICON_PX + Math.max(0, k - 1) * iconGapPx;
    }
    if (k < total) {
      used += (k > 0 ? iconGapPx : 0) + EST_ICON_PX;
    }
    if (used <= availablePx) return k;
  }
  return 0;
}

/**
 * Wide toolbar: how many secondary actions fit before “More”. Narrow: all are in the scroll strip.
 */
export function useRoomVideoToolbarInlineCount(
  rootRef: RefObject<HTMLDivElement | null>,
  mediaRef: RefObject<HTMLDivElement | null>,
  endRef: RefObject<HTMLDivElement | null>,
  narrowToolbar: boolean,
  toolbarFlowSecondaries: RoomVideoToolbarSecondaryId[],
  skipPinnedMobile: boolean,
): number {
  const [inlineSecondaryCount, setInlineSecondaryCount] = useState(
    toolbarFlowSecondaries.length,
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      if (narrowToolbar) {
        setInlineSecondaryCount(toolbarFlowSecondaries.length);
        return;
      }

      const media = mediaRef.current;
      const end = endRef.current;
      if (!media || !end) return;

      const rw = root.getBoundingClientRect().width;
      const mw = media.getBoundingClientRect().width;
      const ew = end.getBoundingClientRect().width;
      const iconGapPx = 10;
      const reservedForPinnedSkip = skipPinnedMobile ? EST_ICON_PX + iconGapPx : 0;
      const gapPx = 8;
      const flexGaps = 3;
      const dividerPx = 1;
      const rowGapsPx = gapPx * flexGaps + dividerPx;
      const available = rw - mw - ew - rowGapsPx - 4 - reservedForPinnedSkip;

      const fitted = maxSecondaryInlineCount(
        available,
        toolbarFlowSecondaries.length,
        iconGapPx,
      );
      setInlineSecondaryCount(Math.min(toolbarFlowSecondaries.length, fitted));
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [toolbarFlowSecondaries, skipPinnedMobile, narrowToolbar]);

  return inlineSecondaryCount;
}
