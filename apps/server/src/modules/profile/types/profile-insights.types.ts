export type ProfileInsightsStats = {
  matchCount: number;
  connectionCount: number;
  spaceCount: number;
  profileCompletion: number | null;
};

export type ProfileRecentMatchItem = {
  peerUserId: string;
  displayName: string;
  tagline: string | null;
  initials: string;
  image: string | null;
  username: string | null;
  matchScore: number | null;
  matchedAt: string;
  isConnected: boolean;
};

export type ProfileInsightsResponse = {
  stats: ProfileInsightsStats;
  recentMatches: ProfileRecentMatchItem[];
};
