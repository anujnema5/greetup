import type { ActiveSpaceItem } from "./active-space.types";

export type BrowseNicheItem = {
  id: string;
  slug: string;
  displayName: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
  liveGroupCount: number;
  scheduledGroupCount: number;
};

export type BrowseNichesResult = {
  niches: BrowseNicheItem[];
};

export type BrowseNicheRoomsResult = {
  items: ActiveSpaceItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
