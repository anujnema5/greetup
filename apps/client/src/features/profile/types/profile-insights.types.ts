export type ProfileInsightsStats = {
  matchCount: number;
  connectionCount: number;
  circleCount: number;
  profileCompletion: number | null;
};

export type ProfileRecentMatch = {
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

export type ProfileInsightsData = {
  stats: ProfileInsightsStats;
  recentMatches: ProfileRecentMatch[];
};
