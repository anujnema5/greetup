"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  CALL_TOOLBAR_CAPTION_CLASS,
  CALL_TOOLBAR_CIRCLE_ACTIVE_CLASS,
  CALL_TOOLBAR_CIRCLE_IDLE_CLASS,
  CALL_TOOLBAR_GLASS_ACTIVE_CLASS,
  CALL_TOOLBAR_GLASS_BORDER_CLASS,
  CALL_TOOLBAR_GLASS_IDLE_CLASS,
} from "@/features/room/constants/call/call-chrome-theme";
import { cn } from "@/lib/utils";

/** Caption text class used beneath every toolbar icon. */
export const TOOLBAR_CONTROL_CAPTION_CLASS = CALL_TOOLBAR_CAPTION_CLASS;

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

function ToolbarButtonColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-1">
      {children}
    </div>
  );
}

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
        active ? CALL_TOOLBAR_GLASS_ACTIVE_CLASS : CALL_TOOLBAR_GLASS_IDLE_CLASS,
        CALL_TOOLBAR_GLASS_BORDER_CLASS,
      )}
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

export function CircleToolbarButton({
  onClick,
  ariaLabel,
  children,
  className,
  caption,
  isActive,
  badgeCount,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  caption?: string;
  isActive?: boolean;
  /** Unread / notification count shown on the circle control. */
  badgeCount?: number;
}) {
  const badgeLabel =
    typeof badgeCount === "number" && badgeCount > 0
      ? badgeCount > 9
        ? "9+"
        : String(badgeCount)
      : null;

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={badgeLabel ? `${ariaLabel}, ${badgeCount} unread` : ariaLabel}
      title={ariaLabel}
      className={cn(
        "relative h-11 w-11 shrink-0 rounded-full p-0 transition-all duration-150",
        isActive ? CALL_TOOLBAR_CIRCLE_ACTIVE_CLASS : CALL_TOOLBAR_CIRCLE_IDLE_CLASS,
        CALL_TOOLBAR_GLASS_BORDER_CLASS,
        className,
      )}
    >
      {children}
      {badgeLabel ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
          {badgeLabel}
        </span>
      ) : null}
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
