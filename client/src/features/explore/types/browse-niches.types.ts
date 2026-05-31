import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

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

export type BrowseNichesData = {
  niches: BrowseNicheItem[];
};

export type BrowseNichesApiResponse = ApiResponse<BrowseNichesData>;

export type BrowseNicheRoomsData = {
  items: ActiveCircleItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BrowseNicheRoomsApiResponse = ApiResponse<BrowseNicheRoomsData>;

export type BrowseNicheRoomsQueryArgs = {
  categoryId: string;
  cursor?: string;
  limit?: number;
};
