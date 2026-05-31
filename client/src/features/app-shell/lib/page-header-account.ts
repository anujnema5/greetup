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
