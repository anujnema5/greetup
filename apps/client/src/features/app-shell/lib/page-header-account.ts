import type { PageHeaderSessionUser } from "../types/page-header-account.types";

export function resolvePageHeaderDisplayName(
  profileDisplayName: string,
  sessionUser: PageHeaderSessionUser | undefined,
): string {
  return (
    profileDisplayName ||
    sessionUser?.displayName?.trim() ||
    sessionUser?.name?.trim() ||
    ""
  );
}

export function resolvePageHeaderAccountSubtitle(sessionUser: PageHeaderSessionUser | undefined): string {
  const rawEmail = sessionUser?.email?.trim() ?? "";
  const email = rawEmail.endsWith("@firebase.greetup.local") ? "" : rawEmail;
  const phone = sessionUser?.phoneNumber?.trim() ?? "";
  return email || phone;
}

/** Hide auto-generated hex / internal usernames from profile UI. */
export function isDisplayableUsername(username: string): boolean {
  const value = username.trim();
  if (!value) return false;
  if (value.length >= 20 && /^[a-f0-9]+$/i.test(value)) return false;
  return true;
}

export function formatProfileHandle(username: string | null | undefined): string | null {
  const value = username?.trim();
  if (!value || !isDisplayableUsername(value)) return null;
  return `@${value}`;
}
