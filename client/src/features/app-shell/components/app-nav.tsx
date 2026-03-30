"use client";

import Link from "next/link";
import { Home, Search, Users, Clock, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "../constants/nav-config";

export function NavSidebar({ activePath = "/" }: { activePath?: string }) {
  return (
    <aside className="hidden md:flex flex-col items-center gap-1 w-16 min-h-screen border-r border-border bg-card py-5 px-2">
      <Link href="/" className="mb-6 h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
        <span className="text-sm font-black text-primary-foreground">C</span>
      </Link>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = href === "/" ? activePath === "/" : activePath.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              title={label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {active && (
                <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-r-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="#"
        title="Settings"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
      >
        <Settings size={18} strokeWidth={1.8} />
      </Link>
    </aside>
  );
}

export function BottomNav({ activePath = "/" }: { activePath?: string }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm py-2">
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const active = href === "/" ? activePath === "/" : activePath.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
