import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type SuggestedPersonItem = {
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

export type SuggestedPeopleData = {
  items: SuggestedPersonItem[];
  hasInterests: boolean;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type SuggestedPeopleApiResponse = ApiResponse<SuggestedPeopleData>;
