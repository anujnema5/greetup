export type SuggestedPersonHit = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  tagline: string;
  matchScore: number;
  sharedInterestCount: number;
  isOnline: boolean;
};

export type SuggestPeopleResult = {
  items: SuggestedPersonHit[];
  hasInterests: boolean;
  page: number;
  limit: number;
  hasMore: boolean;
};
