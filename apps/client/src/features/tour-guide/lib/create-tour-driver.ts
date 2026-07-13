import { driver, type Config, type DriveStep, type Driver } from "driver.js";

import { TOUR_GUIDE } from "@/lib/copy/tour-guide-messages";

import { TOUR_DEFINITIONS } from "../constants/tours";
import type { TourId } from "../types/tour.types";
import { enhanceTourPopover } from "./enhance-tour-popover";
import { queryVisibleTourTarget } from "./tour-element";

const POPOVER_CLASS = "greetup-tour-popover";

type CreateTourDriverArgs = {
  tourId: TourId;
  isLgUp: boolean;
  onFinished: (tourId: TourId) => void;
  onSkipped: (tourId: TourId) => void;
  onActiveChange: (active: boolean) => void;
};

function buildDriveSteps(tourId: TourId, isLgUp: boolean): DriveStep[] {
  const definition = TOUR_DEFINITIONS[tourId];

  return definition.steps
    .filter((step) => !step.desktopOnly || isLgUp)
    .map((step, index, steps) => {
      const isLast = index === steps.length - 1;

      return {
        element: () => {
          const target = queryVisibleTourTarget(step.target);
          if (!target) {
            throw new Error(`Tour target not found: ${step.target}`);
          }
          return target;
        },
        popover: {
          title: step.title,
          description: step.description,
          showButtons: ["previous", "next", "close"],
          nextBtnText: isLast ? TOUR_GUIDE.controls.done : TOUR_GUIDE.controls.next,
          prevBtnText: TOUR_GUIDE.controls.back,
          doneBtnText: TOUR_GUIDE.controls.done,
          popoverClass: POPOVER_CLASS,
        },
      } satisfies DriveStep;
    });
}

export function createTourDriver({
  tourId,
  isLgUp,
  onFinished,
  onSkipped,
  onActiveChange,
}: CreateTourDriverArgs): Driver {
  const steps = buildDriveSteps(tourId, isLgUp);
  let completedNaturally = false;

  const config: Config = {
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.65,
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: POPOVER_CLASS,
    progressText: "{{current}} of {{total}}",
    onPopoverRender: (popover) => {
      enhanceTourPopover(popover);
    },
    steps,
    onNextClick: (_element, _step, { driver: activeDriver }) => {
      const activeIndex = activeDriver.getActiveIndex() ?? 0;
      if (activeIndex >= steps.length - 1) {
        completedNaturally = true;
      }
      activeDriver.moveNext();
    },
    onDestroyed: () => {
      onActiveChange(false);
      if (completedNaturally) {
        onFinished(tourId);
      } else {
        onSkipped(tourId);
      }
    },
  };

  return driver(config);
}
