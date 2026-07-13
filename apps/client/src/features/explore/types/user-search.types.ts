import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type SearchUserItem = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

export type SearchUsersData = {
  items: SearchUserItem[];
};

export type SearchUsersApiResponse = ApiResponse<SearchUsersData>;
