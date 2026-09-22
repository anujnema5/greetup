"use client";

import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { whatsappShareHref, xShareHref } from "../lib/landing-share";

type LandingShareLinksProps = {
  className?: string;
  size?: "sm" | "default";
};

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 6.045L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LandingShareLinks({ className, size = "default" }: LandingShareLinksProps) {
  const compact = size === "sm";

  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        className={cn(
          "rounded-full border-border bg-muted/50 font-medium",
          compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        )}
        asChild
      >
        <a href={whatsappShareHref()} target="_blank" rel="noopener noreferrer">
          <WhatsAppGlyph className={compact ? "size-3.5" : "size-4"} />
          WhatsApp
        </a>
      </Button>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        className={cn(
          "rounded-full border-border bg-muted/50 font-medium",
          compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        )}
        asChild
      >
        <a href={xShareHref()} target="_blank" rel="noopener noreferrer">
          <XGlyph className={compact ? "size-3.5" : "size-4"} />
          Share on X
        </a>
      </Button>
      <span className="inline-flex items-center gap-1.5 text-xs landing-muted px-1">
        <Share2 className={compact ? "size-3" : "size-3.5"} />
        Pass the link
      </span>
    </div>
  );
}
