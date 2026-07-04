"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

import { useLandingEntryCta } from "../hooks/use-landing-entry-cta";

export function LandingHeroNav() {
  const { kind, navPrimaryHref, navPrimaryLabel, navGreeting } = useLandingEntryCta();
  const showLogin = kind !== "member";

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-1.5 sm:gap-2">
          {navGreeting ? (
            <span className="hidden sm:inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium landing-muted">
              {navGreeting}
            </span>
          ) : showLogin ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-border bg-muted/50 landing-muted hover:bg-muted hover:text-foreground font-medium text-[11px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3"
              asChild
            >
              <Link href="/login">Log in</Link>
            </Button>
          ) : null}
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:brightness-110 shadow-md sm:shadow-lg shadow-primary/25 font-medium sm:font-semibold text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            asChild
          >
            <Link href={navPrimaryHref}>
              {navPrimaryLabel}{" "}
              <ChevronRight className="size-3 sm:size-3.5" />
            </Link>
          </Button>
          <ThemeToggle
            variant="outline"
            className="rounded-full size-8 sm:size-9 shrink-0 border-border bg-muted/50"
          />
        </div>
      </div>
    </nav>
  );
}

export function LandingHeroPrimaryCta() {
  const { heroPrimaryHref, heroPrimaryLabel } = useLandingEntryCta();

  return (
    <div className="flex flex-row flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
      <Button
        size="sm"
        className="rounded-full bg-primary text-primary-foreground hover:brightness-110 font-medium sm:font-semibold px-5 sm:px-6 has-[>svg]:px-5 sm:has-[>svg]:px-6 h-8 sm:h-10 lg:h-11 text-xs sm:text-sm w-auto shadow-[0_4px_18px_-6px_oklch(from_var(--primary)_l_c_h/0.45)] sm:shadow-[0_8px_28px_-8px_oklch(from_var(--primary)_l_c_h/0.55)]"
        asChild
      >
        <Link href={heroPrimaryHref}>
          {heroPrimaryLabel}{" "}
          <ArrowRight className="size-3 sm:size-4" />
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-border bg-muted/50 px-4 sm:px-6 h-8 sm:h-10 lg:h-11 text-xs sm:text-sm font-medium sm:font-semibold w-auto"
        asChild
      >
        <Link href="#how-it-works">How it works</Link>
      </Button>
    </div>
  );
}
