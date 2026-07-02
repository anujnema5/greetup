import type { SpacesBrowseSectionCopy, SpacesBrowseTab } from "../types/spaces-browse.types";
import { SPACES_HOME } from "@/lib/copy/user-messages";

export const SPACES_BROWSE_PAGE = {
  title: "Spaces",
  subtitle: "Invites, your spaces, and rooms you can join",
  backLabel: "Back to Home",
  startSpace: "Start a space",
  refresh: "Refresh",
  refreshing: "Refreshing…",
} as const;

export const SPACES_BROWSE_TABS: ReadonlyArray<{ value: SpacesBrowseTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "invited", label: "Invited" },
  { value: "mine", label: "Yours" },
  { value: "discover", label: "Discover" },
];

export const SPACES_BROWSE_SECTIONS: Record<
  "invited" | "mine" | "discover",
  SpacesBrowseSectionCopy
> = {
  invited: {
    title: "Invited to you",
    description: "Spaces friends invited you to",
    empty: "No invites right now.",
  },
  mine: {
    title: "Your spaces",
    description: "Spaces you host or joined",
    empty: "You have not joined a space yet.",
  },
  discover: {
    title: "Discover",
    description: "Public spaces open to join",
    empty: "No public spaces right now.",
  },
};

export const SPACES_BROWSE_EMPTY = {
  title: "No spaces yet",
  description: "Start your own space or check back later for rooms to join.",
  cta: "Start a space",
} as const;

export const SPACES_GRID_COPY = SPACES_HOME;

/** Default page size for browse infinite query (discover pagination). */
export const SPACES_BROWSE_PAGE_SIZE = 12;
