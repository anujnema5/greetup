import { APP_ROUTES } from "@/lib/routing/app-routes";

/** True when `activePath` matches this nav item (home is exact; others use prefix). */
export function isNavItemActive(href: string, activePath: string): boolean {
  return href === APP_ROUTES.home
    ? activePath === APP_ROUTES.home
    : activePath.startsWith(href);
}

export function navLinkTitle(label: string, titleSuffix?: string): string {
  return titleSuffix ? `${label} (${titleSuffix})` : label;
}
