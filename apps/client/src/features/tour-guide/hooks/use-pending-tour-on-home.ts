"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { consumePendingTour } from "../lib/tour-storage";
import type { StartTourOptions, TourId } from "../types/tour.types";

/** Starts a tour queued via `replayTour` once the user lands on Home. */
export function usePendingTourOnHome(
  startTour: (tourId: TourId, options?: StartTourOptions) => void,
) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/home") return;

    const pending = consumePendingTour();
    if (!pending) return;

    const timer = window.setTimeout(() => {
      startTour(pending, { force: true });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pathname, startTour]);
}
