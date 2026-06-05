"use client";

import { useCallback, useEffect, useState } from "react";

import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

import { useLazyGetBrowseNicheRoomsQuery } from "../api/browse-niches-api";
import type { BrowseNicheItem } from "../types/browse-niches.types";

const ROOMS_PAGE_SIZE = 20;

export function useExploreNicheRoomsModal() {
  const [selectedNiche, setSelectedNiche] = useState<BrowseNicheItem | null>(null);
  const [rooms, setRooms] = useState<ActiveCircleItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [fetchRooms, { isFetching, isError }] = useLazyGetBrowseNicheRoomsQuery();

  const open = selectedNiche !== null;

  const loadPage = useCallback(
    async (niche: BrowseNicheItem, nextCursor?: string) => {
      const result = await fetchRooms({
        categoryId: niche.id,
        cursor: nextCursor,
        limit: ROOMS_PAGE_SIZE,
      }).unwrap();

      setRooms((prev) => (nextCursor ? [...prev, ...result.items] : result.items));
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    },
    [fetchRooms],
  );

  const openForNiche = useCallback(
    (niche: BrowseNicheItem) => {
      setSelectedNiche(niche);
      setRooms([]);
      setCursor(null);
      setHasMore(false);
      void loadPage(niche);
    },
    [loadPage],
  );

  const close = useCallback(() => {
    setSelectedNiche(null);
    setRooms([]);
    setCursor(null);
    setHasMore(false);
  }, []);

  const loadMore = useCallback(() => {
    if (!selectedNiche || !hasMore || !cursor || isFetching) return;
    void loadPage(selectedNiche, cursor);
  }, [cursor, hasMore, isFetching, loadPage, selectedNiche]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  return {
    selectedNiche,
    open,
    rooms,
    isLoading: isFetching && rooms.length === 0,
    isLoadingMore: isFetching && rooms.length > 0,
    isError,
    hasMore,
    openForNiche,
    close,
    loadMore,
  };
}
