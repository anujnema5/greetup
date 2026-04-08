"use client";

import { memo, useEffect, useState } from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardHeaderInner() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = session?.user?.name?.trim() ?? "";
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const g = timeGreeting();

  const headline = mounted && firstName ? `${g}, ${firstName}` : g;
  const avatarSrc = getProfileImageUrl(mounted ? (session?.user?.image ?? null) : null);
  const email = session?.user?.email?.trim() ?? "";

  const handleGoToProfile = () => {
    router.push("/profile");
  };

  const handleGoToSettings = () => {
    router.push("/settings");
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground leading-none">{headline}</h1>
        <p className="text-[11px] text-muted-foreground mt-1">Your vibe space is ready</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="h-9 w-9 overflow-hidden rounded-xl bg-muted/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="truncate text-sm font-medium text-foreground">{displayName || "My Account"}</p>
              {email ? <p className="truncate text-xs font-normal text-muted-foreground">{email}</p> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleGoToProfile}>
              <User className="text-current" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleGoToSettings}>
              <Settings className="text-current" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              variant="destructive"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              <LogOut className="text-current" />
              {isSigningOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export const DashboardHeader = memo(DashboardHeaderInner);
