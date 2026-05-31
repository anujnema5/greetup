import type { TourTargetId } from "../types/tour.types";

/** First visible anchor for a tour target (handles sidebar vs bottom nav duplicates). */
export function queryVisibleTourTarget(targetId: TourTargetId): Element | undefined {
  const nodes = document.querySelectorAll(`[data-tour-id="${targetId}"]`);

  for (const node of nodes) {
    const element = node as HTMLElement;
    if (element.getClientRects().length > 0) {
      return element;
    }
  }

  return undefined;
}
