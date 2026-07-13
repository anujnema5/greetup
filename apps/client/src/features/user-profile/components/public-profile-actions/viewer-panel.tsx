"use client";

import Link from "next/link";
import { Link2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicProfileViewerPanelProps = {
  onCopyLink: () => void;
  className?: string;
};

export function PublicProfileViewerPanel({ onCopyLink, className }: PublicProfileViewerPanelProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Button asChild className="h-11 flex-1 rounded-xl font-semibold">
          <Link href="/profile">
            <Pencil className="size-4" aria-hidden />
            Edit profile
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl font-semibold"
          onClick={onCopyLink}
        >
          <Link2 className="size-4" aria-hidden />
          Share
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        This is how your profile looks to others.
      </p>
    </div>
  );
}
