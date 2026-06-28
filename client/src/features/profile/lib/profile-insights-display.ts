import type { ProfileRecentMatch } from "@/features/profile/types/profile-insights.types";

import { formatProfileHandle } from "@/features/app-shell/lib/page-header-account";

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
  const handle = formatProfileHandle(username);
  if (handle) return handle;

  const tagline = match.tagline?.trim();
  if (tagline && tagline.length <= RECENT_MATCH_TAGLINE_MAX) return tagline;

  return "Met on Greetup";
}

/** Sidebar rows: time only — name is the primary line; skip noisy handles. */
export function recentMatchSidebarLabel(
  match: Pick<ProfileRecentMatch, "username" | "tagline" | "matchedAt">,
): string {
  const when = formatRecentMatchShort(match.matchedAt);
  if (when) return when;

  const handle = formatProfileHandle(match.username);
  if (handle) return handle;

  const tagline = match.tagline?.trim();
  if (tagline && tagline.length <= RECENT_MATCH_TAGLINE_MAX) return tagline;

  return "Recent match";
}

/** Sidebar / home preview: @handle plus when you matched (full history, not connections-only). */
export function recentMatchHistoryLabel(match: Pick<ProfileRecentMatch, "username" | "tagline" | "matchedAt">): string {
  const when = formatRecentMatchDate(match.matchedAt);
  const handle = formatProfileHandle(match.username);
  if (handle && when) return `${handle} · ${when}`;
  if (handle) return handle;
  if (when) return `Matched ${when}`;
  return recentMatchSecondaryLabel(match);
}

/** Compact relative time for dashboard match cards (e.g. "2m ago", "3h ago"). */
export function formatRecentMatchShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatRecentMatchDate(iso);
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
