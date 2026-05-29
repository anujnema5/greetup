import type { CirclesBrowseSectionCopy, CirclesBrowseTab } from "../types/circles-browse.types";

export const CIRCLES_BROWSE_PAGE = {
  title: "Circles",
  subtitle: "Invites, your circles, and public rooms",
  backLabel: "Back to home",
  startCircle: "Start circle",
  refresh: "Refresh list",
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
    description: "Friend invites you have not joined yet",
    empty: "No pending invites right now.",
  },
  mine: {
    title: "Your circles",
    description: "Rooms you host or have joined",
    empty: "You have not joined any circles yet.",
  },
  discover: {
    title: "Discover",
    description: "Public circles you can join",
    empty: "No public circles to discover right now.",
  },
};

export const CIRCLES_BROWSE_EMPTY = {
  title: "No circles to show yet",
  description: "Start a circle or check back later for public rooms you can join.",
  cta: "Start a circle",
} as const;

export const CIRCLES_GRID_COPY = {
  title: "Active Circles",
  subtitle: "Live now or coming up soon",
  viewAll: "View all",
  emptyPrefix: "No active circles right now —",
  exploreLink: "explore circles",
} as const;

/** Default page size for browse infinite query (discover pagination). */
export const CIRCLES_BROWSE_PAGE_SIZE = 12;
