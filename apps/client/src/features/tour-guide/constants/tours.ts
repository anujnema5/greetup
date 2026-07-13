import { TOUR_GUIDE } from "@/lib/copy/tour-guide-messages";

import { TOUR_TARGETS } from "./tour-targets";
import type { TourDefinition } from "../types/tour.types";

export const TOUR_DEFINITIONS = {
  welcome: {
    id: "welcome",
    steps: [
      {
        target: TOUR_TARGETS.mainNav,
        title: TOUR_GUIDE.welcome.nav.title,
        description: TOUR_GUIDE.welcome.nav.description,
      },
      {
        target: TOUR_TARGETS.matchOrb,
        title: TOUR_GUIDE.welcome.matchOrb.title,
        description: TOUR_GUIDE.welcome.matchOrb.description,
      },
      {
        target: TOUR_TARGETS.activityMatch,
        title: TOUR_GUIDE.welcome.activityMatch.title,
        description: TOUR_GUIDE.welcome.activityMatch.description,
      },
      {
        target: TOUR_TARGETS.openToConnect,
        title: TOUR_GUIDE.welcome.openToConnect.title,
        description: TOUR_GUIDE.welcome.openToConnect.description,
      },
      {
        target: TOUR_TARGETS.spaceOrb,
        title: TOUR_GUIDE.welcome.spaceOrb.title,
        description: TOUR_GUIDE.welcome.spaceOrb.description,
      },
      {
        target: TOUR_TARGETS.changePreferences,
        title: TOUR_GUIDE.welcome.preferences.title,
        description: TOUR_GUIDE.welcome.preferences.description,
      },
      {
        target: TOUR_TARGETS.spacesGrid,
        title: TOUR_GUIDE.welcome.spacesGrid.title,
        description: TOUR_GUIDE.welcome.spacesGrid.description,
      },
      {
        target: TOUR_TARGETS.dashboardSidebar,
        title: TOUR_GUIDE.welcome.sidebar.title,
        description: TOUR_GUIDE.welcome.sidebar.description,
        desktopOnly: true,
      },
    ],
  },
} satisfies Record<"welcome", TourDefinition>;
