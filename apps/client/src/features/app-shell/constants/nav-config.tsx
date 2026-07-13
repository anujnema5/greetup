import { Home, Compass, Search, Users, Orbit, MessagesSquare, User, type LucideIcon } from "lucide-react";

import { SPACES_BROWSE_PATH } from "@/features/spaces/lib/spaces-browse-path";

/** Extend this union and wire counts in `useNavBadgeLookup` when adding sidebar badges. */
export type NavBadgeId = "connectionsPending" | "messagesUnread";

export type NavItemAction = "search";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  action?: NavItemAction;
  badgeId?: NavBadgeId;
  /** Omit from mobile bottom bar (still shown in desktop sidebar). */
  hideOnBottomNav?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Compass, label: "Explore", href: "/explore" },
  { icon: Search, label: "Search", action: "search", hideOnBottomNav: true },
  { icon: Orbit, label: "Spaces", href: SPACES_BROWSE_PATH, hideOnBottomNav: true },
  { icon: Users, label: "Connections", href: "/connections", badgeId: "connectionsPending" },
  { icon: MessagesSquare, label: "Messages", href: "/messages", badgeId: "messagesUnread" },
  { icon: User, label: "Profile", href: "/profile" },
];

/** Mobile bottom bar — Spaces stays in desktop sidebar only. */
export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.hideOnBottomNav);
