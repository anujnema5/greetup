"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

import type { RoomVideoToolbarSecondaryId } from "@/features/room/hooks/toolbar/use-room-video-toolbar-secondaries";

/** Matches `ToolbarButtonColumn` width (`w-16`) for wide-layout overflow math */
const EST_ICON_PX = 64;
/** Extra px so fit count doesn't flip when layout shifts by a few pixels */
const FIT_SLACK_PX = 12;

function usedWidthForInlineCount(
  inlineCount: number,
  total: number,
  iconGapPx: number,
): number {
  if (total <= 0 || inlineCount <= 0) {
    return inlineCount < total ? EST_ICON_PX : 0;
  }

  let used = inlineCount * EST_ICON_PX + Math.max(0, inlineCount - 1) * iconGapPx;
  if (inlineCount < total) {
    used += iconGapPx + EST_ICON_PX;
  }
  return used;
}

function maxSecondaryInlineCount(
  availablePx: number,
  total: number,
  iconGapPx: number,
): number {
  if (total <= 0 || availablePx <= 0) return 0;

  const budget = availablePx - FIT_SLACK_PX;
  if (budget <= 0) return 0;

  for (let k = total; k >= 0; k--) {
    if (usedWidthForInlineCount(k, total, iconGapPx) <= budget) return k;
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
  const secondaryTotal = toolbarFlowSecondaries.length;
  const secondaryKey = toolbarFlowSecondaries.join("|");

  const [inlineSecondaryCount, setInlineSecondaryCount] = useState(secondaryTotal);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frameId = 0;

    const measure = () => {
      if (narrowToolbar) {
        setInlineSecondaryCount((prev) => (prev === secondaryTotal ? prev : secondaryTotal));
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

      const fitted = maxSecondaryInlineCount(available, secondaryTotal, iconGapPx);
      const next = Math.min(secondaryTotal, fitted);

      setInlineSecondaryCount((prev) => {
        const cappedPrev = Math.min(prev, secondaryTotal);
        if (next === cappedPrev) return cappedPrev;

        const budget = available - FIT_SLACK_PX;
        const prevFits =
          cappedPrev > 0 &&
          usedWidthForInlineCount(cappedPrev, secondaryTotal, iconGapPx) <= budget;

        if (!prevFits) return next;

        if (next > cappedPrev) {
          const nextFits =
            usedWidthForInlineCount(next, secondaryTotal, iconGapPx) <= budget;
          return nextFits ? next : cappedPrev;
        }

        // prev still fits and we'd shrink — keep count to avoid layout feedback loops.
        return cappedPrev;
      });
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, [
    endRef,
    mediaRef,
    rootRef,
    secondaryKey,
    secondaryTotal,
    skipPinnedMobile,
    narrowToolbar,
  ]);

  return inlineSecondaryCount;
}
