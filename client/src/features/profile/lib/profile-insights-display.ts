const PROFILE_AVATAR_GRADIENTS = [
  "from-violet-400 to-indigo-600",
  "from-pink-400 to-rose-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
] as const;

export function profileAvatarGradientClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % PROFILE_AVATAR_GRADIENTS.length;
  }
  return PROFILE_AVATAR_GRADIENTS[hash] ?? PROFILE_AVATAR_GRADIENTS[0];
}

const RECENT_MATCH_TAGLINE_MAX = 40;

/** Short, consistent secondary line for match list rows (avoid long bios). */
export function recentMatchSecondaryLabel(match: {
  username: string | null;
  tagline: string | null;
}): string {
  const username = match.username?.trim();
  if (username) return `@${username}`;

  const tagline = match.tagline?.trim();
  if (tagline && tagline.length <= RECENT_MATCH_TAGLINE_MAX) return tagline;

  return "Met on Greetup";
}

export function formatRecentMatchDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
