import type { TOUR_TARGETS } from "../constants/tour-targets";

export type TourTargetId = (typeof TOUR_TARGETS)[keyof typeof TOUR_TARGETS];

export type TourId = "welcome";

export type TourStepDefinition = {
  target: TourTargetId;
  title: string;
  description: string;
  /** Omit on viewports below Tailwind `lg` (1024px). */
  desktopOnly?: boolean;
};

export type TourDefinition = {
  id: TourId;
  steps: TourStepDefinition[];
};

export type StartTourOptions = {
  /** When true, runs even if the user already saw the tour (Settings replay). */
  force?: boolean;
};

export type TourGuideContextValue = {
  startTour: (tourId: TourId, options?: StartTourOptions) => void;
  replayTour: (tourId: TourId) => void;
  isTourActive: boolean;
};
