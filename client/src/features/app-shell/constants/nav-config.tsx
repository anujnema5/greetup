import { Home, Search, Users, Clock, User, type LucideIcon } from "lucide-react";

export type NavItem = { icon: LucideIcon; label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Explore", href: "/explore" },
  { icon: Users, label: "Connections", href: "/connections" },
  { icon: Clock, label: "History", href: "#" },
  { icon: User, label: "Profile", href: "/profile" },
];
