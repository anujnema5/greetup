import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";

import type { BrowseNicheItem } from "./browse-niches.types";
import type { SearchUserItem } from "./user-search.types";

export type AppSearchResults = {
  query: string;
  debouncedQuery: string;
  canSearch: boolean;
  isLoading: boolean;
  hasResults: boolean;
  minLength: number;
  people: SearchUserItem[];
  spaces: ActiveSpaceItem[];
  topics: BrowseNicheItem[];
};

export type AppSearchDropdownProps = AppSearchResults & {
  onSelectSpace: (space: ActiveSpaceItem) => void;
  onSelectTopic: (topic: BrowseNicheItem) => void;
  onResultActivate?: () => void;
};
