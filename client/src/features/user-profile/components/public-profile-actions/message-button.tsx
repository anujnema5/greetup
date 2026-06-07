"use client";

import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicProfileMessageButtonProps = {
  onClick: () => void;
  isOpeningChat?: boolean;
  className?: string;
  showLabel?: boolean;
};

export function PublicProfileMessageButton({
  onClick,
  isOpeningChat = false,
  className,
  showLabel = true,
}: PublicProfileMessageButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-11 shrink-0 rounded-xl font-semibold",
        showLabel ? "gap-1.5 px-4" : "w-11 px-0",
        className,
      )}
      disabled={isOpeningChat}
      onClick={onClick}
    >
      {isOpeningChat ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <MessageCircle className="size-4" aria-hidden />
      )}
      {showLabel ? (isOpeningChat ? "Opening…" : "Message") : null}
    </Button>
  );
}
