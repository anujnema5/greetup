import type { TourId } from "../types/tour.types";

/** Session-only flag for replay flow after navigating from Settings. */
const PENDING_TOUR_KEY = "greetup:pending-tour";

export function setPendingTour(tourId: TourId): void {
  window.sessionStorage.setItem(PENDING_TOUR_KEY, tourId);
}

export function consumePendingTour(): TourId | null {
  const pending = window.sessionStorage.getItem(PENDING_TOUR_KEY);
  window.sessionStorage.removeItem(PENDING_TOUR_KEY);
  return pending === "welcome" ? pending : null;
}
