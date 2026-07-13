import { publicProfileHref } from "./public-profile-href";

/** Absolute share URL when running in the browser; relative path on the server. */
export function publicProfileShareUrl(username: string): string {
  const path = publicProfileHref(username);
  if (!path) return "";
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
