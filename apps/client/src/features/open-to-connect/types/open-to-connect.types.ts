export type OpenNowActivityTag = {
  activityId: string;
  name: string;
  displayName: string;
  emoji: string | null;
  detail: string | null;
};

export type OpenNowFeedItem = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  headline: string | null;
  activities: OpenNowActivityTag[];
  lookingFor: string[];
  profession: string | null;
  sharedInterestCount: number;
  sharedInterests: string[];
  isOnline: boolean;
};

export type OpenNowFeedData = {
  items: OpenNowFeedItem[];
  nextCursor: string | null;
  limit: number;
};

export type OpenToConnectMe = {
  openToConnect: boolean;
  pausedForRoom: boolean;
  source: "manual" | "post_no_match" | null;
  headline: string | null;
  updatedAt: string | null;
  activityIds: string[];
  moodIds: string[];
  interestIds: string[];
  visibleInDiscovery: boolean;
};
