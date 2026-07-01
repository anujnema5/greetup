/** Active session activities — mirrors `SESSION_ACTIVITY_SEED` (allowInMatchPrep). */
export const LANDING_SESSION_ACTIVITIES = [
  { emoji: "💨", label: "Vent" },
  { emoji: "🗯️", label: "Yap" },
  { emoji: "📚", label: "Study together" },
  { emoji: "🗣️", label: "Practice language" },
  { emoji: "🚀", label: "Discuss & validate startup ideas" },
  { emoji: "🫂", label: "Talk through anxiety" },
  { emoji: "💙", label: "Feeling low" },
  { emoji: "🎬", label: "Movies, sports & books" },
  { emoji: "💡", label: "Discuss a topic" },
] as const;

/** Short labels for hero / compact rows. */
export const LANDING_HERO_ACTIVITY_HIGHLIGHTS = [
  { emoji: "💨", label: "Vent" },
  { emoji: "🗯️", label: "Yap" },
  { emoji: "📚", label: "Study" },
  { emoji: "🗣️", label: "Practice language" },
  { emoji: "🚀", label: "Startup ideas" },
  { emoji: "🎬", label: "Movies & sports" },
] as const;
