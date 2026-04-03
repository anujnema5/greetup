/**
 * Canonical circle category rows for seed / upsert.
 * Safe to re-run: `upsertCircleCategories()` merges on `slug` without duplicate rows.
 */
export const CIRCLE_CATEGORY_SEED = [
  {
    slug: "startup_founders",
    displayName: "Startup founders",
    emoji: "🚀",
    description: "Founders, builders, and early-stage teams",
    sortOrder: 0,
    isActive: true,
  },
  {
    slug: "software_engineers",
    displayName: "Software engineers",
    emoji: "💻",
    description: "Code, systems, and shipping",
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "anime_lovers",
    displayName: "Anime lovers",
    emoji: "🎌",
    description: "Series, films, and fandom",
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "designers",
    displayName: "Designers",
    emoji: "✨",
    description: "UI, UX, and visual craft",
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: "remote_workers",
    displayName: "Remote workers",
    emoji: "🌍",
    description: "WFH, async, and travel",
    sortOrder: 4,
    isActive: true,
  },
] as const;
