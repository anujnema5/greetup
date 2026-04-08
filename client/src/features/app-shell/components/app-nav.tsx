"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGetPendingIncomingConnectionCountQuery } from "@/features/connections/api/connections-api";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "../constants/nav-config";

function PendingIncomingBadge({ count }: { count: number }) {
  if (count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="absolute right-0 top-0 z-10 inline-flex min-h-[15px] min-w-[15px] translate-x-[45%] -translate-y-[42%] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-none text-primary-foreground"
      aria-hidden
    >
      {label}
    </span>
  );
}

export function NavSidebar({ activePath = "/" }: { activePath?: string }) {
  const { data: pendingIncomingData } = useGetPendingIncomingConnectionCountQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const pendingIncomingCount = pendingIncomingData?.data?.pendingIncomingCount ?? 0;

  return (
    <aside className="hidden md:flex flex-col items-center gap-1 w-16 min-h-screen border-r border-border bg-card py-5 px-2">
      <Link href="/" className="mb-6 h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
        <span className="text-sm font-black text-primary-foreground">C</span>
      </Link>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = href === "/" ? activePath === "/" : activePath.startsWith(href);
          const isConnections = href === "/connections";
          const linkTitle =
            isConnections && pendingIncomingCount > 0
              ? `${label} (${pendingIncomingCount} pending)`
              : label;
          return (
            <Link
              key={label}
              href={href}
              title={linkTitle}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="relative inline-flex">
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {isConnections ? <PendingIncomingBadge count={pendingIncomingCount} /> : null}
              </span>
              {active && (
                <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-r-full bg-primary" />
              )}
            </Link>
          );
        })}
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

export function BottomNav({ activePath = "/" }: { activePath?: string }) {
  const { data: pendingIncomingData } = useGetPendingIncomingConnectionCountQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const pendingIncomingCount = pendingIncomingData?.data?.pendingIncomingCount ?? 0;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center justify-around gap-0.5 py-2 pr-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = href === "/" ? activePath === "/" : activePath.startsWith(href);
          const isConnections = href === "/connections";
          const linkTitle =
            isConnections && pendingIncomingCount > 0
              ? `${label} (${pendingIncomingCount} pending)`
              : label;
          return (
            <Link
              key={label}
              href={href}
              title={linkTitle}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative inline-flex">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {isConnections ? <PendingIncomingBadge count={pendingIncomingCount} /> : null}
              </span>
              <span className="truncate text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
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
