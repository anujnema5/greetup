/**
 * Canonical room category rows for seed / upsert (= browse “niches”).
 * Keep this short: niches people actually pick, broad enough to cover most spaces.
 * Safe to re-run: `upsertRoomCategories()` merges on `slug` without duplicate rows.
 * `match` and `connection_call` are system-only (hidden from Start a space / browse).
 */
export const ROOM_CATEGORY_SEED = [
  {
    slug: "match",
    displayName: "Match",
    emoji: "🎯",
    description: "System category for 1:1 matchmaking rooms",
    sortOrder: 100,
    isActive: true,
  },
  {
    slug: "connection_call",
    displayName: "Connection call",
    emoji: "📞",
    description: "System category for private 1:1 calls between connections",
    sortOrder: 101,
    isActive: true,
  },
  {
    slug: "tech_builders",
    displayName: "Tech",
    emoji: "💻",
    description: "Code, AI, startups, and building in public",
    sortOrder: 0,
    isActive: true,
  },
  {
    slug: "career_growth",
    displayName: "Career",
    emoji: "📈",
    description: "Jobs, mentorship, and leveling up",
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "language_practice",
    displayName: "Languages",
    emoji: "🗣️",
    description: "Practice speaking with real people",
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "creative",
    displayName: "Creative",
    emoji: "🎨",
    description: "Design, writing, music, and making things",
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: "gaming",
    displayName: "Gaming",
    emoji: "🎮",
    description: "Play together or talk about games",
    sortOrder: 4,
    isActive: true,
  },
  {
    slug: "anime",
    displayName: "Anime",
    emoji: "🎌",
    description: "Shows, movies, and fandom chats",
    sortOrder: 5,
    isActive: true,
  },
  {
    slug: "fitness_wellness",
    displayName: "Fitness",
    emoji: "💪",
    description: "Workouts, habits, and feeling better",
    sortOrder: 6,
    isActive: true,
  },
  {
    slug: "deep_talks",
    displayName: "Deep talks",
    emoji: "💭",
    description: "Meaningful conversations and big questions",
    sortOrder: 7,
    isActive: true,
  },
  {
    slug: "casual_hangouts",
    displayName: "Hangouts",
    emoji: "☕",
    description: "Light chat and easy company",
    sortOrder: 8,
    isActive: true,
  },
] as const;

/**
 * Older / overly-specific niches — deactivated on seed so browse stays short.
 * Existing rooms keep their categoryId; they just stop appearing as pickable niches.
 */
export const RETIRED_ROOM_CATEGORY_SLUGS = [
  "startup_founders",
  "software_engineers",
  "ai_builders",
  "designers",
  "product_managers",
  "remote_workers",
  "students",
  "creators",
  "writers",
  "gamers",
  "anime_lovers",
  "gaming_anime",
  "music",
  "fitness",
  "wellness",
  /** Legacy slug — real system category is `connection_call`. */
  "connection",
] as const;
