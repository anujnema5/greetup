"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { TOUR_TARGETS } from "@/features/tour-guide";

import { useNavBadgeLookup } from "../hooks/use-nav-badges";
import { NAV_ITEMS } from "../constants/nav-config";
import { NavItemLink } from "./nav-item-link";

export function NavSidebar({ activePath = "/home" }: { activePath?: string }) {
  const badgeLookup = useNavBadgeLookup();

  return (
    <aside className="hidden md:flex flex-col items-center gap-1 w-16 min-h-screen border-r border-border bg-card py-5 px-2">
      <Link href="/home" className="mb-6 h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/5">
        <span className="text-sm font-black text-primary-foreground">C</span>
      </Link>

      <nav
        className="flex flex-col items-center gap-1 flex-1"
        data-tour-id={TOUR_TARGETS.mainNav}
      >
        {NAV_ITEMS.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            activePath={activePath}
            badgeLookup={badgeLookup}
            variant="sidebar"
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle
          variant="ghost"
          size="icon-lg"
          align="center"
          className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        />
        <Link
          href="/settings"
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <Settings size={18} strokeWidth={1.8} />
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav({ activePath = "/home" }: { activePath?: string }) {
  const badgeLookup = useNavBadgeLookup();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch border-t border-border bg-card/95 backdrop-blur-sm"
      data-tour-id={TOUR_TARGETS.mainNav}
    >
      <div className="flex min-w-0 flex-1 items-center justify-around gap-0.5 py-2 pr-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            activePath={activePath}
            badgeLookup={badgeLookup}
            variant="bottom"
          />
        ))}
      </div>
      <div className="flex shrink-0 items-center border-l border-border px-1.5">
        <ThemeToggle
          variant="ghost"
          size="icon"
          align="end"
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
        />
      </div>
    </nav>
  );
}
