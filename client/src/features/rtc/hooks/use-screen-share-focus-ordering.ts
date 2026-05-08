"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  effectiveScreenShareFocusKey,
  stableSortedScreenShareKeys,
} from "@/features/rtc/lib/screen-share-stage";
import type { ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";

type ShareLayoutState = {
  order: string[];
  generation: number;
};

/**
 * Maintains stable screen-share ordering and pin invalidation without ref reads in render.
 * New share arrivals bump `generation`; a pin from an older generation is ignored.
 */
export function useScreenShareFocusOrdering(screenShareTiles: ScreenShareTileInfo[]) {
  const sortedKeys = useMemo(() => stableSortedScreenShareKeys(screenShareTiles), [screenShareTiles]);
  const [layout, setLayout] = useState<ShareLayoutState>({ order: [], generation: 0 });
  const [pin, setPin] = useState<{ key: string | null; generation: number }>({
    key: null,
    generation: -1,
  });

  useEffect(() => {
    setLayout((prev) => {
      if (sortedKeys.length === 0) {
        return prev.order.length === 0 ? prev : { order: [], generation: prev.generation };
      }

      const active = new Set(sortedKeys);
      const kept = prev.order.filter((k) => active.has(k));
      const keptSet = new Set(kept);
      const brandNew = sortedKeys.filter((k) => !keptSet.has(k));
      const order = [...kept, ...brandNew];
      const hasNew = brandNew.length > 0;
      const generation = hasNew ? prev.generation + 1 : prev.generation;

      if (
        generation === prev.generation &&
        order.length === prev.order.length &&
        order.every((k, i) => k === prev.order[i])
      ) {
        return prev;
      }
      return { order, generation };
    });
  }, [sortedKeys]);

  const setFocusedScreenShareKey = useCallback((key: string | null) => {
    setPin((prev) => {
      if (prev.key === key && prev.generation === layout.generation) return prev;
      return { key, generation: layout.generation };
    });
  }, [layout.generation]);

  const userPinnedScreenKey = pin.generation === layout.generation ? pin.key : null;
  const focusedScreenShareKey = useMemo(
    () => effectiveScreenShareFocusKey(userPinnedScreenKey, layout.order),
    [layout.order, userPinnedScreenKey],
  );

  return {
    orderedScreenKeys: layout.order,
    focusedScreenShareKey,
    setFocusedScreenShareKey,
  };
}
