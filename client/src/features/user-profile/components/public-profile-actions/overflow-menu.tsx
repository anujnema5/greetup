"use client";

import {
  Link2,
  MoreHorizontal,
  ShieldBan,
  UserMinus,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PublicProfileOverflowMenuProps = {
  onCopyLink: () => void;
  onBlock: () => void;
  onRemoveConnection?: () => void;
  onWithdrawRequest?: () => void;
  /** Row actions (Connect/Message bar) vs compact inline (status banners). */
  tone?: "row" | "inline";
};

export function PublicProfileOverflowMenu({
  onCopyLink,
  onRemoveConnection,
  onWithdrawRequest,
  onBlock,
  tone = "inline",
}: PublicProfileOverflowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "shrink-0",
            tone === "row" ? "size-10 shrink-0 rounded-xl" : "size-9 rounded-lg",
          )}
          aria-label="More options"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        <DropdownMenuItem onClick={onCopyLink}>
          <Link2 className="size-4" aria-hidden />
          Copy profile link
        </DropdownMenuItem>

        {onRemoveConnection ? (
          <DropdownMenuItem variant="destructive" onClick={onRemoveConnection}>
            <UserMinus className="size-4" aria-hidden />
            Remove connection
          </DropdownMenuItem>
        ) : null}

        {onWithdrawRequest ? (
          <DropdownMenuItem onClick={onWithdrawRequest}>
            <XCircle className="size-4" aria-hidden />
            Withdraw request
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onBlock}>
          <ShieldBan className="size-4" aria-hidden />
          Block user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
