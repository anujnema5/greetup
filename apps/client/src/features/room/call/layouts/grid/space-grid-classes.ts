/** Responsive grid column classes for circle call (you + remotes). */
export function spaceGridClass(groupTileCount: number): string {
  if (groupTileCount === 1) return "grid-cols-1";
  if (groupTileCount === 2) return "grid-cols-1 sm:grid-cols-2";
  if (groupTileCount === 3)
    return "grid-cols-2 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-auto md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";
  if (groupTileCount <= 4) return "grid-cols-2";
  if (groupTileCount <= 6) return "grid-cols-2 md:grid-cols-3";
  if (groupTileCount <= 9) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}
