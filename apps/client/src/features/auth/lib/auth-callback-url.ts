import { CURRENT_HOST } from "@/shared/constants";

/** Where new / returning-but-incomplete users land after sign-in. */
export const POST_AUTH_PATH = "/profile-setup";

/** Query key carrying the post-login return path (Instagram-style `?next=`). */
export const NEXT_PARAM = "next";

/** Where logged-in users land when they open `/` or hit `/login` with no `next`. */
export const DEFAULT_AUTHED_PATH = "/home";

/**
 * Only accept internal, absolute same-origin paths as a post-login target.
 * Rejects external URLs, protocol-relative (`//evil.com`), and backslash tricks
 * so `?next=` can never redirect off-site.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** Build `/login?next=<encoded path>` for redirecting logged-out users to a gated page. */
export function buildLoginUrl(returnPath: string): string {
  const safe = sanitizeNextPath(returnPath);
  if (!safe || safe === "/login") return "/login";
  return `/login?${NEXT_PARAM}=${encodeURIComponent(safe)}`;
}

/** Post-auth redirect URL trusted by Better Auth (must match the tab origin + `WEB_CLIENT_HOST`). */
export function getAuthCallbackUrl(path = POST_AUTH_PATH): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin =
    typeof window !== "undefined" ? window.location.origin : CURRENT_HOST;
  return `${origin.replace(/\/+$/, "")}${normalizedPath}`;
}
