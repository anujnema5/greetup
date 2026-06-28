export type OpenToConnectSource = "manual" | "post_no_match";

export type OpenToConnectTags = {
  profileId: string;
  userId: string;
  displayName: string | null;
  headline: string | null;
  activityIds: string[];
  moodIds: string[];
  interestIds: string[];
  updatedAt: string;
};

export type OpenToConnectMeDto = {
  /** User preference — stays true while temporarily hidden in a room. */
  openToConnect: boolean;
  /** True when preference is on but discovery is paused because user is in a room. */
  pausedForRoom: boolean;
  source: OpenToConnectSource | null;
  headline: string | null;
  updatedAt: string | null;
  activityIds: string[];
  moodIds: string[];
  interestIds: string[];
  visibleInDiscovery: boolean;
};

export type OpenToConnectActivityTagDto = {
  activityId: string;
  name: string;
  displayName: string;
  emoji: string | null;
  detail: string | null;
};

export type OpenToConnectFeedItemDto = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  headline: string | null;
  activities: OpenToConnectActivityTagDto[];
  lookingFor: string[];
  profession: string | null;
  sharedInterestCount: number;
  sharedInterests: string[];
  isOnline: boolean;
};

export type OpenToConnectFeedResultDto = {
  items: OpenToConnectFeedItemDto[];
  nextCursor: string | null;
  limit: number;
};
