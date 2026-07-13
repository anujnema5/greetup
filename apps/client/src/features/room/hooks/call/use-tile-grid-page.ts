"use client";

import { useCallback, useEffect, useState } from "react";

/** Prev/next page for a 2×2 (or similar) camera tile grid. Jumps back to page 1 when `resetWhen` changes. */
export function useTileGridPage(totalPages: number, resetWhen: string | null | undefined) {
  const maxPage = Math.max(0, totalPages - 1);
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, maxPage);

  useEffect(() => {
    setPage(0);
  }, [resetWhen]);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage));
  }, [maxPage]);

  const goToPreviousPage = useCallback(
    () => setPage((p) => Math.max(0, Math.min(p, maxPage) - 1)),
    [maxPage],
  );
  const goToNextPage = useCallback(
    () => setPage((p) => Math.min(Math.min(p, maxPage) + 1, maxPage)),
    [maxPage],
  );

  return {
    currentPage,
    maxPage,
    totalPages,
    goToPreviousPage,
    goToNextPage,
  };
}
