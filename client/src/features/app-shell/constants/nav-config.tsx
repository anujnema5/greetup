import { Home, Search, Users, MessagesSquare, User, type LucideIcon } from "lucide-react";

/** Extend this union and wire counts in `useNavBadgeLookup` when adding sidebar badges. */
export type NavBadgeId = "connectionsPending" | "messagesUnread";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  badgeId?: NavBadgeId;
};

export const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Search, label: "Explore", href: "/explore" },
  { icon: Users, label: "Connections", href: "/connections", badgeId: "connectionsPending" },
  { icon: MessagesSquare, label: "Messages", href: "/messages", badgeId: "messagesUnread" },
  { icon: User, label: "Profile", href: "/profile" },
];
