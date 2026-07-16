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
  // Synthetic emails for phone-only accounts are internal — never show them.
  // `@firebase.greetup.local` = legacy Firebase users; `@phone.greetup.local` = SNS OTP users.
  const isSyntheticPhoneEmail =
    rawEmail.endsWith("@firebase.greetup.local") || rawEmail.endsWith("@phone.greetup.local");
  const email = isSyntheticPhoneEmail ? "" : rawEmail;
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
