"use client";

import { memo } from "react";
import { LogOut, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProfilePeerAvatar } from "@/lib/ui/profile-peer-avatar";

import { usePageHeaderAccount } from "../../hooks/use-page-header-account";

type PageHeaderAccountMenuProps = {
  align?: "start" | "center" | "end";
  className?: string;
};

function PageHeaderAccountMenuInner({ align = "end", className }: PageHeaderAccountMenuProps) {
  const account = usePageHeaderAccount();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open account menu"
          className={cn("shrink-0 overflow-hidden rounded-xl p-0", className)}
        >
          <ProfilePeerAvatar
            image={account.avatarImage}
            label={account.displayName || "My Account"}
            seed={account.avatarSeed}
            className="size-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={8} className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground">
            {account.displayName || "My Account"}
          </p>
          {account.accountSubtitle ? (
            <p className="truncate text-xs font-normal text-muted-foreground">
              {account.accountSubtitle}
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={account.onGoToProfile}>
          <User className="text-current" />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={account.onGoToSettings}>
          <Settings className="text-current" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          variant="destructive"
          disabled={account.isSigningOut}
          onClick={() => void account.onLogout()}
        >
          <LogOut className="text-current" />
          {account.isSigningOut ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const PageHeaderAccountMenu = memo(PageHeaderAccountMenuInner);
