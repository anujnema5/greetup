import type { ActiveCircleItem } from "./active-circle.types";

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
  items: ActiveCircleItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
