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
        target: TOUR_TARGETS.circleOrb,
        title: TOUR_GUIDE.welcome.circleOrb.title,
        description: TOUR_GUIDE.welcome.circleOrb.description,
      },
      {
        target: TOUR_TARGETS.changePreferences,
        title: TOUR_GUIDE.welcome.preferences.title,
        description: TOUR_GUIDE.welcome.preferences.description,
      },
      {
        target: TOUR_TARGETS.circlesGrid,
        title: TOUR_GUIDE.welcome.circlesGrid.title,
        description: TOUR_GUIDE.welcome.circlesGrid.description,
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
