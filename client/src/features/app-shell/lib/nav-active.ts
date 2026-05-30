/** True when `activePath` matches this nav item (home is exact; others use prefix). */
export function isNavItemActive(href: string, activePath: string): boolean {
  return href === '/home' ? activePath === '/home' : activePath.startsWith(href);
}

export function navLinkTitle(label: string, titleSuffix?: string): string {
  return titleSuffix ? `${label} (${titleSuffix})` : label;
}
