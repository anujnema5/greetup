export const VIBES = ["design", "startups", "indie music", "ai & ml", "travel", "coffee"] as const;

/** Mock dashboard stats; labels/values are strings so completion % can replace a row. */
export type ProfileStatRow = { label: string; value: string };

export const STATS: ProfileStatRow[] = [
  { label: "Matches", value: "47" },
  { label: "Connections", value: "128" },
  { label: "Circles", value: "12" },
  { label: "Vibe Score", value: "87" },
];

export const RECENT_MATCHES = [
  { name: "Zara K.", tagline: "Product designer · Startup founder", initials: "ZK", grad: "from-violet-400 to-indigo-600", score: 94 },
  { name: "Mia C.", tagline: "UI designer · Music lover", initials: "MC", grad: "from-pink-400 to-rose-600", score: 91 },
  { name: "Rohan V.", tagline: "Full-stack dev · Founder", initials: "RV", grad: "from-sky-400 to-blue-600", score: 88 },
] as const;

export const ACTIVITY = [
  { action: "Matched with Zara K.", time: "2h ago" },
  { action: "Joined Tech & Startups circle", time: "5h ago" },
  { action: "New connection: Mia C.", time: "1d ago" },
] as const;
