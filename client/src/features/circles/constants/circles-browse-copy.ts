import type { CirclesBrowseSectionCopy, CirclesBrowseTab } from "../types/circles-browse.types";
import { CIRCLES_HOME } from "@/lib/copy/user-messages";

export const CIRCLES_BROWSE_PAGE = {
  title: "Circles",
  subtitle: "Invites, your circles, and rooms you can join",
  backLabel: "Back to Home",
  startCircle: "Start a circle",
  refresh: "Refresh",
  refreshing: "Refreshing…",
} as const;

export const CIRCLES_BROWSE_TABS: ReadonlyArray<{ value: CirclesBrowseTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "invited", label: "Invited" },
  { value: "mine", label: "Yours" },
  { value: "discover", label: "Discover" },
];

export const CIRCLES_BROWSE_SECTIONS: Record<
  "invited" | "mine" | "discover",
  CirclesBrowseSectionCopy
> = {
  invited: {
    title: "Invited to you",
    description: "Circles friends invited you to",
    empty: "No invites right now.",
  },
  mine: {
    title: "Your circles",
    description: "Circles you host or joined",
    empty: "You have not joined a circle yet.",
  },
  discover: {
    title: "Discover",
    description: "Public circles open to join",
    empty: "No public circles right now.",
  },
};

export const CIRCLES_BROWSE_EMPTY = {
  title: "No circles yet",
  description: "Start your own circle or check back later for rooms to join.",
  cta: "Start a circle",
} as const;

export const CIRCLES_GRID_COPY = CIRCLES_HOME;

/** Default page size for browse infinite query (discover pagination). */
export const CIRCLES_BROWSE_PAGE_SIZE = 12;
