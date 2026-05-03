"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Shared constants ─────────────────────────────────────────────────────────

/** Frosted-glass appearance applied to every toolbar button. */
const GLASS_BUTTON_STYLE = {
  border:         "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(10px)",
};

/**
 * Caption text class used beneath every toolbar icon.
 * Exported so callers (e.g. the overflow "More" button) can match the style.
 */
export const TOOLBAR_CONTROL_CAPTION_CLASS =
  "pointer-events-none w-full max-w-none text-center text-[11px] font-medium " +
  "leading-snug tracking-wide text-white/55";

// ─── Internal layout helpers ──────────────────────────────────────────────────

/** Centres caption text below a button, prevents wrapping. */
function ToolbarCaption({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        TOOLBAR_CONTROL_CAPTION_CLASS,
        "flex w-full items-center justify-center whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Fixed-width column that stacks a button above its caption (wide enough for “Add people”). */
function ToolbarButtonColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-18 min-w-18 shrink-0 flex-col items-center gap-1 sm:w-16 sm:min-w-16">
      {children}
    </div>
  );
}

// ─── MediaControlButton ───────────────────────────────────────────────────────

/**
 * Mic / camera primary toggle button.
 *
 * - Shows `iconOn` when active, `iconOff` when inactive.
 * - Slightly dimmed background when off so the state is obvious at a glance.
 * - Wraps in a caption column when `caption` is provided.
 */
export function MediaControlButton({
  active,
  onClick,
  disabled,
  ariaLabel,
  iconOn,
  iconOff,
  caption,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  iconOn: ReactNode;
  iconOff: ReactNode;
  caption?: string;
}) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "h-11 w-11 shrink-0 rounded-full p-0 transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-white/14 hover:bg-white/22" : "bg-white/8 hover:bg-white/16",
      )}
      style={GLASS_BUTTON_STYLE}
    >
      {active ? iconOn : iconOff}
    </Button>
  );

  if (!caption) return button;

  return (
    <ToolbarButtonColumn>
      {button}
      <ToolbarCaption>{caption}</ToolbarCaption>
    </ToolbarButtonColumn>
  );
}

// ─── CircleToolbarButton ──────────────────────────────────────────────────────

/**
 * Secondary toolbar button — chat, activities, go live, add, next, etc.
 *
 * - Adds a subtle white ring when `isActive` is true (e.g. chat panel is open).
 * - Accepts an optional `className` override for special states (e.g. live red).
 * - Wraps in a caption column when `caption` is provided.
 */
export function CircleToolbarButton({
  onClick,
  ariaLabel,
  children,
  className,
  caption,
  isActive,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  caption?: string;
  isActive?: boolean;
}) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "h-11 w-11 shrink-0 rounded-full p-0 transition-all duration-150",
        isActive
          ? "bg-white/18 ring-1 ring-white/22 hover:bg-white/24"
          : "bg-white/10 hover:bg-white/18",
        className,
      )}
      style={GLASS_BUTTON_STYLE}
    >
      {children}
    </Button>
  );

  if (!caption) return button;

  return (
    <ToolbarButtonColumn>
      {button}
      <ToolbarCaption className={isActive ? "text-white/75" : undefined}>
        {caption}
      </ToolbarCaption>
    </ToolbarButtonColumn>
  );
}
