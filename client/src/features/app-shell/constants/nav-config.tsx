import { Home, Search, Users, MessagesSquare, User, type LucideIcon } from "lucide-react";

import { APP_ROUTES } from "@/lib/routing/app-routes";

/** Extend this union and wire counts in `useNavBadgeLookup` when adding sidebar badges. */
export type NavBadgeId = "connectionsPending" | "messagesUnread";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  badgeId?: NavBadgeId;
};

export const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: APP_ROUTES.home },
  { icon: Search, label: "Explore", href: APP_ROUTES.explore },
  { icon: Users, label: "Connections", href: APP_ROUTES.connections, badgeId: "connectionsPending" },
  { icon: MessagesSquare, label: "Messages", href: APP_ROUTES.messages, badgeId: "messagesUnread" },
  { icon: User, label: "Profile", href: APP_ROUTES.profile },
];
