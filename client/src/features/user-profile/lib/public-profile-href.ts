/** Public profile route for a username slug. */
export function publicProfileHref(username: string | null | undefined): string | null {
  const slug = username?.trim();
  return slug ? `/u/${encodeURIComponent(slug)}` : null;
}
