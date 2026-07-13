"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaginatedTileGridProps = {
  totalTiles: number;
  tilesPerPage: number;
  gridClassName: string;
  shellClassName?: string;
  renderTile: (tileIndex: number, spanFullWidth: boolean) => ReactNode;
  /** `dots` = pill indicators; `text` = Prev/Next labels (sidebar). */
  paginationVariant?: "dots" | "text";
};

export function PaginatedTileGrid({
  totalTiles,
  tilesPerPage,
  gridClassName,
  shellClassName,
  renderTile,
  paginationVariant = "dots",
}: PaginatedTileGridProps) {
  const totalPages = Math.ceil(totalTiles / tilesPerPage);
  const maxPage = Math.max(0, totalPages - 1);

  const [page, setPage] = useState(0);
  const viewPage = Math.min(page, maxPage);

  useEffect(() => {
    queueMicrotask(() => {
      setPage((p) => Math.min(p, maxPage));
    });
  }, [maxPage]);

  const prev = useCallback(() => setPage((p) => Math.max(0, Math.min(p, maxPage) - 1)), [maxPage]);
  const next = useCallback(
    () => setPage((p) => Math.min(Math.min(p, maxPage) + 1, maxPage)),
    [maxPage],
  );

  const touchStartX = useRef(0);
  const pageStart = viewPage * tilesPerPage;
  const pageEnd = Math.min(pageStart + tilesPerPage, totalTiles);
  const tilesOnPage = pageEnd - pageStart;
  const singleTile = tilesOnPage === 1;

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-1", shellClassName)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]!.clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0]!.clientX - touchStartX.current;
        if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
      }}
    >
      <div className={cn("min-h-0 flex-1 grid auto-rows-fr gap-1", gridClassName)}>
        {Array.from({ length: tilesOnPage }, (_, i) => renderTile(pageStart + i, singleTile))}
      </div>

      {totalPages > 1 ? (
        paginationVariant === "text" ? (
          <div className="flex w-full shrink-0 items-center justify-between gap-2 px-0.5 md:px-1">
            <button
              type="button"
              onClick={prev}
              disabled={viewPage === 0}
              aria-label={`Previous page ${viewPage + 1} of ${totalPages}`}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
                viewPage === 0 && "pointer-events-none opacity-30",
              )}
            >
              <span className="inline-flex items-center gap-0.5">
                <ChevronLeft size={18} className="shrink-0" />
                <span className="hidden sm:inline">Prev</span>
              </span>
            </button>
            <span className="sr-only">
              Page {viewPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={viewPage >= maxPage}
              aria-label={`Next page ${viewPage + 1} of ${totalPages}`}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
                viewPage >= maxPage && "pointer-events-none opacity-30",
              )}
            >
              <span className="inline-flex items-center gap-0.5">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={18} className="shrink-0" />
              </span>
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center gap-3 py-0.5">
            <button
              type="button"
              onClick={prev}
              disabled={viewPage === 0}
              aria-label="Previous page"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
                viewPage === 0 && "pointer-events-none opacity-30",
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Page ${i + 1}`}
                  className={cn(
                    "rounded-full bg-white transition-all duration-200",
                    i === viewPage
                      ? "h-2 w-5 opacity-100"
                      : "h-1.5 w-1.5 opacity-40 hover:opacity-70",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={viewPage >= maxPage}
              aria-label="Next page"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
                viewPage >= maxPage && "pointer-events-none opacity-30",
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
