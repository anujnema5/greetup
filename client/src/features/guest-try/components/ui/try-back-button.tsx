"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import type { TryBackTarget } from "../../types/guest-try.types";

export type { TryBackTarget };

type TryBackButtonProps = {
  back: TryBackTarget;
  className?: string;
  /** ghost = compact wizard action; outline = secondary button; link = subtle footer link */
  appearance?: "ghost" | "outline" | "link";
  fullWidth?: boolean;
  label?: string;
};

function resolveLabel(back: TryBackTarget, label?: string): string {
  if (label) return label;
  if ("href" in back && back.href === "/") return GUEST_TRIAL_NAV.goBackHome;
  return GUEST_TRIAL_NAV.goBack;
}

export function TryBackButton({
  back,
  className,
  appearance = "outline",
  fullWidth = false,
  label,
}: TryBackButtonProps) {
  const text = resolveLabel(back, label);

  const content = (
    <>
      <ChevronLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      {text}
    </>
  );

  if (appearance === "link") {
    const linkClass = cn(
      "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/42",
      fullWidth && "w-full",
      className,
    );

    if ("href" in back) {
      return (
        <Link href={back.href} className={linkClass}>
          {content}
        </Link>
      );
    }

    return (
      <button type="button" onClick={back.onClick} className={linkClass}>
        {content}
      </button>
    );
  }

  const buttonClass = cn(
    appearance === "outline" &&
      "border-white/10 bg-white/2 text-white/62 shadow-none hover:border-white/10 hover:bg-white/2 hover:text-white/62",
    appearance === "ghost" && "text-white/55 hover:bg-transparent hover:text-white/55",
    fullWidth ? "w-full" : "w-full sm:w-auto",
    className,
  );

  if ("href" in back) {
    return (
      <Button asChild variant={appearance} size="default" className={buttonClass}>
        <Link href={back.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={appearance}
      size="default"
      className={buttonClass}
      onClick={back.onClick}
    >
      {content}
    </Button>
  );
}
