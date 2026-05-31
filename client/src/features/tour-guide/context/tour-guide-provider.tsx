"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "../styles/tour-guide.css";

import { useMediaQuery } from "@/lib/hooks/use-media-query";

import { useMarkWelcomeTourSeenMutation } from "../api/tour-guide-api";
import { createTourDriver } from "../lib/create-tour-driver";
import { setPendingTour } from "../lib/tour-storage";
import { usePendingTourOnHome } from "../hooks/use-pending-tour-on-home";
import type {
  StartTourOptions,
  TourGuideContextValue,
  TourId,
} from "../types/tour.types";

const TourGuideContext = createContext<TourGuideContextValue | null>(null);

type TourGuideProviderProps = {
  children: ReactNode;
};

export function TourGuideProvider({ children }: TourGuideProviderProps) {
  const router = useRouter();
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const driverRef = useRef<Driver | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [markWelcomeTourSeen] = useMarkWelcomeTourSeenMutation();

  const destroyActiveDriver = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const persistWelcomeTourSeen = useCallback(() => {
    void markWelcomeTourSeen();
  }, [markWelcomeTourSeen]);

  const startTour = useCallback(
    (tourId: TourId, options?: StartTourOptions) => {
      if (typeof window === "undefined") return;
      if (isTourActive && !options?.force) return;

      destroyActiveDriver();

      const isForcedReplay = options?.force === true;

      const driverInstance = createTourDriver({
        tourId,
        isLgUp,
        onActiveChange: setIsTourActive,
        onFinished: (id) => {
          if (id === "welcome" && !isForcedReplay) persistWelcomeTourSeen();
        },
        onSkipped: (id) => {
          if (id === "welcome" && !isForcedReplay) persistWelcomeTourSeen();
        },
      });

      driverRef.current = driverInstance;
      setIsTourActive(true);
      driverInstance.drive();
    },
    [destroyActiveDriver, isLgUp, isTourActive, persistWelcomeTourSeen],
  );

  const replayTour = useCallback(
    (tourId: TourId) => {
      setPendingTour(tourId);

      if (tourId === "welcome") {
        router.push("/home");
      }
    },
    [router],
  );

  const value = useMemo<TourGuideContextValue>(
    () => ({
      startTour,
      replayTour,
      isTourActive,
    }),
    [isTourActive, replayTour, startTour],
  );

  usePendingTourOnHome(startTour);

  return (
    <TourGuideContext.Provider value={value}>{children}</TourGuideContext.Provider>
  );
}

export function useTourGuide(): TourGuideContextValue {
  const context = useContext(TourGuideContext);
  if (!context) {
    throw new Error("useTourGuide must be used within TourGuideProvider");
  }
  return context;
}
